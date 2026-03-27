import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import timedelta, date
from dotenv import load_dotenv

# Load Dastan root .env.local
load_dotenv(dotenv_path="../.env.local")

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    print("CRITICAL: DATABASE_URL not found in .env.local")
    exit(1)

# Normalize SQLAlchemy dialect prefix if present
if DB_URL.startswith("postgresql+psycopg2://"):
    DB_URL = DB_URL.replace("postgresql+psycopg2://", "postgresql://", 1)

def get_connection():
    return psycopg2.connect(DB_URL)

def init_db():
    """Bootstrap schema additions needed by the scheduler (idempotent)."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Backwards-compatible transaction columns
                cur.execute("""
                    ALTER TABLE transactions
                    ADD COLUMN IF NOT EXISTS trans_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    ADD COLUMN IF NOT EXISTS reference_id UUID,
                    ADD COLUMN IF NOT EXISTS linked_transaction_id INT
                        REFERENCES transactions(trans_id) ON DELETE SET NULL;
                """)

                # Add business_id to account_summary if missing
                cur.execute("""
                    ALTER TABLE account_summary
                    ADD COLUMN IF NOT EXISTS business_id UUID
                        REFERENCES businesses(business_id) ON DELETE CASCADE;
                """)

                # Per-business scheduler_config
                cur.execute("""
                CREATE TABLE IF NOT EXISTS scheduler_config (
                    id          SERIAL PRIMARY KEY,
                    business_id UUID UNIQUE REFERENCES businesses(business_id) ON DELETE CASCADE,
                    from_date   DATE NOT NULL,
                    to_date     DATE NOT NULL,
                    last_run    TIMESTAMP WITH TIME ZONE
                );
                """)

                # Seed a config row for every business that doesn't have one yet
                cur.execute("""
                    INSERT INTO scheduler_config (business_id, from_date, to_date)
                    SELECT b.business_id,
                           COALESCE((SELECT MIN(trans_date) FROM transactions t
                                     WHERE t.business_id = b.business_id),
                                    CURRENT_DATE - INTERVAL '30 days'),
                           CURRENT_DATE
                    FROM businesses b
                    WHERE NOT EXISTS (
                        SELECT 1 FROM scheduler_config sc
                        WHERE sc.business_id = b.business_id
                    );
                """)

                # Backfill business_id on account_summary rows that lack it
                cur.execute("""
                    UPDATE account_summary asm
                    SET business_id = a.business_id
                    FROM accounts a
                    WHERE asm.account_srno = a.srno
                      AND asm.business_id IS NULL
                      AND a.business_id IS NOT NULL;
                """)

                # account_summary unique constraint should be per (account_srno, summary_date, business_id)
                # Add business_id to unique constraint if not already done
                cur.execute("""
                    DO $$ BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'account_summary_account_srno_summary_date_key'
                              AND contype = 'u'
                        ) THEN NULL; END IF;
                    END $$;
                """)

                conn.commit()
                print("Database extensions explicitly booted (multi-tenant ETL mode).")
    except Exception as e:
        print(f"Migration error: {e}")


def run_job():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Waking up to process Account Snapshots...")
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:

                # Fetch ALL business scheduler configs
                cur.execute("""
                    SELECT sc.id, sc.business_id, sc.from_date, sc.to_date, b.name as business_name
                    FROM scheduler_config sc
                    JOIN businesses b ON sc.business_id = b.business_id
                    ORDER BY sc.business_id
                """)
                configs = cur.fetchall()

                if not configs:
                    print("No business configurations found. Sleeping.")
                    return

                today = date.today()

                for config in configs:
                    config_id     = config['id']
                    business_id   = config['business_id']
                    business_name = config['business_name']
                    from_date     = config['from_date']
                    to_date       = config['to_date']

                    # Cap at today - 1 (ETL only processes completed days)
                    end_date = to_date
                    if end_date >= today:
                        end_date = today - timedelta(days=1)

                    if from_date > end_date:
                        print(f"  [{business_name}] All dates up to {end_date} fully processed.")
                        continue

                    print(f"  [{business_name}] Processing {from_date} → {end_date}...")

                    curr_date = from_date
                    while curr_date <= end_date:
                        # Aggregate daily transactions for this business on this day
                        cur.execute("""
                            SELECT
                                account_srno,
                                currency_code,
                                SUM(CASE
                                    WHEN transaction_type IN (
                                        'BookingIncome', 'BookingDailyCharge',
                                        'WithdrawalCredit',
                                        'BookingCancellation', 'BookingPendingReversal'
                                    ) THEN amount ELSE 0
                                END) as daily_income,
                                SUM(CASE
                                    WHEN transaction_type IN ('Expense', 'WithdrawalDebit')
                                    THEN ABS(amount) ELSE 0
                                END) as daily_expense
                            FROM transactions
                            WHERE trans_date = %s
                              AND business_id = %s
                            GROUP BY account_srno, currency_code
                        """, [curr_date, business_id])

                        daily_stats = cur.fetchall()

                        for stat in daily_stats:
                            acc_srno  = stat['account_srno']
                            curr_code = stat['currency_code']
                            d_inc     = stat['daily_income'] or 0
                            d_exp     = stat['daily_expense'] or 0
                            d_prof    = d_inc - d_exp

                            # Running end-of-day balance for this account (business-scoped)
                            cur.execute("""
                                SELECT COALESCE(SUM(amount), 0) as running_balance
                                FROM transactions
                                WHERE account_srno = %s
                                  AND business_id  = %s
                                  AND trans_date  <= %s
                            """, [acc_srno, business_id, curr_date])

                            run_bal_row    = cur.fetchone()
                            running_balance = run_bal_row['running_balance'] if run_bal_row else 0

                            # Upsert snapshot — scoped to (account_srno, summary_date)
                            cur.execute("""
                                INSERT INTO account_summary
                                    (account_srno, currency_code, summary_date,
                                     daily_income, daily_expense, daily_profit,
                                     end_of_day_balance, business_id)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (account_srno, summary_date) DO UPDATE SET
                                    daily_income      = EXCLUDED.daily_income,
                                    daily_expense     = EXCLUDED.daily_expense,
                                    daily_profit      = EXCLUDED.daily_profit,
                                    end_of_day_balance = EXCLUDED.end_of_day_balance,
                                    business_id       = EXCLUDED.business_id
                            """, [acc_srno, curr_code, curr_date, d_inc, d_exp, d_prof,
                                  running_balance, business_id])

                        curr_date += timedelta(days=1)

                    # Advance this business's from_date tracker
                    new_from_date = end_date + timedelta(days=1)
                    cur.execute("""
                        UPDATE scheduler_config
                        SET from_date = %s, to_date = CURRENT_DATE, last_run = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, [new_from_date, config_id])
                    print(f"  [{business_name}] Done. Next batch starts from: {new_from_date}")

                conn.commit()
                print("All business pipelines completed.")

    except Exception as e:
        print(f"Job Critical Error: {e}")


if __name__ == "__main__":
    print("=== Starting Dastan Master Analytics Scheduler (Multi-Tenant Mode) ===")
    init_db()

    # Run immediately on boot
    run_job()
    sleep_time = 10
    # Poll every 10 minutes
    while True:
        print(f"Application is on sleep for {sleep_time} seconds")
        time.sleep(sleep_time)
        run_job()

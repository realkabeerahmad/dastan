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

# Ensure psycopg2 parses the URI correctly if it contains SQLAlchemy driver dialects
if DB_URL.startswith("postgresql+psycopg2://"):
    DB_URL = DB_URL.replace("postgresql+psycopg2://", "postgresql://", 1)

def get_connection():
    return psycopg2.connect(DB_URL)

def init_db():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1. Backwards compatible transactions patching
                cur.execute("""
                    ALTER TABLE transactions 
                    ADD COLUMN IF NOT EXISTS trans_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    ADD COLUMN IF NOT EXISTS reference_id UUID,
                    ADD COLUMN IF NOT EXISTS linked_transaction_id INT REFERENCES transactions(transaction_id) ON DELETE SET NULL;
                """)
                cur.execute("""
                CREATE TABLE IF NOT EXISTS scheduler_config (
                    id SERIAL PRIMARY KEY,
                    from_date DATE NOT NULL,
                    to_date DATE NOT NULL,
                    last_run TIMESTAMP WITH TIME ZONE
                );
                """)
                cur.execute("""
                INSERT INTO scheduler_config (id, from_date, to_date) 
                VALUES (1, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE) 
                ON CONFLICT (id) DO NOTHING;
                """)
                cur.execute("""
                CREATE TABLE IF NOT EXISTS account_summary (
                    summary_id SERIAL PRIMARY KEY,
                    account_srno INT REFERENCES accounts(srno) ON DELETE CASCADE,
                    currency_code VARCHAR(10) NOT NULL,
                    summary_date DATE NOT NULL,
                    daily_income NUMERIC DEFAULT 0,
                    daily_expense NUMERIC DEFAULT 0,
                    daily_profit NUMERIC DEFAULT 0,
                    end_of_day_balance NUMERIC DEFAULT 0,
                    UNIQUE(account_srno, summary_date)
                );
                """)
                conn.commit()
                print("Database extensions explicitly booted.")
    except Exception as e:
        print(f"Migration error: {e}")

def run_job():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Waking up to process Account Snapshots...")
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # 1. Read config bounds
                cur.execute("SELECT from_date, to_date FROM scheduler_config WHERE id = 1")
                config = cur.fetchone()
                if not config:
                    print("No configuration found. Sleeping.")
                    return

                from_date = config['from_date']
                to_date = config['to_date']
                today = date.today()

                # Rule constraints: execute till today - 1 maximum
                end_date = to_date
                if end_date >= today:
                    end_date = today - timedelta(days=1)

                if from_date > end_date:
                    print(f"All dates up to {end_date} are fully processed. Waiting for tomorrow pipeline.")
                    return

                print(f"Processing transactions sequentially from {from_date} to {end_date}...")

                # Chunk day by day
                curr_date = from_date
                while curr_date <= end_date:
                    print(f" -> Crunching Analytics for {curr_date}...")
                    
                    # Compute aggregations for THIS specific day natively in SQL
                    cur.execute("""
                        SELECT 
                            account_srno,
                            currency_code,
                            SUM(CASE WHEN transaction_type IN ('BookingIncome', 'WithdrawalCredit', 'BookingCancellation', 'BookingPendingReversal') THEN amount ELSE 0 END) as daily_income,
                            SUM(CASE WHEN transaction_type IN ('Expense', 'WithdrawalDebit') THEN ABS(amount) ELSE 0 END) as daily_expense
                        FROM transactions
                        WHERE trans_date = %s
                        GROUP BY account_srno, currency_code
                    """, [curr_date])
                    
                    daily_stats = cur.fetchall()

                    for stat in daily_stats:
                        acc_srno = stat['account_srno']
                        curr_code = stat['currency_code']
                        d_inc = stat['daily_income'] or 0
                        d_exp = stat['daily_expense'] or 0
                        d_prof = d_inc - d_exp

                        # Compute Running End-Of-Day balance (all-time mathematically)
                        cur.execute("""
                            SELECT SUM(amount) as running_balance
                            FROM transactions
                            WHERE account_srno = %s AND trans_date <= %s
                        """, [acc_srno, curr_date])
                        
                        run_bal_row = cur.fetchone()
                        running_balance = run_bal_row['running_balance'] if run_bal_row and run_bal_row['running_balance'] else 0

                        # Upsert Snapshot natively
                        cur.execute("""
                            INSERT INTO account_summary (account_srno, currency_code, summary_date, daily_income, daily_expense, daily_profit, end_of_day_balance)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (account_srno, summary_date) DO UPDATE SET
                                daily_income = EXCLUDED.daily_income,
                                daily_expense = EXCLUDED.daily_expense,
                                daily_profit = EXCLUDED.daily_profit,
                                end_of_day_balance = EXCLUDED.end_of_day_balance
                        """, [acc_srno, curr_code, curr_date, d_inc, d_exp, d_prof, running_balance])

                    curr_date += timedelta(days=1)

                # Commit changes and advance the from_date tracker explicitly
                new_from_date = end_date + timedelta(days=1)
                cur.execute("UPDATE scheduler_config SET from_date = %s, last_run = CURRENT_TIMESTAMP WHERE id = 1", [new_from_date])
                conn.commit()
                print(f"Pipeline Batch completed. Next evaluation bounds will start specifically from: {new_from_date}")

    except Exception as e:
        print(f"Job Critical Error: {e}")

if __name__ == "__main__":
    print(f"=== Starting Dastan Master Analytics Scheduler ===")
    init_db()
    
    # Run pipeline immediately on boot
    run_job()
    
    # Enter sleep loop natively checking bounds every 10 minutes
    while True:
        time.sleep(600)
        run_job()

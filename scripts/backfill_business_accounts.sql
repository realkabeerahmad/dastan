-- Backfill migration: provision Main accounts for businesses that registered
-- before the auto-creation was added to registerBusiness.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

-- 1. Add business_id to account_summary if not already done
ALTER TABLE account_summary ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;

-- 2. Daily rate / nights on bookings (needed for per-day billing)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS daily_rate  NUMERIC(12,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_nights INT;

-- 3. Seed USD + PKR Main accounts for every existing business that doesn't have them
INSERT INTO accounts (currency_code, account_type, business_id)
SELECT 'USD', 'Main', b.business_id
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.business_id = b.business_id AND a.account_type = 'Main' AND a.currency_code = 'USD'
);

INSERT INTO accounts (currency_code, account_type, business_id)
SELECT 'PKR', 'Main', b.business_id
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.business_id = b.business_id AND a.account_type = 'Main' AND a.currency_code = 'PKR'
);

-- 4. Backfill business_id on accounts that belong to a business via their properties
UPDATE accounts a
SET business_id = p.business_id
FROM properties p
WHERE a.property_id = p.property_id
  AND a.business_id IS NULL;

-- 5. Backfill business_id on transactions using the booking reference
UPDATE transactions t
SET business_id = b.business_id
FROM bookings b
WHERE t.reference_id = b.booking_id
  AND t.business_id IS NULL;

-- 6. Backfill account_summary.business_id from accounts
UPDATE account_summary asm
SET business_id = a.business_id
FROM accounts a
WHERE asm.account_srno = a.srno
  AND asm.business_id IS NULL
  AND a.business_id IS NOT NULL;

-- 7. Seed per-business scheduler_config rows (ETL will auto-pick these up on next boot)
INSERT INTO scheduler_config (business_id, from_date, to_date)
SELECT b.business_id,
       COALESCE((SELECT MIN(trans_date) FROM transactions t WHERE t.business_id = b.business_id),
                CURRENT_DATE - INTERVAL '30 days'),
       CURRENT_DATE
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM scheduler_config sc WHERE sc.business_id = b.business_id
)
ON CONFLICT DO NOTHING;

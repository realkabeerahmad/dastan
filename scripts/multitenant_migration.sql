-- ─── Multi-Tenant Schema Additions ──────────────────────────────────────────
-- Run this ONCE after applying to the existing schema.
-- Safe: only adds new tables and nullable columns (no data loss).

-- 1. Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  business_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- 3. Add business_id FK to all data tables (nullable — existing rows are null until seeded)
ALTER TABLE properties       ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;
ALTER TABLE accounts         ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;
ALTER TABLE customers        ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;
ALTER TABLE bookings         ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;
ALTER TABLE transactions     ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;
ALTER TABLE account_summary  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;
ALTER TABLE scheduler_config ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_properties_business   ON properties(business_id);
CREATE INDEX IF NOT EXISTS idx_accounts_business     ON accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business    ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business     ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_accsummary_business   ON account_summary(business_id);
CREATE INDEX IF NOT EXISTS idx_users_business        ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);

-- 5. Booking segments — supports multi-segment, non-contiguous stays
--    Days are counted INCLUSIVE: days = (end_date - start_date) + 1
--    A single-day stay has start_date = end_date.
CREATE TABLE IF NOT EXISTS booking_segments (
  segment_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,           -- inclusive checkout day
  business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_booking_segments_booking ON booking_segments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_segments_business ON booking_segments(business_id);

-- 6. Add daily_rate column to bookings for reference
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_nights INT;


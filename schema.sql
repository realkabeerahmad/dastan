-- ─── DROP ALL TABLES (dependency-safe order) ─────────────────────────────────

-- Leaf tables first (no other tables reference them)
DROP TABLE IF EXISTS account_summary CASCADE;
DROP TABLE IF EXISTS scheduler_config CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;

-- Accounts references itself (self-ref via primary_account_srno), drop after its dependents
DROP TABLE IF EXISTS accounts CASCADE;

-- Customer standalone (bookings already dropped)
DROP TABLE IF EXISTS customers CASCADE;

-- Properties depends on property_types and property_statuses
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS property_types CASCADE;
DROP TABLE IF EXISTS property_statuses CASCADE;

-- Currencies depends on countries
DROP TABLE IF EXISTS currencies CASCADE;

-- Cities and states depend on countries
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS states CASCADE;

-- Countries last (everything else references it)
DROP TABLE IF EXISTS countries CASCADE;

-- ─── DROP EXTENSION (optional, only if nothing else uses it) ─────────────────
-- DROP EXTENSION IF EXISTS "uuid-ossp";


-- ─── FRESH SCHEMA ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Reference Data
CREATE TABLE countries (
  srno SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE states (
  srno SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state_code VARCHAR(10) NOT NULL,
  country_srno INT REFERENCES countries(srno) ON DELETE SET NULL
);

CREATE TABLE cities (
  srno SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state_srno INT REFERENCES states(srno) ON DELETE SET NULL,
  country_srno INT REFERENCES countries(srno) ON DELETE SET NULL
);

CREATE TABLE currencies (
  srno SERIAL PRIMARY KEY,
  country_srno INT REFERENCES countries(srno) ON DELETE SET NULL,
  currency_code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL
);

-- 2. Property Definition Tables
CREATE TABLE property_types (
  property_type_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_type_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE property_statuses (
  property_status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_status_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true
);

-- 3. Main Entities
CREATE TABLE properties (
  property_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_name VARCHAR(255) NOT NULL,
  property_address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  property_type UUID REFERENCES property_types(property_type_id) ON DELETE SET NULL,
  property_status UUID REFERENCES property_statuses(property_status_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Accounts (self-referencing, so create without the self-ref first, then add it)
CREATE TABLE accounts (
  srno SERIAL PRIMARY KEY,
  currency_code VARCHAR(10) REFERENCES currencies(currency_code) ON DELETE RESTRICT,
  account_type VARCHAR(50) NOT NULL,
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
  primary_account_srno INT REFERENCES accounts(srno) ON DELETE SET NULL,  -- self-ref OK after table exists
  income NUMERIC(15, 2) DEFAULT 0,
  expense NUMERIC(15, 2) DEFAULT 0,
  profit NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Transactions (fixed: linked_transaction_id references trans_id, not transaction_id)
CREATE TABLE transactions (
  trans_id SERIAL PRIMARY KEY,
  currency_code VARCHAR(10) REFERENCES currencies(currency_code) ON DELETE RESTRICT,
  account_srno INT REFERENCES accounts(srno) ON DELETE CASCADE,
  primary_account_srno INT REFERENCES accounts(srno) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  remarks TEXT,
  reference_id UUID,
  linked_transaction_id INT REFERENCES transactions(trans_id) ON DELETE SET NULL, -- ← FIXED (was transaction_id)
  trans_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Analytics Scheduler
CREATE TABLE scheduler_config (
  id SERIAL PRIMARY KEY,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE
);

CREATE TABLE account_summary (
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

-- 7. Customers & Bookings
CREATE TABLE customers (
  customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  identification_number VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(customer_id) ON DELETE RESTRICT,
  currency_code VARCHAR(10) REFERENCES currencies(currency_code) ON DELETE RESTRICT,
  amount NUMERIC(15, 2) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  booking_status VARCHAR(50),
  platform VARCHAR(100) DEFAULT 'Offline',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_segments (
  segment_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,           -- exclusive (checkout day, same as Airbnb)
  business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_booking_segments_booking ON booking_segments(booking_id);

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

INSERT INTO currencies (currency_code, name) VALUES
  ('USD', 'US Dollar'),
  ('PKR', 'Pakistani Rupee')
ON CONFLICT (currency_code) DO NOTHING;

INSERT INTO property_types (property_type_name) VALUES
  ('Apartment'), ('Home'), ('Villa'), ('Studio')
ON CONFLICT DO NOTHING;

INSERT INTO property_statuses (property_status_name) VALUES
  ('Under-renovation'), ('Listed'), ('Un-listed'), ('Under-process')
ON CONFLICT DO NOTHING;

-- Main primary accounts per currency
INSERT INTO accounts (currency_code, account_type)
SELECT 'USD', 'Main'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE currency_code = 'USD' AND account_type = 'Main');

INSERT INTO accounts (currency_code, account_type)
SELECT 'PKR', 'Main'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE currency_code = 'PKR' AND account_type = 'Main');
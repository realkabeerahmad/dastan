-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Reference Data: Countries, States, Cities
CREATE TABLE IF NOT EXISTS countries (
  srno SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS states (
  srno SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state_code VARCHAR(10) NOT NULL,
  country_srno INT REFERENCES countries(srno) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cities (
  srno SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state_srno INT REFERENCES states(srno) ON DELETE SET NULL,
  country_srno INT REFERENCES countries(srno) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS currencies (
  srno SERIAL PRIMARY KEY,
  country_srno INT REFERENCES countries(srno) ON DELETE SET NULL,
  currency_code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL
);

-- 2. Property Definition Tables
CREATE TABLE IF NOT EXISTS property_types (
  property_type_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_type_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS property_statuses (
  property_status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_status_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true
);

-- 3. Main Entities
CREATE TABLE IF NOT EXISTS properties (
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

-- Phase 7: Analytics Scheduler Additions --

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

CREATE TABLE IF NOT EXISTS accounts (
  srno SERIAL PRIMARY KEY,
  currency_code VARCHAR(10) REFERENCES currencies(currency_code) ON DELETE RESTRICT,
  account_type VARCHAR(50) NOT NULL,
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
  primary_account_srno INT REFERENCES accounts(srno) ON DELETE SET NULL,
  income NUMERIC(15, 2) DEFAULT 0,
  expense NUMERIC(15, 2) DEFAULT 0,
  profit NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  trans_id SERIAL PRIMARY KEY,
  currency_code VARCHAR(10) REFERENCES currencies(currency_code) ON DELETE RESTRICT,
  account_srno INT REFERENCES accounts(srno) ON DELETE CASCADE,
  primary_account_srno INT REFERENCES accounts(srno) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  remarks TEXT,
  reference_id UUID,
  linked_transaction_id INT REFERENCES transactions(transaction_id) ON DELETE SET NULL,
  trans_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bookings & Customers
CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  identification_number VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
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

-- Safely add platform to already existing bookings table if needed
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform VARCHAR(100) DEFAULT 'Offline';

-- Insert starting required data: Currencies
INSERT INTO currencies (currency_code, name) VALUES ('USD', 'US Dollar') ON CONFLICT (currency_code) DO NOTHING;
INSERT INTO currencies (currency_code, name) VALUES ('PKR', 'Pakistani Rupee') ON CONFLICT (currency_code) DO NOTHING;

-- Insert some dummy property types and statuses for testing if they don't exist
INSERT INTO property_types (property_type_name) VALUES ('Apartment'), ('Home'), ('Villa'), ('Studio') ON CONFLICT DO NOTHING;
INSERT INTO property_statuses (property_status_name) VALUES ('Under-renovation'), ('Listed'), ('Un-listed'), ('Under-process') ON CONFLICT DO NOTHING;

-- Create Main Primary Accounts for each Currency (if they don't exist)
INSERT INTO accounts (currency_code, account_type) 
SELECT 'USD', 'Main' 
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE currency_code = 'USD' AND account_type = 'Main');

INSERT INTO accounts (currency_code, account_type) 
SELECT 'PKR', 'Main' 
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE currency_code = 'PKR' AND account_type = 'Main');

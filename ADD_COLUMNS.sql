-- Add missing columns to service_requests table
-- Run this in Supabase SQL Editor

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS service_key TEXT,
ADD COLUMN IF NOT EXISTS service_name TEXT,
ADD COLUMN IF NOT EXISTS revenue NUMERIC,
ADD COLUMN IF NOT EXISTS cost NUMERIC,
ADD COLUMN IF NOT EXISTS profit NUMERIC;

-- Verify columns were added
-- SELECT * FROM service_requests LIMIT 1;

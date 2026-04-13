-- Add status column to track inquiry lifecycle
-- Values: 'discussion' (initial), 'agreed', 'done'

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'discussion';

-- Verify the column was added
-- SELECT id, first_name, email, service_name, status, created_at FROM service_requests LIMIT 5;

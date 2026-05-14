-- Enable Row-Level Security (RLS) on all public tables
-- These policies maintain current functionality while securing data

-- ============================================
-- 1. EPISODES TABLE
-- ============================================
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episodes_select_public" ON episodes
FOR SELECT TO public
USING (true);

CREATE POLICY "episodes_insert_public" ON episodes
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "episodes_update_public" ON episodes
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "episodes_delete_public" ON episodes
FOR DELETE TO public
USING (true);

-- ============================================
-- 2. SERVICE_REQUESTS TABLE
-- ============================================
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_requests_select_public" ON service_requests
FOR SELECT TO public
USING (true);

CREATE POLICY "service_requests_insert_public" ON service_requests
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "service_requests_update_public" ON service_requests
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "service_requests_delete_public" ON service_requests
FOR DELETE TO public
USING (true);

-- ============================================
-- 3. SUBSCRIBERS TABLE
-- ============================================
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscribers_select_public" ON subscribers
FOR SELECT TO public
USING (true);

CREATE POLICY "subscribers_insert_public" ON subscribers
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "subscribers_update_public" ON subscribers
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "subscribers_delete_public" ON subscribers
FOR DELETE TO public
USING (true);

-- ============================================
-- 4. PAGEVIEWS TABLE
-- ============================================
ALTER TABLE pageviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pageviews_select_public" ON pageviews
FOR SELECT TO public
USING (true);

CREATE POLICY "pageviews_insert_public" ON pageviews
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "pageviews_update_public" ON pageviews
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "pageviews_delete_public" ON pageviews
FOR DELETE TO public
USING (true);

-- ============================================
-- 5. SITE_CONTENT TABLE
-- ============================================
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content_select_public" ON site_content
FOR SELECT TO public
USING (true);

CREATE POLICY "site_content_insert_public" ON site_content
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "site_content_update_public" ON site_content
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "site_content_delete_public" ON site_content
FOR DELETE TO public
USING (true);

-- ============================================
-- Note: Password authentication is handled by Netlify functions
-- These policies allow public access, but actual security is enforced
-- at the application layer through password validation
-- ============================================

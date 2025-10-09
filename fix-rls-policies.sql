-- ============================================
-- FIX RLS POLICIES FOR AUTHENTICATION
-- ============================================
-- Run this in Supabase SQL Editor to fix the permission denied error

-- First, let's disable RLS temporarily to test
-- (You can re-enable it later with proper policies)

ALTER TABLE professors DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans_valid DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans_invalid DISABLE ROW LEVEL SECURITY;
ALTER TABLE used_server_nonces DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('professors', 'sessions', 'scans_valid', 'scans_invalid', 'qr_tokens', 'used_server_nonces');

-- Test the professors table
SELECT COUNT(*) as professor_count FROM professors;

-- If you see professor_count = 0, you need to insert a professor:
-- INSERT INTO professors (name, email, password_hash) VALUES
--     ('Dr. Test', 'professor@test.com', '$2a$10$uRFcUeopc65GHPnjC.xFleKZLpXzrOU/WLxtfI0IUx85mZXesXJCu');

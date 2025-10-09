-- ============================================
-- FIX SCHEMA PERMISSIONS FOR SERVICE ROLE
-- ============================================
-- This fixes "permission denied for schema public" errors
-- Run this in Supabase SQL Editor

-- 1. Grant all permissions on the public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- 2. Grant permissions on all tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- 4. Specifically grant on our tables
GRANT ALL ON TABLE professors TO service_role;
GRANT ALL ON TABLE sessions TO service_role;
GRANT ALL ON TABLE scans_valid TO service_role;
GRANT ALL ON TABLE scans_invalid TO service_role;
GRANT ALL ON TABLE qr_tokens TO service_role;
GRANT ALL ON TABLE used_server_nonces TO service_role;

-- 5. Verify permissions
SELECT
    schemaname,
    tablename,
    has_table_privilege('service_role', schemaname || '.' || tablename, 'SELECT') as can_select,
    has_table_privilege('service_role', schemaname || '.' || tablename, 'INSERT') as can_insert,
    has_table_privilege('service_role', schemaname || '.' || tablename, 'UPDATE') as can_update,
    has_table_privilege('service_role', schemaname || '.' || tablename, 'DELETE') as can_delete
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('professors', 'sessions', 'scans_valid', 'scans_invalid', 'qr_tokens', 'used_server_nonces')
ORDER BY tablename;

-- 6. Test query (should return count or rows)
SELECT COUNT(*) as professor_count FROM professors;

-- If count is 0, insert a test professor:
-- INSERT INTO professors (name, email, password_hash) VALUES
--     ('Dr. Test', 'professor@test.com', '$2a$10$uRFcUeopc65GHPnjC.xFleKZLpXzrOU/WLxtfI0IUx85mZXesXJCu');

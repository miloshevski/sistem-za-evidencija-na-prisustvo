-- ============================================
-- UPDATE PROFESSOR PASSWORD
-- ============================================
-- This script updates the professor password to: password123
-- Run this in Supabase SQL Editor if login is not working

-- Option 1: Update existing professor by email
UPDATE professors
SET password_hash = '$2a$10$uRFcUeopc65GHPnjC.xFleKZLpXzrOU/WLxtfI0IUx85mZXesXJCu'
WHERE email = 'professor@test.com';

-- Option 2: If you don't have any professors yet, insert a new one
-- DELETE THIS LINE AND THE ONE BELOW IF YOU ALREADY HAVE A PROFESSOR
-- INSERT INTO professors (name, email, password_hash) VALUES
--     ('Dr. Test Professor', 'professor@test.com', '$2a$10$uRFcUeopc65GHPnjC.xFleKZLpXzrOU/WLxtfI0IUx85mZXesXJCu');

-- After running this, you can login with:
-- Email: professor@test.com
-- Password: password123

-- Verify the update worked:
SELECT id, name, email, created_at FROM professors WHERE email = 'professor@test.com';

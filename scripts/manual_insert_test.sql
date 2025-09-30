-- ============================================
-- Manual Insert Test
-- Run this in Supabase SQL Editor
-- ============================================

-- First, get your current user ID
SELECT auth.uid() as my_user_id;

-- Try to manually insert a group (replace the UUID with your user ID from above)
INSERT INTO groups (name, description, created_by)
VALUES ('Test Group', 'Manual test', '6b27177f-a171-4450-96bf-b2d4ab5a4705')
RETURNING *;

-- If that works, check the groups table
SELECT * FROM groups;

-- Clean up the test
-- DELETE FROM groups WHERE name = 'Test Group';
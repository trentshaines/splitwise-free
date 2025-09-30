-- ============================================
-- Fix Table Permissions for Groups
-- Run this in Supabase SQL Editor
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON groups TO authenticated;
GRANT ALL ON group_members TO authenticated;
GRANT ALL ON group_invites TO authenticated;

-- Grant usage on sequences (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role (for good measure)
GRANT ALL ON groups TO service_role;
GRANT ALL ON group_members TO service_role;
GRANT ALL ON group_invites TO service_role;

-- Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Verify permissions
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('groups', 'group_members', 'group_invites')
AND grantee IN ('authenticated', 'service_role')
ORDER BY table_name, grantee;
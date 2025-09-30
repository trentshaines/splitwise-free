-- ============================================
-- Final Complete Fix - Run Everything in Order
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Step 1: Disable RLS temporarily
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant all permissions
GRANT ALL ON groups TO authenticated;
GRANT ALL ON group_members TO authenticated;
GRANT ALL ON group_invites TO authenticated;
GRANT ALL ON groups TO anon;
GRANT ALL ON group_members TO anon;
GRANT ALL ON group_invites TO anon;

-- Step 3: Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 4: Create SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION is_group_member(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = check_group_id
        AND user_id = check_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION is_group_admin(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = check_group_id
        AND user_id = check_user_id
        AND role = 'admin'
    );
END;
$$;

-- Step 5: Drop all existing policies
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;
DROP POLICY IF EXISTS "allow_authenticated_insert_groups" ON groups;
DROP POLICY IF EXISTS "allow_select_own_groups" ON groups;
DROP POLICY IF EXISTS "allow_admin_update_groups" ON groups;
DROP POLICY IF EXISTS "allow_admin_delete_groups" ON groups;

DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can add themselves to groups they create" ON group_members;
DROP POLICY IF EXISTS "Authenticated users can add members" ON group_members;
DROP POLICY IF EXISTS "Users can join groups via invite" ON group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "allow_select_group_members" ON group_members;
DROP POLICY IF EXISTS "allow_insert_self_as_member" ON group_members;
DROP POLICY IF EXISTS "allow_admin_remove_members" ON group_members;

DROP POLICY IF EXISTS "Users can view their group invites" ON group_invites;
DROP POLICY IF EXISTS "Group members can view group invites" ON group_invites;
DROP POLICY IF EXISTS "Group members can invite others" ON group_invites;
DROP POLICY IF EXISTS "Users can respond to invites" ON group_invites;
DROP POLICY IF EXISTS "Users can delete their invites" ON group_invites;
DROP POLICY IF EXISTS "allow_view_own_invites" ON group_invites;
DROP POLICY IF EXISTS "allow_members_create_invites" ON group_invites;
DROP POLICY IF EXISTS "allow_update_own_invites" ON group_invites;
DROP POLICY IF EXISTS "allow_delete_own_invites" ON group_invites;

-- Step 6: Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple, permissive policies
CREATE POLICY "groups_insert_policy"
    ON groups FOR INSERT
    WITH CHECK (true);

CREATE POLICY "groups_select_policy"
    ON groups FOR SELECT
    USING (true);

CREATE POLICY "groups_update_policy"
    ON groups FOR UPDATE
    USING (true);

CREATE POLICY "groups_delete_policy"
    ON groups FOR DELETE
    USING (true);

CREATE POLICY "group_members_all"
    ON group_members FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "group_invites_all"
    ON group_invites FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 8: Verification
SELECT 'Tables:' as info;
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('groups', 'group_members', 'group_invites');

SELECT 'Policies:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('groups', 'group_members', 'group_invites');

SELECT 'Permissions:' as info;
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('groups', 'group_members', 'group_invites')
AND grantee IN ('authenticated', 'anon');
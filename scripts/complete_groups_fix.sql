-- ============================================
-- Complete Groups Fix - All in One
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Step 1: Create SECURITY DEFINER functions
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

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;

DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can add themselves to groups they create" ON group_members;
DROP POLICY IF EXISTS "Authenticated users can add members" ON group_members;
DROP POLICY IF EXISTS "Users can join groups via invite" ON group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

DROP POLICY IF EXISTS "Users can view their group invites" ON group_invites;
DROP POLICY IF EXISTS "Group members can view group invites" ON group_invites;
DROP POLICY IF EXISTS "Group members can invite others" ON group_invites;
DROP POLICY IF EXISTS "Users can respond to invites" ON group_invites;
DROP POLICY IF EXISTS "Users can delete their invites" ON group_invites;

-- Step 3: Create simple, working policies for GROUPS table
CREATE POLICY "allow_authenticated_insert_groups"
    ON groups FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "allow_select_own_groups"
    ON groups FOR SELECT
    TO authenticated
    USING (is_group_member(id, auth.uid()));

CREATE POLICY "allow_admin_update_groups"
    ON groups FOR UPDATE
    TO authenticated
    USING (is_group_admin(id, auth.uid()));

CREATE POLICY "allow_admin_delete_groups"
    ON groups FOR DELETE
    TO authenticated
    USING (is_group_admin(id, auth.uid()));

-- Step 4: Create simple policies for GROUP_MEMBERS table
CREATE POLICY "allow_select_group_members"
    ON group_members FOR SELECT
    TO authenticated
    USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "allow_insert_self_as_member"
    ON group_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "allow_admin_remove_members"
    ON group_members FOR DELETE
    TO authenticated
    USING (is_group_admin(group_id, auth.uid()) OR user_id = auth.uid());

-- Step 5: Create policies for GROUP_INVITES table
CREATE POLICY "allow_view_own_invites"
    ON group_invites FOR SELECT
    TO authenticated
    USING (invitee_id = auth.uid() OR is_group_member(group_id, auth.uid()));

CREATE POLICY "allow_members_create_invites"
    ON group_invites FOR INSERT
    TO authenticated
    WITH CHECK (inviter_id = auth.uid() AND is_group_member(group_id, auth.uid()));

CREATE POLICY "allow_update_own_invites"
    ON group_invites FOR UPDATE
    TO authenticated
    USING (invitee_id = auth.uid());

CREATE POLICY "allow_delete_own_invites"
    ON group_invites FOR DELETE
    TO authenticated
    USING (invitee_id = auth.uid());

-- Step 6: Verification
SELECT 'Functions created:' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_group_member', 'is_group_admin');

SELECT 'Policies on groups:' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'groups';

SELECT 'Policies on group_members:' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'group_members';

SELECT 'Policies on group_invites:' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'group_invites';
-- ============================================
-- Fix Groups RLS Infinite Recursion
-- Run this in Supabase SQL Editor AFTER create_groups_tables.sql
-- ============================================

-- Create a SECURITY DEFINER function to check group membership
-- This bypasses RLS to prevent infinite recursion
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

-- Create a SECURITY DEFINER function to check if user is group admin
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

-- ============================================
-- Replace RLS Policies with SECURITY DEFINER functions
-- ============================================

-- Groups: Authenticated users can create groups
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
CREATE POLICY "Authenticated users can create groups"
    ON groups FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Groups: Users can view groups they are members of (using function)
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
CREATE POLICY "Users can view their groups"
    ON groups FOR SELECT
    USING (is_group_member(id, auth.uid()));

-- Groups: Group admins can update groups (using function)
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
CREATE POLICY "Group admins can update groups"
    ON groups FOR UPDATE
    USING (is_group_admin(id, auth.uid()));

-- Groups: Group admins can delete groups (using function)
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;
CREATE POLICY "Group admins can delete groups"
    ON groups FOR DELETE
    USING (is_group_admin(id, auth.uid()));

-- Group Members: Users can view members of groups they belong to (using function)
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
CREATE POLICY "Users can view group members"
    ON group_members FOR SELECT
    USING (is_group_member(group_id, auth.uid()));

-- Group Members: Group admins can remove members (using function)
DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
CREATE POLICY "Group admins can remove members"
    ON group_members FOR DELETE
    USING (is_group_admin(group_id, auth.uid()));

-- Group Invites: Group members can view invites for their groups (using function)
DROP POLICY IF EXISTS "Group members can view group invites" ON group_invites;
CREATE POLICY "Group members can view group invites"
    ON group_invites FOR SELECT
    USING (is_group_member(group_id, auth.uid()));

-- Group Invites: Group members can create invites (using function)
DROP POLICY IF EXISTS "Group members can invite others" ON group_invites;
CREATE POLICY "Group members can invite others"
    ON group_invites FOR INSERT
    WITH CHECK (
        inviter_id = auth.uid() AND
        is_group_member(group_id, auth.uid())
    );

-- ============================================
-- Verification
-- ============================================

-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_group_member', 'is_group_admin')
ORDER BY routine_name;

-- Check updated policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('groups', 'group_members', 'group_invites')
ORDER BY tablename, cmd, policyname;
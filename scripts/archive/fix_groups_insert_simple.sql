-- ============================================
-- Simple Fix for Groups INSERT Policy
-- Run this in Supabase SQL Editor
-- ============================================

-- First, let's check what policies currently exist
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'groups'
ORDER BY cmd, policyname;

-- Drop ALL existing policies on groups table
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;

-- Recreate the INSERT policy (most important)
CREATE POLICY "Authenticated users can create groups"
    ON groups FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by = auth.uid()
    );

-- Recreate other policies using SECURITY DEFINER functions
CREATE POLICY "Users can view their groups"
    ON groups FOR SELECT
    USING (is_group_member(id, auth.uid()));

CREATE POLICY "Group admins can update groups"
    ON groups FOR UPDATE
    USING (is_group_admin(id, auth.uid()));

CREATE POLICY "Group admins can delete groups"
    ON groups FOR DELETE
    USING (is_group_admin(id, auth.uid()));

-- Verify the policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'groups'
ORDER BY cmd, policyname;
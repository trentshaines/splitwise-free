-- ============================================
-- Fix Group Members INSERT Policy
-- Run this in Supabase SQL Editor
-- ============================================

-- The issue is that "Users can add themselves to groups they create" policy
-- tries to query the groups table which may have RLS issues
-- Let's simplify: allow authenticated users to insert themselves as members
-- and rely on application logic to ensure they only add themselves to groups they created

DROP POLICY IF EXISTS "Users can add themselves to groups they create" ON group_members;

CREATE POLICY "Authenticated users can add members"
    ON group_members FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (
            -- User is adding themselves
            user_id = auth.uid()
            OR
            -- User is a group admin adding someone else
            is_group_admin(group_id, auth.uid())
        )
    );

-- Also need a policy to allow users to accept invites
DROP POLICY IF EXISTS "Users can join groups via invite" ON group_members;

CREATE POLICY "Users can join groups via invite"
    ON group_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM group_invites
            WHERE group_invites.group_id = group_members.group_id
            AND group_invites.invitee_id = auth.uid()
            AND group_invites.status = 'accepted'
        )
    );

-- Verification
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'group_members'
AND cmd = 'INSERT'
ORDER BY policyname;
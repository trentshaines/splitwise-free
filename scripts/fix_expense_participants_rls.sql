-- ============================================
-- Fix Expense Participants RLS Policy
-- Run this in Supabase SQL Editor
-- ============================================

-- Check current policies
SELECT 'Current policies on expense_participants:' as info;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'expense_participants';

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Users can insert expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Authenticated users can insert participants" ON expense_participants;

-- Allow viewing participants for expenses you're part of
CREATE POLICY "Users can view expense participants"
    ON expense_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM expense_participants ep
            WHERE ep.expense_id = expense_participants.expense_id
            AND ep.user_id = auth.uid()
        )
    );

-- Allow inserting participants when creating/editing expenses
CREATE POLICY "Authenticated users can insert participants"
    ON expense_participants FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow deleting participants (for editing expenses)
DROP POLICY IF EXISTS "Authenticated users can delete participants" ON expense_participants;
CREATE POLICY "Authenticated users can delete participants"
    ON expense_participants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM expense_participants ep
            WHERE ep.expense_id = expense_participants.expense_id
            AND ep.user_id = auth.uid()
        )
    );

-- Verify
SELECT 'New policies on expense_participants:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'expense_participants'
ORDER BY cmd, policyname;
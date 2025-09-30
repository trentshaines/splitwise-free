-- ============================================
-- Complete Fix for Expense RLS - No Recursion
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop all policies that depend on is_expense_participant
DROP POLICY IF EXISTS "Users can view their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses they're involved in" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses they're involved in" ON expenses;
DROP POLICY IF EXISTS "Users can manage participants for their expenses" ON expense_participants;
DROP POLICY IF EXISTS "Users can view expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Users can insert expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Authenticated users can insert participants" ON expense_participants;
DROP POLICY IF EXISTS "Authenticated users can delete participants" ON expense_participants;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS is_expense_participant(UUID, UUID) CASCADE;

-- Step 3: Create SECURITY DEFINER function
CREATE OR REPLACE FUNCTION is_expense_participant(check_expense_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM expense_participants
        WHERE expense_id = check_expense_id
        AND user_id = check_user_id
    );
END;
$$;

-- Step 4: Recreate expense policies
CREATE POLICY "Users can view their expenses"
    ON expenses FOR SELECT
    USING (is_expense_participant(id, auth.uid()));

CREATE POLICY "Users can update expenses they're involved in"
    ON expenses FOR UPDATE
    USING (is_expense_participant(id, auth.uid()));

CREATE POLICY "Users can delete expenses they're involved in"
    ON expenses FOR DELETE
    USING (is_expense_participant(id, auth.uid()));

-- Step 5: Simple permissive policy for expense_participants
CREATE POLICY "allow_all_for_authenticated"
    ON expense_participants FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verify
SELECT 'Policies on expenses:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'expenses';

SELECT 'Policies on expense_participants:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'expense_participants';
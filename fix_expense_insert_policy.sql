-- Fix RLS policy for inserting expenses
-- The issue is that INSERT policy is missing or too restrictive

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON expenses;

-- Create new INSERT policy that allows any authenticated user to create expenses
CREATE POLICY "Authenticated users can create expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Verify other policies exist
-- SELECT policy should already exist from fix_rls_recursion.sql
-- UPDATE and DELETE policies should exist from update_rls_for_edit_delete.sql

-- List all policies to verify
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'expenses'
ORDER BY cmd, policyname;
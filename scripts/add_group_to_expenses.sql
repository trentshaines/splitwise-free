-- ============================================
-- Add Group Support to Expenses
-- This is optional - expenses can exist without a group
-- ============================================

-- Add group_id column to expenses table (nullable)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Create index for faster group expense queries
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);

-- RLS: Users can view expenses in groups they're members of
-- This adds to existing expense policies without replacing them
DROP POLICY IF EXISTS "Users can view group expenses" ON expenses;
CREATE POLICY "Users can view group expenses"
    ON expenses FOR SELECT
    USING (
        group_id IS NULL OR
        is_group_member(group_id, auth.uid())
    );

-- Verification
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'expenses'
AND column_name = 'group_id';

-- Check the policy was created
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'expenses'
AND policyname = 'Users can view group expenses';
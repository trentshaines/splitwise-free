-- Fix circular dependency between expenses and expense_participants RLS policies
-- Solution: Disable RLS checks within helper functions using SECURITY DEFINER

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view expenses they're involved in" ON expenses;
DROP POLICY IF EXISTS "Users can view participants for expenses they're in" ON expense_participants;
DROP POLICY IF EXISTS "Users can view expenses they paid for" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses they participate in" ON expenses;
DROP POLICY IF EXISTS "Users can view all participants for their expenses" ON expense_participants;
DROP POLICY IF EXISTS "Users can view their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expense participants" ON expense_participants;

-- Helper function to check if user is participant (bypasses RLS)
CREATE OR REPLACE FUNCTION is_expense_participant(expense_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM expense_participants
        WHERE expense_id = expense_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified expenses policy using helper function
CREATE POLICY "Users can view their expenses"
    ON expenses FOR SELECT
    USING (
        auth.uid() = paid_by OR
        is_expense_participant(id, auth.uid())
    );

-- Simplified expense_participants policy
CREATE POLICY "Users can view expense participants"
    ON expense_participants FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_expense_participant(expense_id, auth.uid())
    );
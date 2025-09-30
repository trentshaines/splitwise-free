-- Fix the recursive RLS policy for expense_participants

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants for expenses they're in" ON expense_participants;

-- Create a simpler, non-recursive policy
CREATE POLICY "Users can view participants for expenses they're in"
    ON expense_participants FOR SELECT
    USING (
        -- Users can see their own participant records
        user_id = auth.uid() OR
        -- Users can see all participants for expenses they paid for
        EXISTS (
            SELECT 1 FROM expenses
            WHERE expenses.id = expense_participants.expense_id
            AND expenses.paid_by = auth.uid()
        ) OR
        -- Users can see all participants for expenses they are part of
        expense_id IN (
            SELECT expense_id FROM expense_participants
            WHERE user_id = auth.uid()
        )
    );
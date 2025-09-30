-- Update RLS policies to allow all expense participants to edit/delete expenses
-- Not just the person who paid

-- Drop existing update/delete policies for expenses
DROP POLICY IF EXISTS "Users can update expenses they created" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses they created" ON expenses;

-- Create new policies that allow any participant to update/delete
CREATE POLICY "Users can update expenses they're involved in"
    ON expenses FOR UPDATE
    USING (
        auth.uid() = paid_by OR
        is_expense_participant(id, auth.uid())
    );

CREATE POLICY "Users can delete expenses they're involved in"
    ON expenses FOR DELETE
    USING (
        auth.uid() = paid_by OR
        is_expense_participant(id, auth.uid())
    );

-- Also update expense_participants policies for deletion during edits
DROP POLICY IF EXISTS "Users can add participants when creating expense" ON expense_participants;

CREATE POLICY "Users can manage participants for their expenses"
    ON expense_participants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM expenses
            WHERE expenses.id = expense_participants.expense_id
            AND (expenses.paid_by = auth.uid() OR is_expense_participant(expenses.id, auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses
            WHERE expenses.id = expense_participants.expense_id
            AND (expenses.paid_by = auth.uid() OR is_expense_participant(expenses.id, auth.uid()))
        )
    );
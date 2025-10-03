-- Update expenses RLS policy to allow viewing all expenses in groups user is a member of
-- This matches the behavior we implemented in the frontend

DROP POLICY IF EXISTS "Users can view their expenses" ON expenses;

CREATE POLICY "Users can view their expenses"
    ON expenses FOR SELECT
    USING (
        auth.uid() = paid_by OR
        is_expense_participant(id, auth.uid()) OR
        (
            group_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = expenses.group_id
                AND group_members.user_id = auth.uid()
            )
        )
    );

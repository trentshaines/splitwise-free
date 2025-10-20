-- Fix expenses UPDATE RLS policy to allow updating expenses in groups user is a member of
-- This allows group members to edit any expense in their group

DROP POLICY IF EXISTS "Users can update expenses they created" ON expenses;

CREATE POLICY "Users can update expenses they created"
    ON expenses FOR UPDATE
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

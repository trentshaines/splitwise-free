-- Add UPDATE and DELETE policies for settlements

-- Allow users to update settlements they're involved in
DROP POLICY IF EXISTS "Users can update their settlements" ON settlements;
CREATE POLICY "Users can update their settlements"
    ON settlements FOR UPDATE
    USING (
        auth.uid() = from_user OR
        auth.uid() = to_user
    );

-- Allow users to delete settlements they're involved in
DROP POLICY IF EXISTS "Users can delete their settlements" ON settlements;
CREATE POLICY "Users can delete their settlements"
    ON settlements FOR DELETE
    USING (
        auth.uid() = from_user OR
        auth.uid() = to_user
    );

-- Add group_id column to settlements table to support group-level settlements
ALTER TABLE settlements ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Create index for better performance when querying group settlements
CREATE INDEX idx_settlements_group_id ON settlements(group_id);

-- Update RLS policy to allow viewing group settlements
-- Users can view settlements in groups they're members of
DROP POLICY IF EXISTS "Users can view settlements they're involved in" ON settlements;
CREATE POLICY "Users can view settlements they're involved in"
    ON settlements FOR SELECT
    USING (
        auth.uid() = from_user OR
        auth.uid() = to_user OR
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = settlements.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Update insert policy to allow creating group settlements
DROP POLICY IF EXISTS "Users can create settlements they're paying" ON settlements;
CREATE POLICY "Users can create settlements they're paying"
    ON settlements FOR INSERT
    WITH CHECK (
        auth.uid() = from_user AND
        (
            group_id IS NULL OR
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = settlements.group_id
                AND group_members.user_id = auth.uid()
            )
        )
    );

-- ============================================
-- Move All Existing Expenses to 'Europe 2025' Group
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Find or create the 'Europe 2025' group
DO $$
DECLARE
    group_uuid UUID;
    user_uuid UUID;
BEGIN
    -- Get your user ID (replace with your actual user ID)
    -- You can find this by running: SELECT id FROM auth.users WHERE email = 'trentshaines@gmail.com';
    user_uuid := '6b27177f-a171-4450-96bf-b2d4ab5a4705';

    -- Check if group exists
    SELECT id INTO group_uuid
    FROM groups
    WHERE name = 'Europe 2025'
    LIMIT 1;

    -- If group doesn't exist, create it
    IF group_uuid IS NULL THEN
        INSERT INTO groups (name, description, created_by)
        VALUES ('Europe 2025', 'Trip expenses', user_uuid)
        RETURNING id INTO group_uuid;

        -- Add creator as admin member
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (group_uuid, user_uuid, 'admin');

        RAISE NOTICE 'Created new group: Europe 2025 with ID: %', group_uuid;
    ELSE
        RAISE NOTICE 'Using existing group: Europe 2025 with ID: %', group_uuid;
    END IF;

    -- Update all expenses to belong to this group
    UPDATE expenses
    SET group_id = group_uuid
    WHERE group_id IS NULL;

    RAISE NOTICE 'Updated all ungrouped expenses to belong to Europe 2025';
END $$;

-- Verify the changes
SELECT
    'Total expenses in Europe 2025:' as info,
    COUNT(*) as count
FROM expenses
WHERE group_id = (SELECT id FROM groups WHERE name = 'Europe 2025' LIMIT 1);

SELECT
    'Remaining ungrouped expenses:' as info,
    COUNT(*) as count
FROM expenses
WHERE group_id IS NULL;
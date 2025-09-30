-- ============================================
-- Check existing groups and add users
-- Run this in Supabase SQL Editor
-- ============================================

-- First, show all groups
SELECT 'Existing Groups:' as info;
SELECT id, name, description, created_by, created_at
FROM groups
ORDER BY created_at DESC;

-- Show all group members
SELECT 'Current Group Members:' as info;
SELECT
    g.name as group_name,
    p.email,
    p.full_name,
    gm.role
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
ORDER BY g.name, gm.role DESC;

-- Add Timothy and Kelly to the FIRST group (most recent)
DO $$
DECLARE
    group_uuid UUID;
    timothy_uuid UUID;
    kelly_uuid UUID;
BEGIN
    -- Get the most recent group
    SELECT id INTO group_uuid
    FROM groups
    ORDER BY created_at DESC
    LIMIT 1;

    IF group_uuid IS NULL THEN
        RAISE NOTICE 'No groups found';
        RETURN;
    END IF;

    RAISE NOTICE 'Using group ID: %', group_uuid;

    -- Find Timothy
    SELECT id INTO timothy_uuid
    FROM profiles
    WHERE email ILIKE '%timothy%' OR full_name ILIKE '%timothy%'
    LIMIT 1;

    -- Find Kelly
    SELECT id INTO kelly_uuid
    FROM profiles
    WHERE email ILIKE '%kelly%' OR full_name ILIKE '%kelly%'
    LIMIT 1;

    -- Add Timothy
    IF timothy_uuid IS NOT NULL THEN
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (group_uuid, timothy_uuid, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
        RAISE NOTICE 'Added Timothy';
    ELSE
        RAISE NOTICE 'Timothy not found';
    END IF;

    -- Add Kelly
    IF kelly_uuid IS NOT NULL THEN
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (group_uuid, kelly_uuid, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
        RAISE NOTICE 'Added Kelly';
    ELSE
        RAISE NOTICE 'Kelly not found';
    END IF;
END $$;

-- Show final result
SELECT 'Final Group Members:' as info;
SELECT
    g.name as group_name,
    p.email,
    p.full_name,
    gm.role
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
ORDER BY g.name, gm.role DESC;
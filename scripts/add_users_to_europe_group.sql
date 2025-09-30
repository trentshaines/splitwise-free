-- ============================================
-- Add Timothy and Kelly to Europe 2025 Group
-- Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
    group_uuid UUID;
    timothy_uuid UUID;
    kelly_uuid UUID;
BEGIN
    -- Get the Europe 2025 group ID
    SELECT id INTO group_uuid
    FROM groups
    WHERE name = 'Europe 2025'
    LIMIT 1;

    IF group_uuid IS NULL THEN
        RAISE EXCEPTION 'Europe 2025 group not found. Please create it first.';
    END IF;

    -- Find Timothy's user ID (update the email if different)
    SELECT id INTO timothy_uuid
    FROM profiles
    WHERE email ILIKE '%timothy%' OR full_name ILIKE '%timothy%'
    LIMIT 1;

    -- Find Kelly's user ID (update the email if different)
    SELECT id INTO kelly_uuid
    FROM profiles
    WHERE email ILIKE '%kelly%' OR full_name ILIKE '%kelly%'
    LIMIT 1;

    -- Add Timothy as a member (if found)
    IF timothy_uuid IS NOT NULL THEN
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (group_uuid, timothy_uuid, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
        RAISE NOTICE 'Added Timothy to Europe 2025';
    ELSE
        RAISE NOTICE 'Timothy not found';
    END IF;

    -- Add Kelly as a member (if found)
    IF kelly_uuid IS NOT NULL THEN
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (group_uuid, kelly_uuid, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
        RAISE NOTICE 'Added Kelly to Europe 2025';
    ELSE
        RAISE NOTICE 'Kelly not found';
    END IF;
END $$;

-- Verify members of Europe 2025
SELECT
    g.name as group_name,
    p.email,
    p.full_name,
    gm.role
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
WHERE g.name = 'Europe 2025'
ORDER BY gm.role DESC, p.full_name;
-- Debug script to check group members
-- Run this in your Supabase SQL Editor

-- Show all groups
SELECT 'All Groups:' as info;
SELECT id, name, created_by, created_at
FROM groups
ORDER BY created_at DESC;

-- Show all group members
SELECT 'All Group Members:' as info;
SELECT
    gm.group_id,
    g.name as group_name,
    gm.user_id,
    p.email,
    p.full_name,
    gm.role,
    gm.joined_at
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
ORDER BY g.name, gm.joined_at;

-- Show all pending group invites
SELECT 'Pending Group Invites:' as info;
SELECT
    gi.id,
    g.name as group_name,
    inviter.email as inviter_email,
    invitee.email as invitee_email,
    gi.status,
    gi.created_at
FROM group_invites gi
JOIN groups g ON g.id = gi.group_id
JOIN profiles inviter ON inviter.id = gi.inviter_id
JOIN profiles invitee ON invitee.id = gi.invitee_id
WHERE gi.status = 'pending'
ORDER BY gi.created_at DESC;

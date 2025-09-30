-- Add friend request system
-- The friendships table already supports 'pending' and 'accepted' statuses
-- This script just documents the expected behavior

-- Check current friendships structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'friendships'
ORDER BY ordinal_position;

-- The status column should support: 'pending', 'accepted', 'declined'
-- When user A adds user B:
--   1. Insert friendship with status='pending' from A to B
--   2. User B sees the request and can accept/decline
--   3. On accept: create both directions with status='accepted'
--   4. On decline: delete or mark as 'declined'

-- Note: The existing RLS policies should already support this
-- as they check for status='accepted' in loadFriends query
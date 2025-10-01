-- Fix friendship insert policy to allow bidirectional creation
-- This allows users to create friendships where they are either user_id OR friend_id
-- Needed for accepting friend requests (where the accepter creates both directions)

DROP POLICY IF EXISTS "Users can create friendships" ON friendships;

CREATE POLICY "Users can create friendships"
    ON friendships FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        auth.uid() = friend_id
    );

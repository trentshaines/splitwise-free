-- ============================================
-- Create Groups Feature Tables
-- ============================================

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Group members table (users who are part of a group)
CREATE TABLE IF NOT EXISTS group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) DEFAULT 'member' NOT NULL, -- 'admin' or 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Group invitations table (pending invites)
CREATE TABLE IF NOT EXISTS group_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    invitee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, invitee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_invitee_id ON group_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON group_invites(status);

-- Enable Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for Groups
-- ============================================

-- Groups: Users can view groups they are members of
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
CREATE POLICY "Users can view their groups"
    ON groups FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
        )
    );

-- Groups: Authenticated users can create groups
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
CREATE POLICY "Authenticated users can create groups"
    ON groups FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Groups: Group admins can update groups
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
CREATE POLICY "Group admins can update groups"
    ON groups FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- Groups: Group admins can delete groups
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;
CREATE POLICY "Group admins can delete groups"
    ON groups FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- ============================================
-- RLS Policies for Group Members
-- ============================================

-- Group Members: Users can view members of groups they belong to
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
CREATE POLICY "Users can view group members"
    ON group_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
        )
    );

-- Group Members: Group creator can add initial member (themselves)
DROP POLICY IF EXISTS "Users can add themselves to groups they create" ON group_members;
CREATE POLICY "Users can add themselves to groups they create"
    ON group_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM groups
            WHERE groups.id = group_members.group_id
            AND groups.created_by = auth.uid()
        )
    );

-- Group Members: Group admins can remove members
DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
CREATE POLICY "Group admins can remove members"
    ON group_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
    );

-- Group Members: Users can leave groups (delete their own membership)
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups"
    ON group_members FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- RLS Policies for Group Invites
-- ============================================

-- Group Invites: Users can view invites sent to them
DROP POLICY IF EXISTS "Users can view their group invites" ON group_invites;
CREATE POLICY "Users can view their group invites"
    ON group_invites FOR SELECT
    USING (invitee_id = auth.uid());

-- Group Invites: Group members can view invites for their groups
DROP POLICY IF EXISTS "Group members can view group invites" ON group_invites;
CREATE POLICY "Group members can view group invites"
    ON group_invites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_invites.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Group Invites: Group members can create invites
DROP POLICY IF EXISTS "Group members can invite others" ON group_invites;
CREATE POLICY "Group members can invite others"
    ON group_invites FOR INSERT
    WITH CHECK (
        inviter_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_invites.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Group Invites: Invitees can update their own invites (accept/decline)
DROP POLICY IF EXISTS "Users can respond to invites" ON group_invites;
CREATE POLICY "Users can respond to invites"
    ON group_invites FOR UPDATE
    USING (invitee_id = auth.uid());

-- Group Invites: Users can delete invites sent to them
DROP POLICY IF EXISTS "Users can delete their invites" ON group_invites;
CREATE POLICY "Users can delete their invites"
    ON group_invites FOR DELETE
    USING (invitee_id = auth.uid());

-- ============================================
-- Verification
-- ============================================

-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('groups', 'group_members', 'group_invites')
ORDER BY table_name;

-- Check policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('groups', 'group_members', 'group_invites')
ORDER BY tablename, cmd, policyname;
-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'friend_request', 'group_invite', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- For friend requests, group invites, etc.
    is_read BOOLEAN DEFAULT false NOT NULL,
    action_url TEXT, -- Optional URL or identifier for action
    metadata JSONB DEFAULT '{}'::jsonb, -- Store additional data like group_id, invite_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications for others"
    ON notifications FOR INSERT
    WITH CHECK (true); -- Allow any authenticated user to create notifications

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

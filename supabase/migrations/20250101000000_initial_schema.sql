-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create friendships table
CREATE TABLE friendships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'accepted' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    paid_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    split_type TEXT DEFAULT 'equal' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create expense_participants table (tracks who participates in each expense and their share)
CREATE TABLE expense_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    share_amount DECIMAL(10, 2) NOT NULL CHECK (share_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(expense_id, user_id)
);

-- Create settlements table (tracks payments between users)
CREATE TABLE settlements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_user UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    to_user UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (from_user != to_user)
);

-- Create indexes for better performance
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX idx_expense_participants_user_id ON expense_participants(user_id);
CREATE INDEX idx_settlements_from_user ON settlements(from_user);
CREATE INDEX idx_settlements_to_user ON settlements(to_user);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for friendships
CREATE POLICY "Users can view their own friendships"
    ON friendships FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create friendships"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
    ON friendships FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses they're involved in"
    ON expenses FOR SELECT
    USING (
        auth.uid() = paid_by OR
        EXISTS (
            SELECT 1 FROM expense_participants
            WHERE expense_participants.expense_id = expenses.id
            AND expense_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() = paid_by);

CREATE POLICY "Users can update expenses they created"
    ON expenses FOR UPDATE
    USING (auth.uid() = paid_by);

CREATE POLICY "Users can delete expenses they created"
    ON expenses FOR DELETE
    USING (auth.uid() = paid_by);

-- RLS Policies for expense_participants
CREATE POLICY "Users can view participants for expenses they're in"
    ON expense_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM expenses
            WHERE expenses.id = expense_participants.expense_id
            AND (expenses.paid_by = auth.uid() OR
                 EXISTS (SELECT 1 FROM expense_participants ep2
                         WHERE ep2.expense_id = expenses.id
                         AND ep2.user_id = auth.uid()))
        )
    );

CREATE POLICY "Users can add participants when creating expense"
    ON expense_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses
            WHERE expenses.id = expense_participants.expense_id
            AND expenses.paid_by = auth.uid()
        )
    );

-- RLS Policies for settlements
CREATE POLICY "Users can view settlements they're involved in"
    ON settlements FOR SELECT
    USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can create settlements they're paying"
    ON settlements FOR INSERT
    WITH CHECK (auth.uid() = from_user);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
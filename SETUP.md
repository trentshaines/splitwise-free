# Splitwise App - Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Splitwise (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear icon) in the left sidebar
2. Go to **API** section
3. You'll need two values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

4. Open `supabase-config.js` in your project and replace:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
   ```

## Step 3: Create Database Tables

1. In your Supabase project, click on the **SQL Editor** icon in the left sidebar
2. Click "New query"
3. Copy and paste the entire SQL schema below
4. Click "Run" or press Ctrl+Enter

### SQL Schema

```sql
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
```

## Step 4: Enable Email Authentication

1. In your Supabase project, click on **Authentication** in the left sidebar
2. Click on **Providers**
3. Make sure **Email** is enabled (it should be by default)
4. Scroll down to **Email Templates** (optional but recommended)
5. You can customize the confirmation email template if desired

## Step 5: Configure Email Settings (Optional)

By default, Supabase uses their email service. For production, you may want to configure your own SMTP:

1. Go to **Authentication** > **Settings**
2. Scroll to **SMTP Settings**
3. Configure your own email provider if needed

For development, the default is fine!

## Step 6: Test Your Setup

1. Open `index.html` in a web browser (or serve it locally)
2. Try signing up with a test email
3. Check your email for confirmation (check spam folder!)
4. Confirm your email and log in
5. Start using the app!

## Local Development

To run locally with live reload, you can use any simple HTTP server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (install first: npm install -g http-server)
http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Deploying to GitHub Pages

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. Go to repository Settings > Pages
4. Under "Source", select "main" branch
5. Click Save
6. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Security Notes

- The `anon` key is safe to use in client-side code
- Row Level Security (RLS) protects your data
- Users can only see and modify their own data
- Never commit your Supabase credentials to public repositories if you want to keep the project URL private (though the anon key is designed to be public)

## Troubleshooting

### "Failed to fetch" errors
- Make sure you've updated `supabase-config.js` with your actual credentials
- Check that your Supabase project is running

### Email confirmation not arriving
- Check spam folder
- In Supabase, go to Authentication > Settings
- You can disable email confirmation for development (not recommended for production)

### RLS policy errors
- Make sure you ran the entire SQL schema
- Check the SQL Editor for any error messages
- Try running the policies section separately if needed

## Features Included

✅ User authentication (signup/login/logout)
✅ Friend management (add friends by email)
✅ Create expenses with multiple split options
✅ Real-time balance calculation
✅ Settlement recording
✅ Expense history
✅ Responsive design
✅ Toast notifications
✅ Secure with Row Level Security

---

**Need Help?**
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
-- ============================================
-- Fix Missing Tables and Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Fix expense INSERT policy (REQUIRED)
-- ============================================

DROP POLICY IF EXISTS "Users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON expenses;

CREATE POLICY "Authenticated users can create expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 2. Create history snapshots table (OPTIONAL)
-- ============================================

CREATE TABLE IF NOT EXISTS history_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    snapshot_data JSONB NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_history_snapshots_created_at ON history_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_snapshots_created_by ON history_snapshots(created_by);

-- Enable Row Level Security
ALTER TABLE history_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view snapshots (all users share same data)
DROP POLICY IF EXISTS "Anyone can view snapshots" ON history_snapshots;
CREATE POLICY "Anyone can view snapshots"
    ON history_snapshots FOR SELECT
    USING (true);

-- RLS Policy: Authenticated users can create snapshots
DROP POLICY IF EXISTS "Authenticated users can create snapshots" ON history_snapshots;
CREATE POLICY "Authenticated users can create snapshots"
    ON history_snapshots FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Verification queries
-- ============================================

-- Check expenses policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'expenses'
ORDER BY cmd;

-- Check history_snapshots table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'history_snapshots';

-- Check history_snapshots policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'history_snapshots'
ORDER BY cmd;

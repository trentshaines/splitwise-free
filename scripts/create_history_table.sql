-- Create history snapshots table for full database backups
-- Captures complete state after every transaction

CREATE TABLE history_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    snapshot_data JSONB NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_history_snapshots_created_at ON history_snapshots(created_at DESC);
CREATE INDEX idx_history_snapshots_created_by ON history_snapshots(created_by);

-- Enable Row Level Security
ALTER TABLE history_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view snapshots (all users share same data)
CREATE POLICY "Anyone can view snapshots"
    ON history_snapshots FOR SELECT
    USING (true);

-- RLS Policy: Authenticated users can create snapshots
CREATE POLICY "Authenticated users can create snapshots"
    ON history_snapshots FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Optional: Auto-cleanup old snapshots (keep last 100)
-- You can run this periodically or manually
-- DELETE FROM history_snapshots
-- WHERE id NOT IN (
--     SELECT id FROM history_snapshots
--     ORDER BY created_at DESC
--     LIMIT 100
-- );
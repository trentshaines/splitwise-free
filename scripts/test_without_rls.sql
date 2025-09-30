-- ============================================
-- Temporarily disable RLS to test if that's the issue
-- THIS IS JUST FOR TESTING - DO NOT USE IN PRODUCTION
-- ============================================

-- Disable RLS temporarily
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;

-- Try creating a group from your app now
-- If it works, we know the RLS policy is the problem

-- To re-enable after testing:
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
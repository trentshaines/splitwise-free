-- ============================================
-- Check for Triggers and Functions
-- Run this in Supabase SQL Editor
-- ============================================

-- Check for triggers on groups tables
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('groups', 'group_members', 'group_invites')
ORDER BY event_object_table, trigger_name;

-- Check for functions that might be called
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%group%'
    OR routine_definition LIKE '%groups%'
)
ORDER BY routine_name;

-- Check current locks (if any)
SELECT
    locktype,
    relation::regclass,
    mode,
    granted
FROM pg_locks
WHERE relation::regclass::text LIKE '%group%';

-- Check if uuid extension is enabled
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
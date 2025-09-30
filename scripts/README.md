# Database Scripts

## Core Schema Files (Run in order for fresh setup)

1. **apply_expenses.sql** - Core expenses and settlements tables with RLS policies
2. **create_history_table.sql** - History snapshots table for time travel feature
3. **fix_rls_recursion.sql** - SECURITY DEFINER functions to fix friendship RLS recursion
4. **update_rls_for_edit_delete.sql** - Additional RLS policies for editing/deleting expenses
5. **create_groups_tables.sql** - Groups feature tables (groups, group_members, group_invites)
6. **final_fix_all.sql** - Complete groups RLS setup with SECURITY DEFINER functions

## Setup Instructions

For a fresh Supabase project, run these scripts in order:

```sql
-- 1. Core expenses system
\i apply_expenses.sql
\i fix_rls_recursion.sql
\i update_rls_for_edit_delete.sql

-- 2. History feature
\i create_history_table.sql

-- 3. Groups feature
\i create_groups_tables.sql
\i final_fix_all.sql
```

## Archive Folder

The `archive/` folder contains one-time debugging and fix scripts that were used during development. These are kept for reference but are not needed for setup.
-- Clean up orphaned expense_participants (where expense no longer exists)
DELETE FROM expense_participants
WHERE NOT EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_participants.expense_id
);

-- Clean up expenses with no participants (data integrity issue)
DELETE FROM expenses
WHERE NOT EXISTS (
    SELECT 1 FROM expense_participants
    WHERE expense_participants.expense_id = expenses.id
);

-- Clean up settlements with null/invalid user references
-- Note: id should never be null (it's the primary key), but checking other fields
DELETE FROM settlements
WHERE from_user IS NULL
   OR to_user IS NULL;

-- Clean up settlements where referenced users don't exist
DELETE FROM settlements
WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = settlements.from_user
)
OR NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = settlements.to_user
);

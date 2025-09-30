-- Apply expenses from old CLI data
-- Only for timothy, trent, and kelly

DO $$
DECLARE
    timothy_id UUID;
    trent_id UUID;
    kelly_id UUID;
    expense_id UUID;
BEGIN
    -- Get user IDs by email
    SELECT id INTO timothy_id FROM auth.users WHERE email = 'zhang.timothy.224@gmail.com';
    SELECT id INTO trent_id FROM auth.users WHERE email = 'trentshaines@gmail.com';
    SELECT id INTO kelly_id FROM auth.users WHERE email = 'kellyma0404@gmail.com';

    -- Raise error if any user not found
    IF timothy_id IS NULL THEN RAISE EXCEPTION 'timothy (zhang.timothy.224@gmail.com) not found'; END IF;
    IF trent_id IS NULL THEN RAISE EXCEPTION 'trent (trentshaines@gmail.com) not found'; END IF;
    IF kelly_id IS NULL THEN RAISE EXCEPTION 'kelly (kellyma0404@gmail.com) not found'; END IF;

    -- Expense 1: airbnb uber interlaken ($15.00)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('airbnb uber interlaken', 15.00, timothy_id, 'equal', '2025-09-30T00:50:32.948944')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, timothy_id, 5.00),
        (expense_id, trent_id, 5.00),
        (expense_id, kelly_id, 5.00);

    -- Expense 2: uber interlanker 2 ($15.05)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('uber interlanker 2', 15.05, timothy_id, 'equal', '2025-09-30T00:52:10.560315')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, timothy_id, 5.02),
        (expense_id, trent_id, 5.02),
        (expense_id, kelly_id, 5.01);

    -- Expense 3: interlanken dinner ($159.83)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('interlanken dinner', 159.83, timothy_id, 'equal', '2025-09-30T00:52:45.593926')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, timothy_id, 53.28),
        (expense_id, trent_id, 53.28),
        (expense_id, kelly_id, 53.27);

    -- Expense 4: train zurich interlaken ($289.05)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('train zurich interlaken', 289.05, timothy_id, 'equal', '2025-09-30T00:53:15.341654')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, timothy_id, 96.35),
        (expense_id, trent_id, 96.35),
        (expense_id, kelly_id, 96.35);

    -- Expense 5: train interlanken zurich ($274.75)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('train interlanken zurich', 274.75, timothy_id, 'equal', '2025-09-30T00:53:27.347575')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, timothy_id, 91.58),
        (expense_id, trent_id, 91.58),
        (expense_id, kelly_id, 91.59);

    -- Expense 6: carry on trent ($23.42)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('carry on trent', 23.42, timothy_id, 'equal', '2025-09-30T00:53:47.336476')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, trent_id, 23.42);

    -- Expense 7: wilderswid airbnb ($308.06)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('wilderswid airbnb', 308.06, trent_id, 'equal', '2025-09-30T00:55:59.623395')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, timothy_id, 102.69),
        (expense_id, trent_id, 102.69),
        (expense_id, kelly_id, 102.68);

    -- Expense 8: citizenm ($206.00)
    INSERT INTO expenses (description, amount, paid_by, split_type, created_at)
    VALUES ('citizenm', 206.00, trent_id, 'equal', '2025-09-30T00:57:45.018757')
    RETURNING id INTO expense_id;

    INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES
        (expense_id, timothy_id, 103.00),
        (expense_id, trent_id, 103.00);

    RAISE NOTICE 'Successfully inserted 8 expenses!';
END $$;
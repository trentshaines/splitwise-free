// Global state
let currentUser = null;
let friends = [];
let allUsers = [];
let expenses = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is already logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await handleAuthSuccess(session.user);
    }

    // Setup auth state listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await handleAuthSuccess(session.user);
        } else if (event === 'SIGNED_OUT') {
            handleSignOut();
        }
    });

    // Setup form listeners
    setupFormListeners();
});

// ============ AUTH FUNCTIONS ============

function setupFormListeners() {
    document.getElementById('login').addEventListener('submit', handleLogin);
    document.getElementById('signup').addEventListener('submit', handleSignup);
    document.getElementById('add-expense-form').addEventListener('submit', handleAddExpense);
    document.getElementById('add-friend-form').addEventListener('submit', handleAddFriend);
    document.getElementById('settle-up-form').addEventListener('submit', handleSettleUp);

    // Listen for split type changes
    document.getElementById('expense-split-type').addEventListener('change', handleSplitTypeChange);
}

function toggleAuthForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    loginForm.classList.toggle('hidden');
    signupForm.classList.toggle('hidden');
    document.getElementById('auth-error').classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showAuthError(error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name
            },
            emailRedirectTo: 'https://trentshaines.github.io/splitwise-free/'
        }
    });

    if (error) {
        showAuthError(error.message);
    } else {
        // Clear form
        document.getElementById('signup-form').reset();

        // Switch to login form
        toggleAuthForm();

        // Show prominent success message
        const authError = document.getElementById('auth-error');
        authError.className = 'mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm';
        authError.innerHTML = `
            <strong>✓ Account created!</strong><br>
            Please check your email (including spam folder) and click the confirmation link.<br>
            After confirming, come back here to login.
        `;
        authError.classList.remove('hidden');

        showToast('Check your email for confirmation link!', 'success');
    }
}

async function logout() {
    await supabase.auth.signOut();
}

function handleSignOut() {
    currentUser = null;
    friends = [];
    expenses = [];
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

async function handleAuthSuccess(user) {
    currentUser = user;

    // Create or update profile
    await ensureProfile(user);

    // Show app screen
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');

    // Display user name
    const userName = user.user_metadata?.full_name || user.email;
    document.getElementById('user-display').textContent = `Hello, ${userName}`;

    // Load data
    await loadFriends();
    await loadAllUsers();
    await loadExpenses();
    await updateDashboard();
}

async function ensureProfile(user) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating profile for user:', user.email);
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || ''
            });

        if (insertError) {
            console.error('Error creating profile:', insertError);
        } else {
            console.log('Profile created successfully');
        }
    } else if (error) {
        console.error('Error checking profile:', error);
    } else {
        console.log('Profile already exists for:', user.email);
    }
}

function showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// ============ NAVIGATION ============

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-emerald-600', 'text-emerald-600');
        btn.classList.add('border-transparent', 'text-gray-600');
    });

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    activeBtn.classList.remove('border-transparent', 'text-gray-600');
    activeBtn.classList.add('border-emerald-600', 'text-emerald-600');
}

// ============ FRIENDS FUNCTIONS ============

async function loadFriends() {
    const { data, error } = await supabase
        .from('friendships')
        .select(`
            friend_id,
            profiles:friend_id (
                id,
                email,
                full_name
            )
        `)
        .eq('user_id', currentUser.id)
        .eq('status', 'accepted');

    if (error) {
        console.error('Error loading friends:', error);
        return;
    }

    friends = data.map(f => f.profiles);
    updateFriendsList();
    updateSettleFriendsList();
}

async function loadAllUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .neq('id', currentUser.id);

    if (error) {
        console.error('Error loading users:', error);
        return;
    }

    allUsers = data || [];
    updateExpenseParticipants();
}

function updateFriendsList() {
    const container = document.getElementById('friends-list');

    if (friends.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No friends yet. Add friends to start splitting expenses!</p>';
        return;
    }

    container.innerHTML = friends.map(friend => `
        <div class="flex justify-between items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50">
            <div>
                <p class="font-medium">${friend.full_name || 'No name'}</p>
                <p class="text-sm text-gray-600">${friend.email}</p>
            </div>
        </div>
    `).join('');
}

function updateExpenseParticipants() {
    const container = document.getElementById('expense-participants');
    const paidBySelect = document.getElementById('expense-paid-by');

    // Update paid by dropdown
    paidBySelect.innerHTML = '<option value="">Select...</option>';

    // Add current user
    const currentUserName = currentUser.user_metadata?.full_name || currentUser.email;
    paidBySelect.innerHTML += `<option value="${currentUser.id}">${currentUserName} (You)</option>`;

    // Add all users
    allUsers.forEach(user => {
        const name = user.full_name || user.email;
        paidBySelect.innerHTML += `<option value="${user.id}">${name}</option>`;
    });

    // Update participants checkboxes
    container.innerHTML = `
        <label class="flex items-center gap-2">
            <input type="checkbox" value="${currentUser.id}" checked class="participant-checkbox">
            <span>${currentUserName} (You)</span>
        </label>
    `;

    allUsers.forEach(user => {
        const name = user.full_name || user.email;
        container.innerHTML += `
            <label class="flex items-center gap-2">
                <input type="checkbox" value="${user.id}" checked class="participant-checkbox">
                <span>${name}</span>
            </label>
        `;
    });
}

function updateSettleFriendsList() {
    const select = document.getElementById('settle-friend');
    select.innerHTML = '<option value="">Select friend...</option>';

    friends.forEach(friend => {
        const name = friend.full_name || friend.email;
        select.innerHTML += `<option value="${friend.id}">${name}</option>`;
    });
}

async function handleAddFriend(e) {
    e.preventDefault();
    const email = document.getElementById('friend-email').value;
    const submitButton = e.target.querySelector('button[type="submit"]');

    // Disable button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    try {
        // Find user by email
        const { data: profiles, error: searchError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', email)
            .single();

        if (searchError || !profiles) {
            console.error('Search error:', searchError);
            showToast('User not found. Make sure they have signed up and confirmed their email!', 'error');
            return;
        }

        if (profiles.id === currentUser.id) {
            showToast("You can't add yourself as a friend!", 'error');
            return;
        }

        // Check if already friends
        const { data: existing } = await supabase
            .from('friendships')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('friend_id', profiles.id)
            .single();

        if (existing) {
            showToast('Already friends with this user!', 'error');
            return;
        }

        // Create friendship (both directions)
        const { error: error1 } = await supabase
            .from('friendships')
            .insert({
                user_id: currentUser.id,
                friend_id: profiles.id,
                status: 'accepted'
            });

        const { error: error2 } = await supabase
            .from('friendships')
            .insert({
                user_id: profiles.id,
                friend_id: currentUser.id,
                status: 'accepted'
            });

        if (error1 || error2) {
            console.error('Friendship error 1:', error1);
            console.error('Friendship error 2:', error2);
            showToast(`Error adding friend: ${(error1 || error2).message}`, 'error');
            return;
        }

        showToast(`✓ ${profiles.full_name || profiles.email} added as friend!`, 'success');
        closeAddFriendModal();
        await loadFriends();
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Add Friend';
    }
}

// ============ EXPENSES FUNCTIONS ============

async function loadExpenses() {
    const { data, error } = await supabase
        .from('expense_participants')
        .select(`
            expense_id,
            expenses (
                id,
                description,
                amount,
                paid_by,
                split_type,
                created_at,
                payer:paid_by (
                    id,
                    email,
                    full_name
                )
            )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { foreignTable: 'expenses', ascending: false });

    if (error) {
        console.error('Error loading expenses:', error);
        return;
    }

    // Remove duplicates and flatten
    const expenseMap = new Map();
    data.forEach(item => {
        if (item.expenses && !expenseMap.has(item.expenses.id)) {
            expenseMap.set(item.expenses.id, item.expenses);
        }
    });

    expenses = Array.from(expenseMap.values());
    updateExpensesList();
    updateRecentExpenses();
}

function updateRecentExpenses() {
    const container = document.getElementById('recent-expenses');

    if (expenses.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No expenses yet</p>';
        return;
    }

    const recentExpenses = expenses.slice(0, 5);
    container.innerHTML = recentExpenses.map(expense => {
        const payerName = expense.payer?.full_name || expense.payer?.email || 'Unknown';
        const date = new Date(expense.created_at).toLocaleDateString();
        return `
            <div class="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                <div>
                    <p class="font-medium">${expense.description}</p>
                    <p class="text-sm text-gray-600">Paid by ${payerName} • ${date}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-emerald-600">$${expense.amount.toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');
}

function updateExpensesList() {
    const container = document.getElementById('all-expenses');

    if (expenses.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No expenses yet</p>';
        return;
    }

    container.innerHTML = expenses.map(expense => {
        const payerName = expense.payer?.full_name || expense.payer?.email || 'Unknown';
        const date = new Date(expense.created_at).toLocaleDateString();
        return `
            <div class="flex justify-between items-center p-4 border border-gray-200 rounded-md">
                <div>
                    <p class="font-medium text-lg">${expense.description}</p>
                    <p class="text-sm text-gray-600">Paid by ${payerName} • ${date}</p>
                    <p class="text-xs text-gray-500 mt-1">Split: ${expense.split_type}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-lg text-emerald-600">$${expense.amount.toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');
}

function handleSplitTypeChange(e) {
    const exactContainer = document.getElementById('exact-amounts-container');
    if (e.target.value === 'exact') {
        // Show exact amounts inputs
        const checkboxes = document.querySelectorAll('.participant-checkbox:checked');
        const amount = parseFloat(document.getElementById('expense-amount').value) || 0;

        exactContainer.innerHTML = '<p class="text-sm text-gray-700 font-medium mb-2">Enter amount for each person:</p>';

        checkboxes.forEach(cb => {
            const userId = cb.value;
            let name = '';

            if (userId === currentUser.id) {
                name = currentUser.user_metadata?.full_name || currentUser.email;
            } else {
                const friend = friends.find(f => f.id === userId);
                name = friend?.full_name || friend?.email || 'Unknown';
            }

            exactContainer.innerHTML += `
                <div>
                    <label class="block text-sm text-gray-600 mb-1">${name}</label>
                    <input type="number" step="0.01" min="0" data-user-id="${userId}"
                        class="exact-amount-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00">
                </div>
            `;
        });

        exactContainer.classList.remove('hidden');
    } else {
        exactContainer.classList.add('hidden');
    }
}

async function handleAddExpense(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');

    // Disable button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    try {
        const description = document.getElementById('expense-description').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const paidBy = document.getElementById('expense-paid-by').value;
        const splitType = document.getElementById('expense-split-type').value;

        const selectedParticipants = Array.from(document.querySelectorAll('.participant-checkbox:checked'))
            .map(cb => cb.value);

        if (selectedParticipants.length === 0) {
            showToast('Please select at least one participant', 'error');
            return;
        }

        let shares = {};

        if (splitType === 'equal') {
            const shareAmount = amount / selectedParticipants.length;
            selectedParticipants.forEach(userId => {
                shares[userId] = shareAmount;
            });
        } else {
            // Exact amounts
            const exactInputs = document.querySelectorAll('.exact-amount-input');
            let total = 0;
            exactInputs.forEach(input => {
                const userId = input.dataset.userId;
                const share = parseFloat(input.value) || 0;
                shares[userId] = share;
                total += share;
            });

            if (Math.abs(total - amount) > 0.01) {
                showToast(`Amounts must add up to $${amount.toFixed(2)}. Current total: $${total.toFixed(2)}`, 'error');
                return;
            }
        }

        // Insert expense
        const { data: expense, error: expenseError } = await supabase
            .from('expenses')
            .insert({
                description,
                amount,
                paid_by: paidBy,
                split_type: splitType
            })
            .select()
            .single();

        if (expenseError) {
            showToast('Error creating expense', 'error');
            console.error(expenseError);
            return;
        }

        // Insert expense participants
        const participants = Object.entries(shares).map(([userId, share]) => ({
            expense_id: expense.id,
            user_id: userId,
            share_amount: share
        }));

        const { error: participantsError } = await supabase
            .from('expense_participants')
            .insert(participants);

        if (participantsError) {
            showToast('Error adding participants', 'error');
            console.error(participantsError);
            return;
        }

        showToast('✓ Expense added successfully!', 'success');
        closeAddExpenseModal();
        await loadExpenses();
        await updateDashboard();
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Add Expense';
    }
}

// ============ BALANCES & SETTLEMENTS ============

async function updateDashboard() {
    await calculateAndDisplayBalances();
}

async function calculateAndDisplayBalances() {
    // Get all expense participants for current user
    const { data: myExpenses, error: expensesError } = await supabase
        .from('expense_participants')
        .select(`
            expense_id,
            share_amount,
            expenses (
                paid_by,
                amount
            )
        `)
        .eq('user_id', currentUser.id);

    if (expensesError) {
        console.error('Error loading expenses:', expensesError);
        return;
    }

    // Get all settlements
    const { data: settlements, error: settlementsError } = await supabase
        .from('settlements')
        .select('*')
        .or(`from_user.eq.${currentUser.id},to_user.eq.${currentUser.id}`);

    if (settlementsError) {
        console.error('Error loading settlements:', settlementsError);
        return;
    }

    // Calculate balances
    const balances = {};

    // Process expenses
    myExpenses.forEach(ep => {
        const paidBy = ep.expenses.paid_by;
        const myShare = ep.share_amount;

        if (paidBy !== currentUser.id) {
            // I owe someone
            balances[paidBy] = (balances[paidBy] || 0) + myShare;
        } else {
            // Someone owes me - need to get all participants
        }
    });

    // Get expenses I paid for
    const { data: iPaidExpenses } = await supabase
        .from('expenses')
        .select(`
            id,
            amount,
            expense_participants (
                user_id,
                share_amount
            )
        `)
        .eq('paid_by', currentUser.id);

    if (iPaidExpenses) {
        iPaidExpenses.forEach(expense => {
            expense.expense_participants.forEach(ep => {
                if (ep.user_id !== currentUser.id) {
                    // Someone owes me
                    balances[ep.user_id] = (balances[ep.user_id] || 0) - ep.share_amount;
                }
            });
        });
    }

    // Process settlements
    settlements.forEach(settlement => {
        if (settlement.from_user === currentUser.id) {
            // I paid someone
            balances[settlement.to_user] = (balances[settlement.to_user] || 0) - settlement.amount;
        } else {
            // Someone paid me
            balances[settlement.from_user] = (balances[settlement.from_user] || 0) + settlement.amount;
        }
    });

    // Display balances
    await displayBalances(balances);
}

async function displayBalances(balances) {
    const container = document.getElementById('balances-summary');

    const nonZeroBalances = Object.entries(balances).filter(([_, amount]) => Math.abs(amount) > 0.01);

    if (nonZeroBalances.length === 0) {
        container.innerHTML = '<p class="text-green-600 font-medium">All settled up! 🎉</p>';
        return;
    }

    let html = '';
    let totalOwed = 0;
    let totalOwes = 0;

    for (const [userId, amount] of nonZeroBalances) {
        // Get user name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();

        const name = profile?.full_name || profile?.email || 'Unknown';

        if (amount > 0) {
            // I owe them
            html += `
                <div class="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span class="text-sm">You owe <strong>${name}</strong></span>
                    <span class="font-semibold text-red-600">$${amount.toFixed(2)}</span>
                </div>
            `;
            totalOwes += amount;
        } else {
            // They owe me
            html += `
                <div class="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span class="text-sm"><strong>${name}</strong> owes you</span>
                    <span class="font-semibold text-green-600">$${Math.abs(amount).toFixed(2)}</span>
                </div>
            `;
            totalOwed += Math.abs(amount);
        }
    }

    // Add summary
    html += '<hr class="my-3">';
    if (totalOwes > 0) {
        html += `<div class="text-sm"><span class="text-gray-600">You owe in total:</span> <span class="font-semibold text-red-600">$${totalOwes.toFixed(2)}</span></div>`;
    }
    if (totalOwed > 0) {
        html += `<div class="text-sm"><span class="text-gray-600">You are owed in total:</span> <span class="font-semibold text-green-600">$${totalOwed.toFixed(2)}</span></div>`;
    }

    container.innerHTML = html;
}

async function handleSettleUp(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');

    // Disable button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Recording...';

    try {
        const friendId = document.getElementById('settle-friend').value;
        const amount = parseFloat(document.getElementById('settle-amount').value);

        // Record settlement
        const { error } = await supabase
            .from('settlements')
            .insert({
                from_user: currentUser.id,
                to_user: friendId,
                amount: amount
            });

        if (error) {
            showToast('Error recording settlement', 'error');
            console.error(error);
            return;
        }

        showToast('✓ Payment recorded successfully!', 'success');
        closeSettleUpModal();
        await updateDashboard();
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Record Payment';
    }
}

// ============ MODAL FUNCTIONS ============

function openAddExpenseModal() {
    if (allUsers.length === 0) {
        showToast('No other users found. Please wait for others to sign up!', 'error');
        return;
    }
    document.getElementById('add-expense-modal').classList.remove('hidden');
    updateExpenseParticipants();
}

function closeAddExpenseModal() {
    document.getElementById('add-expense-modal').classList.add('hidden');
    document.getElementById('add-expense-form').reset();
    document.getElementById('exact-amounts-container').innerHTML = '';
    document.getElementById('exact-amounts-container').classList.add('hidden');
}

function openAddFriendModal() {
    document.getElementById('add-friend-modal').classList.remove('hidden');
}

function closeAddFriendModal() {
    document.getElementById('add-friend-modal').classList.add('hidden');
    document.getElementById('add-friend-form').reset();
}

function openSettleUpModal() {
    if (friends.length === 0) {
        showToast('Please add friends first', 'error');
        return;
    }
    document.getElementById('settle-up-modal').classList.remove('hidden');
}

function closeSettleUpModal() {
    document.getElementById('settle-up-modal').classList.add('hidden');
    document.getElementById('settle-up-form').reset();
}

// ============ UTILITY FUNCTIONS ============

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const bgColor = type === 'success' ? 'bg-green-500' :
                    type === 'error' ? 'bg-red-500' : 'bg-blue-500';

    toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 opacity-0`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('opacity-0');
    }, 100);

    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}
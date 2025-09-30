// Global state
let currentUser = null;
let friends = [];
let allUsers = [];
let expenses = [];
let currentTheme = 'emerald';
let groups = [];
let currentGroupId = null;

// Currency conversion rates (to USD) - Updated from Federal Reserve H.10 (September 2025)
const CURRENCY_RATES = {
    'USD': 1.00,
    'EUR': 1.1692,    // 1 EUR = $1.1692 USD
    'GBP': 1.3404,    // 1 GBP = $1.3404 USD
    'JPY': 0.00669,   // 1 JPY = $0.00669 USD (149.52 JPY per USD)
    'CAD': 0.717,     // 1 CAD = $0.717 USD (1.3946 CAD per USD)
    'AUD': 0.6546,    // 1 AUD = $0.6546 USD
    'CHF': 1.252,     // 1 CHF = $1.252 USD (0.7985 CHF per USD)
    'CNY': 0.1402,    // 1 CNY = $0.1402 USD (7.1328 CNY per USD)
    'INR': 0.01128,   // 1 INR = $0.01128 USD (88.65 INR per USD)
    'MXN': 0.0544,    // 1 MXN = $0.0544 USD (18.38 MXN per USD)
    'BRL': 0.1872,    // 1 BRL = $0.1872 USD (5.34 BRL per USD)
    'KRW': 0.000709,  // 1 KRW = $0.000709 USD (1410.05 KRW per USD)
    'SGD': 0.7739,    // 1 SGD = $0.7739 USD (1.292 SGD per USD)
    'HKD': 0.1285,    // 1 HKD = $0.1285 USD (7.78 HKD per USD)
    'NZD': 0.5769     // 1 NZD = $0.5769 USD
};

function convertToUSD(amount, currency) {
    return amount * (CURRENCY_RATES[currency] || 1);
}

function updateConversionPreview() {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;
    const preview = document.getElementById('conversion-preview');

    if (!amount || amount <= 0) {
        preview.classList.add('hidden');
        return;
    }

    if (currency === 'USD') {
        preview.classList.add('hidden');
    } else {
        const usdAmount = convertToUSD(amount, currency);
        preview.classList.remove('hidden');
        preview.innerHTML = `💱 = $${usdAmount.toFixed(2)} USD (rate: 1 ${currency} = $${CURRENCY_RATES[currency].toFixed(4)} USD)`;
    }
}

function updateEditConversionPreview() {
    const amount = parseFloat(document.getElementById('edit-expense-amount').value);
    const currency = document.getElementById('edit-expense-currency').value;
    const preview = document.getElementById('edit-conversion-preview');

    if (!amount || amount <= 0) {
        preview.classList.add('hidden');
        return;
    }

    if (currency === 'USD') {
        preview.classList.add('hidden');
    } else {
        const usdAmount = convertToUSD(amount, currency);
        preview.classList.remove('hidden');
        preview.innerHTML = `💱 = $${usdAmount.toFixed(2)} USD (rate: 1 ${currency} = $${CURRENCY_RATES[currency].toFixed(4)} USD)`;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved theme
    loadTheme();

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
    document.getElementById('edit-expense-form').addEventListener('submit', handleEditExpense);
    document.getElementById('add-friend-form').addEventListener('submit', handleAddFriend);
    document.getElementById('settle-up-form').addEventListener('submit', handleSettleUp);
    document.getElementById('create-group-form').addEventListener('submit', handleCreateGroup);
    document.getElementById('invite-group-form').addEventListener('submit', handleInviteToGroup);

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
    await loadGroups();
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
    // Load accepted friends
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

    // Load pending friend requests (where current user is the recipient)
    await loadFriendRequests();
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

async function loadFriendRequests() {
    const container = document.getElementById('friend-requests-list');
    const section = document.getElementById('friend-requests-section');

    // Get requests where current user is the recipient (friend_id)
    const { data, error } = await supabase
        .from('friendships')
        .select(`
            id,
            user_id,
            created_at,
            requester:user_id (
                id,
                email,
                full_name
            )
        `)
        .eq('friend_id', currentUser.id)
        .eq('status', 'pending');

    if (error) {
        console.error('Error loading friend requests:', error);
        return;
    }

    if (!data || data.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = data.map(request => {
        const requesterName = request.requester?.full_name || request.requester?.email || 'Unknown';
        const date = new Date(request.created_at).toLocaleDateString();

        return `
            <div class="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                <div>
                    <p class="font-medium">${requesterName}</p>
                    <p class="text-xs text-gray-500 mt-1">${date}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="acceptFriendRequest('${request.id}', '${request.user_id}')"
                        class="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700 transition">
                        Accept
                    </button>
                    <button onclick="declineFriendRequest('${request.id}')"
                        class="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 transition">
                        Decline
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function acceptFriendRequest(requestId, requesterId) {
    try {
        // Delete the pending request
        await supabase
            .from('friendships')
            .delete()
            .eq('id', requestId);

        // Create accepted friendship (both directions)
        const { error: error1 } = await supabase
            .from('friendships')
            .insert({
                user_id: currentUser.id,
                friend_id: requesterId,
                status: 'accepted'
            });

        const { error: error2 } = await supabase
            .from('friendships')
            .insert({
                user_id: requesterId,
                friend_id: currentUser.id,
                status: 'accepted'
            });

        if (error1 || error2) {
            console.error('Accept error:', error1 || error2);
            showToast('Error accepting friend request', 'error');
            return;
        }

        showToast('✓ Friend request accepted!', 'success');
        await loadFriends();
    } catch (err) {
        console.error('Accept error:', err);
        showToast('Error accepting friend request', 'error');
    }
}

async function declineFriendRequest(requestId) {
    try {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', requestId);

        if (error) {
            console.error('Decline error:', error);
            showToast('Error declining friend request', 'error');
            return;
        }

        showToast('Friend request declined', 'success');
        await loadFriendRequests();
    } catch (err) {
        console.error('Decline error:', err);
        showToast('Error declining friend request', 'error');
    }
}

async function handleAddFriend(e) {
    e.preventDefault();
    const email = document.getElementById('friend-email').value;
    const submitButton = e.target.querySelector('button[type="submit"]');

    // Disable button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

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

        // Check if already friends or request exists
        const { data: existing } = await supabase
            .from('friendships')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('friend_id', profiles.id)
            .single();

        if (existing) {
            if (existing.status === 'accepted') {
                showToast('Already friends with this user!', 'error');
            } else if (existing.status === 'pending') {
                showToast('Friend request already sent!', 'error');
            }
            return;
        }

        // Create friend request (only one direction, pending)
        const { error } = await supabase
            .from('friendships')
            .insert({
                user_id: currentUser.id,
                friend_id: profiles.id,
                status: 'pending'
            });

        if (error) {
            console.error('Friendship error:', error);
            showToast(`Error sending friend request: ${error.message}`, 'error');
            return;
        }

        showToast(`✓ Friend request sent to ${profiles.full_name || profiles.email}!`, 'success');
        closeAddFriendModal();
        await loadFriends();
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Send Request';
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
        .eq('user_id', currentUser.id);

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

    // Sort by most recent first (descending order)
    expenses.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Most recent first
    });

    // Load participants for each expense
    await Promise.all(expenses.map(async (expense) => {
        const { data: participants, error: partError } = await supabase
            .from('expense_participants')
            .select(`
                user_id,
                share_amount,
                profiles:user_id (
                    id,
                    email,
                    full_name
                )
            `)
            .eq('expense_id', expense.id);

        if (!partError && participants) {
            expense.participants = participants.map(p => ({
                ...p.profiles,
                share_amount: p.share_amount
            }));
        }
    }));

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
        const participantNames = expense.participants
            ? expense.participants.map(p => p.full_name || p.email || 'Unknown').join(', ')
            : 'Loading...';

        // Calculate your share
        const myParticipant = expense.participants?.find(p => p.id === currentUser.id);
        const myShare = myParticipant ? myParticipant.share_amount : 0;
        const iPaid = expense.paid_by === currentUser.id;
        const myBalance = iPaid ? (expense.amount - myShare) : -myShare;
        const myBalanceColor = myBalance > 0 ? 'text-green-600' : myBalance < 0 ? 'text-red-600' : 'text-gray-600';
        const myBalanceSign = myBalance > 0 ? '+' : myBalance < 0 ? '-' : '';

        return `
            <div class="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                <div>
                    <p class="font-medium">${expense.description}</p>
                    <p class="text-sm text-gray-600">Paid by ${payerName} • ${date}</p>
                    <p class="text-xs text-gray-500 mt-1">Split between: ${participantNames}</p>
                </div>
                <div class="text-right flex flex-col items-end">
                    <p class="font-semibold text-blue-600">$${expense.amount.toFixed(2)}</p>
                    <p class="text-sm ${myBalanceColor}">(${myBalanceSign}$${Math.abs(myBalance).toFixed(2)})</p>
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
        const participantNames = expense.participants
            ? expense.participants.map(p => {
                const name = p.full_name || p.email || 'Unknown';
                return `${name} ($${p.share_amount.toFixed(2)})`;
              }).join(', ')
            : 'Loading...';

        // Calculate your share
        const myParticipant = expense.participants?.find(p => p.id === currentUser.id);
        const myShare = myParticipant ? myParticipant.share_amount : 0;
        const iPaid = expense.paid_by === currentUser.id;
        const myBalance = iPaid ? (expense.amount - myShare) : -myShare;
        const myBalanceColor = myBalance > 0 ? 'text-green-600' : myBalance < 0 ? 'text-red-600' : 'text-gray-600';
        const myBalanceSign = myBalance > 0 ? '+' : myBalance < 0 ? '-' : '';

        return `
            <div class="flex justify-between items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                <div class="flex-1">
                    <p class="font-medium text-lg">${expense.description}</p>
                    <p class="text-sm text-gray-600">Paid by ${payerName} • ${date}</p>
                    <p class="text-xs text-gray-500 mt-1">Split (${expense.split_type === 'equal' ? 'equally' : expense.split_type}): ${participantNames}</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right flex flex-col items-end">
                        <p class="font-semibold text-lg text-blue-600">$${expense.amount.toFixed(2)}</p>
                        <p class="text-sm ${myBalanceColor}">(${myBalanceSign}$${Math.abs(myBalance).toFixed(2)})</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openEditExpenseModal('${expense.id}')" class="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                        <button onclick="deleteExpense('${expense.id}')" class="text-red-600 hover:text-red-700 text-sm">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function handleSplitTypeChange(e) {
    const exactContainer = document.getElementById('exact-amounts-container');
    const summaryContainer = document.getElementById('exact-amounts-summary');

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
                const user = allUsers.find(u => u.id === userId);
                name = user?.full_name || user?.email || 'Unknown';
            }

            exactContainer.innerHTML += `
                <div>
                    <label class="block text-sm text-gray-600 mb-1">${name}</label>
                    <input type="number" step="0.01" min="0" data-user-id="${userId}"
                        class="exact-amount-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00"
                        oninput="updateExactAmountsSummary()">
                </div>
            `;
        });

        exactContainer.classList.remove('hidden');
        summaryContainer.classList.remove('hidden');
        updateExactAmountsSummary();
    } else {
        exactContainer.classList.add('hidden');
        summaryContainer.classList.add('hidden');
    }
}

function updateExactAmountsSummary() {
    const totalAmount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const currency = document.getElementById('expense-currency').value;
    const exactInputs = document.querySelectorAll('.exact-amount-input');

    let totalEntered = 0;
    exactInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        totalEntered += value;
    });

    const remaining = totalAmount - totalEntered;

    document.getElementById('exact-total').textContent = `${totalEntered.toFixed(2)} ${currency}`;

    const remainingEl = document.getElementById('exact-remaining');
    remainingEl.textContent = `${remaining.toFixed(2)} ${currency}`;

    // Color code the remaining amount
    if (Math.abs(remaining) < 0.01) {
        remainingEl.className = 'font-semibold text-green-600';
    } else if (remaining < 0) {
        remainingEl.className = 'font-semibold text-red-600';
    } else {
        remainingEl.className = 'font-semibold text-orange-600';
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
        const originalAmount = parseFloat(document.getElementById('expense-amount').value);
        const currency = document.getElementById('expense-currency').value;
        const paidBy = document.getElementById('expense-paid-by').value;
        const splitType = document.getElementById('expense-split-type').value;

        // Convert to USD
        const amount = convertToUSD(originalAmount, currency);

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

            if (Math.abs(total - originalAmount) > 0.01) {
                showToast(`Amounts must add up to ${originalAmount.toFixed(2)} ${currency}. Current total: ${total.toFixed(2)} ${currency}`, 'error');
                return;
            }
            // Convert exact shares to USD
            for (let userId in shares) {
                shares[userId] = convertToUSD(shares[userId], currency);
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
        // await createSnapshot();
        closeAddExpenseModal();
        await loadExpenses();
        await updateDashboard();
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Add Expense';
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense? This cannot be undone.')) {
        return;
    }

    // Delete expense participants first
    const { error: participantsError } = await supabase
        .from('expense_participants')
        .delete()
        .eq('expense_id', expenseId);

    if (participantsError) {
        showToast('Error deleting expense participants', 'error');
        console.error(participantsError);
        return;
    }

    // Delete expense
    const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

    if (expenseError) {
        showToast('Error deleting expense', 'error');
        console.error(expenseError);
        return;
    }

    showToast('✓ Expense deleted successfully!', 'success');
    // await createSnapshot();
    await loadExpenses();
    await updateDashboard();
}

function openEditExpenseModal(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
        showToast('Expense not found', 'error');
        return;
    }

    // Store the expense ID for later
    document.getElementById('edit-expense-form').dataset.expenseId = expenseId;

    // Pre-fill the form (amounts are stored in USD)
    document.getElementById('edit-expense-description').value = expense.description;
    document.getElementById('edit-expense-amount').value = expense.amount;
    document.getElementById('edit-expense-currency').value = 'USD';
    document.getElementById('edit-expense-paid-by').value = expense.paid_by;
    document.getElementById('edit-expense-split-type').value = expense.split_type;

    // Load participants
    loadEditExpenseParticipants(expenseId);

    document.getElementById('edit-expense-modal').classList.remove('hidden');
}

async function loadEditExpenseParticipants(expenseId) {
    const { data, error } = await supabase
        .from('expense_participants')
        .select('user_id, share_amount')
        .eq('expense_id', expenseId);

    if (error) {
        console.error('Error loading expense participants:', error);
        return;
    }

    const participantIds = data.map(p => p.user_id);
    const container = document.getElementById('edit-expense-participants');
    const paidBySelect = document.getElementById('edit-expense-paid-by');

    // Update paid by dropdown
    paidBySelect.innerHTML = '<option value="">Select...</option>';
    const currentUserName = currentUser.user_metadata?.full_name || currentUser.email;
    paidBySelect.innerHTML += `<option value="${currentUser.id}">${currentUserName} (You)</option>`;
    allUsers.forEach(user => {
        const name = user.full_name || user.email;
        paidBySelect.innerHTML += `<option value="${user.id}">${name}</option>`;
    });

    // Update participants checkboxes
    container.innerHTML = `
        <label class="flex items-center gap-2">
            <input type="checkbox" value="${currentUser.id}" ${participantIds.includes(currentUser.id) ? 'checked' : ''} class="edit-participant-checkbox">
            <span>${currentUserName} (You)</span>
        </label>
    `;

    allUsers.forEach(user => {
        const name = user.full_name || user.email;
        container.innerHTML += `
            <label class="flex items-center gap-2">
                <input type="checkbox" value="${user.id}" ${participantIds.includes(user.id) ? 'checked' : ''} class="edit-participant-checkbox">
                <span>${name}</span>
            </label>
        `;
    });
}

async function handleEditExpense(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    const expenseId = e.target.dataset.expenseId;

    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';

    try {
        const description = document.getElementById('edit-expense-description').value;
        const originalAmount = parseFloat(document.getElementById('edit-expense-amount').value);
        const currency = document.getElementById('edit-expense-currency').value;
        const paidBy = document.getElementById('edit-expense-paid-by').value;
        const splitType = document.getElementById('edit-expense-split-type').value;

        // Convert to USD
        const amount = convertToUSD(originalAmount, currency);

        const selectedParticipants = Array.from(document.querySelectorAll('.edit-participant-checkbox:checked'))
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
        }

        // Update expense
        const { error: expenseError } = await supabase
            .from('expenses')
            .update({
                description,
                amount,
                paid_by: paidBy,
                split_type: splitType
            })
            .eq('id', expenseId);

        if (expenseError) {
            showToast('Error updating expense', 'error');
            console.error(expenseError);
            return;
        }

        // Delete old participants
        await supabase
            .from('expense_participants')
            .delete()
            .eq('expense_id', expenseId);

        // Insert new participants
        const participants = Object.entries(shares).map(([userId, share]) => ({
            expense_id: expenseId,
            user_id: userId,
            share_amount: share
        }));

        const { error: participantsError } = await supabase
            .from('expense_participants')
            .insert(participants);

        if (participantsError) {
            showToast('Error updating participants', 'error');
            console.error(participantsError);
            return;
        }

        showToast('✓ Expense updated successfully!', 'success');
        // await createSnapshot();
        closeEditExpenseModal();
        await loadExpenses();
        await updateDashboard();
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Expense';
    }
}

// ============ BALANCES & SETTLEMENTS ============

async function updateDashboard() {
    await calculateAndDisplayBalances();
    await loadSettlementHistory();
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
        // await createSnapshot();
        closeSettleUpModal();
        await updateDashboard();
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Record Payment';
    }
}

async function loadSettlementHistory() {
    const container = document.getElementById('settlement-history');

    // Get all settlements involving current user
    const { data, error } = await supabase
        .from('settlements')
        .select(`
            id,
            amount,
            created_at,
            from_user,
            to_user,
            from_profile:from_user (
                id,
                email,
                full_name
            ),
            to_profile:to_user (
                id,
                email,
                full_name
            )
        `)
        .or(`from_user.eq.${currentUser.id},to_user.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error loading settlements:', error);
        container.innerHTML = '<p class="text-red-500 text-sm">Error loading settlements</p>';
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No settlements yet</p>';
        return;
    }

    container.innerHTML = data.map(settlement => {
        const fromName = settlement.from_profile?.full_name || settlement.from_profile?.email || 'Unknown';
        const toName = settlement.to_profile?.full_name || settlement.to_profile?.email || 'Unknown';
        const date = new Date(settlement.created_at).toLocaleDateString();
        const isCurrentUserPayer = settlement.from_user === currentUser.id;

        return `
            <div class="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                <div>
                    ${isCurrentUserPayer
                        ? `<p class="text-sm"><span class="font-medium">You</span> paid <span class="font-medium">${toName}</span></p>`
                        : `<p class="text-sm"><span class="font-medium">${fromName}</span> paid <span class="font-medium">you</span></p>`
                    }
                    <p class="text-xs text-gray-500 mt-1">${date}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold ${isCurrentUserPayer ? 'text-red-600' : 'text-green-600'}">
                        $${settlement.amount.toFixed(2)}
                    </p>
                </div>
            </div>
        `;
    }).join('');
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
    document.getElementById('exact-amounts-summary').classList.add('hidden');
    document.getElementById('conversion-preview').classList.add('hidden');
    document.getElementById('expense-currency').value = 'USD';
}

function closeEditExpenseModal() {
    document.getElementById('edit-expense-modal').classList.add('hidden');
    document.getElementById('edit-expense-form').reset();
    document.getElementById('edit-conversion-preview').classList.add('hidden');
    document.getElementById('edit-expense-currency').value = 'USD';
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

// ============ HISTORY SNAPSHOT FUNCTIONS ============

async function createSnapshot() {
    if (!currentUser) return;

    try {
        // Capture complete database state
        const [expensesData, participantsData, settlementsData, profilesData] = await Promise.all([
            // Get all expenses
            supabase.from('expenses').select('*').order('created_at', { ascending: false }),
            // Get all expense participants
            supabase.from('expense_participants').select('*'),
            // Get all settlements
            supabase.from('settlements').select('*').order('created_at', { ascending: false }),
            // Get all profiles
            supabase.from('profiles').select('id, email, full_name')
        ]);

        const snapshotData = {
            timestamp: new Date().toISOString(),
            expenses: expensesData.data || [],
            expense_participants: participantsData.data || [],
            settlements: settlementsData.data || [],
            profiles: profilesData.data || []
        };

        // Save snapshot
        const { error } = await supabase
            .from('history_snapshots')
            .insert({
                created_by: currentUser.id,
                snapshot_data: snapshotData
            });

        if (error) {
            console.error('Error creating snapshot:', error);
        } else {
            console.log('Snapshot created successfully at', snapshotData.timestamp);
        }
    } catch (err) {
        console.error('Failed to create snapshot:', err);
    }
}

async function loadSnapshots() {
    const { data, error } = await supabase
        .from('history_snapshots')
        .select(`
            id,
            created_at,
            created_by,
            snapshot_data,
            creator:created_by (
                full_name,
                email
            )
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Show last 50 snapshots

    if (error) {
        console.error('Error loading snapshots:', error);
        return [];
    }

    return data || [];
}

async function restoreSnapshot(snapshotId) {
    if (!confirm('⚠️ WARNING: This will replace ALL current data with the snapshot. This cannot be undone! Are you sure?')) {
        return;
    }

    try {
        // Get the snapshot
        const { data: snapshot, error: fetchError } = await supabase
            .from('history_snapshots')
            .select('snapshot_data')
            .eq('id', snapshotId)
            .single();

        if (fetchError || !snapshot) {
            showToast('Error loading snapshot', 'error');
            return;
        }

        const data = snapshot.snapshot_data;

        // Delete all current data (in order to avoid FK constraints)
        await supabase.from('expense_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Restore expenses
        if (data.expenses && data.expenses.length > 0) {
            await supabase.from('expenses').insert(data.expenses);
        }

        // Restore expense participants
        if (data.expense_participants && data.expense_participants.length > 0) {
            await supabase.from('expense_participants').insert(data.expense_participants);
        }

        // Restore settlements
        if (data.settlements && data.settlements.length > 0) {
            await supabase.from('settlements').insert(data.settlements);
        }

        showToast('✓ Snapshot restored successfully!', 'success');

        // Reload all data
        await loadExpenses();
        await updateDashboard();
    } catch (err) {
        console.error('Error restoring snapshot:', err);
        showToast('Error restoring snapshot', 'error');
    }
}

// ============ GROUPS FUNCTIONS ============

async function loadGroups() {
    if (!currentUser) return;

    // Load groups where user is a member
    const { data, error } = await supabase
        .from('group_members')
        .select(`
            group_id,
            role,
            groups:group_id (
                id,
                name,
                description,
                created_by,
                created_at
            )
        `)
        .eq('user_id', currentUser.id);

    if (error) {
        console.error('Error loading groups:', error);
        showToast('Error loading groups: ' + error.message, 'error');
        return;
    }

    groups = data ? data.map(item => ({
        ...item.groups,
        myRole: item.role
    })) : [];

    updateGroupsList();
    await loadGroupInvites();
}

function updateGroupsList() {
    const container = document.getElementById('groups-list');

    if (groups.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No groups yet. Create one to get started!</p>';
        return;
    }

    container.innerHTML = groups.map(group => {
        const date = new Date(group.created_at).toLocaleDateString();
        const roleText = group.myRole === 'admin' ? '👑 Admin' : 'Member';
        const isAdmin = group.myRole === 'admin';

        return `
            <div class="flex justify-between items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                <div class="flex-1">
                    <p class="font-medium text-lg">${group.name}</p>
                    ${group.description ? `<p class="text-sm text-gray-600 mt-1">${group.description}</p>` : ''}
                    <p class="text-xs text-gray-500 mt-1">Created ${date} • ${roleText}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="viewGroupMembers('${group.id}')"
                        class="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 transition">
                        View Members
                    </button>
                    ${isAdmin ? `
                        <button onclick="openInviteGroupModal('${group.id}')"
                            class="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700 transition">
                            + Invite
                        </button>
                        <button onclick="deleteGroup('${group.id}', '${group.name.replace(/'/g, "\\'")}')"
                            class="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 transition">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function handleCreateGroup(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';

    try {
        console.log('Starting group creation...');
        const name = document.getElementById('group-name').value;
        const description = document.getElementById('group-description').value;

        // Get selected members to invite
        const selectedMembers = Array.from(document.querySelectorAll('.group-member-checkbox:checked'))
            .map(cb => cb.value);

        console.log('Creating group:', { name, description, selectedMembers });

        // Create the group
        console.log('Inserting into groups table...');
        console.log('Current user ID:', currentUser.id);

        // Create the group first (without .select() to avoid SELECT policy issues)
        console.log('Step 1: Creating group record...');
        const groupInsertResult = await supabase
            .from('groups')
            .insert({
                name,
                description,
                created_by: currentUser.id
            });

        console.log('Group insert result:', groupInsertResult);

        if (groupInsertResult.error) {
            console.error('Group error:', groupInsertResult.error);
            showToast('Error creating group: ' + groupInsertResult.error.message, 'error');
            return;
        }

        // Query back the group we just created to get its ID
        console.log('Step 2: Fetching created group...');
        const { data: createdGroups, error: fetchError } = await supabase
            .from('groups')
            .select('*')
            .eq('name', name)
            .eq('created_by', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1);

        console.log('Fetch result:', { createdGroups, fetchError });

        if (fetchError || !createdGroups || createdGroups.length === 0) {
            console.error('Could not fetch created group');
            showToast('Group created but could not retrieve it', 'error');
            return;
        }

        const group = createdGroups[0];
        console.log('Created group:', group);

        // Add creator as admin member
        console.log('Step 3: Adding creator as admin member...');
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: currentUser.id,
                role: 'admin'
            });

        console.log('Member insert result:', { memberError });

        if (memberError) {
            console.error('Member error:', memberError);
            showToast('Error adding you to the group: ' + memberError.message, 'error');
            return;
        }

        // Send invitations to selected members
        if (selectedMembers.length > 0) {
            const invites = selectedMembers.map(userId => ({
                group_id: group.id,
                inviter_id: currentUser.id,
                invitee_id: userId,
                status: 'pending'
            }));

            const { error: inviteError } = await supabase
                .from('group_invites')
                .insert(invites);

            if (inviteError) {
                console.error('Invite error:', inviteError);
                showToast(`Group created but error sending invitations: ${inviteError.message}`, 'error');
            } else {
                showToast(`✓ Group "${name}" created and ${selectedMembers.length} invitation(s) sent!`, 'success');
            }
        } else {
            showToast(`✓ Group "${name}" created successfully!`, 'success');
        }

        closeCreateGroupModal();
        await loadGroups();
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Group';
    }
}

async function loadGroupInvites() {
    const container = document.getElementById('group-invites-list');
    const section = document.getElementById('group-invites-section');

    // Get invites where current user is the invitee
    const { data, error } = await supabase
        .from('group_invites')
        .select(`
            id,
            group_id,
            created_at,
            groups:group_id (
                id,
                name,
                description
            ),
            inviter:inviter_id (
                id,
                email,
                full_name
            )
        `)
        .eq('invitee_id', currentUser.id)
        .eq('status', 'pending');

    if (error) {
        console.error('Error loading group invites:', error);
        return;
    }

    if (!data || data.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = data.map(invite => {
        const inviterName = invite.inviter?.full_name || invite.inviter?.email || 'Unknown';
        const groupName = invite.groups?.name || 'Unknown Group';
        const date = new Date(invite.created_at).toLocaleDateString();

        return `
            <div class="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                <div>
                    <p class="font-medium">${groupName}</p>
                    <p class="text-sm text-gray-600">Invited by ${inviterName}</p>
                    <p class="text-xs text-gray-500 mt-1">${date}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="acceptGroupInvite('${invite.id}', '${invite.group_id}')"
                        class="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700 transition">
                        Accept
                    </button>
                    <button onclick="declineGroupInvite('${invite.id}')"
                        class="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 transition">
                        Decline
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function handleInviteToGroup(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    try {
        const email = document.getElementById('invite-user-email').value;

        // Find user by email
        const { data: profiles, error: searchError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', email)
            .single();

        if (searchError || !profiles) {
            showToast('User not found. Make sure they have a Splitwiser account!', 'error');
            return;
        }

        if (profiles.id === currentUser.id) {
            showToast("You can't invite yourself!", 'error');
            return;
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', currentGroupId)
            .eq('user_id', profiles.id)
            .single();

        if (existingMember) {
            showToast('User is already a member of this group!', 'error');
            return;
        }

        // Check if invite already exists
        const { data: existingInvite } = await supabase
            .from('group_invites')
            .select('*')
            .eq('group_id', currentGroupId)
            .eq('invitee_id', profiles.id)
            .eq('status', 'pending')
            .single();

        if (existingInvite) {
            showToast('Invitation already sent to this user!', 'error');
            return;
        }

        // Create invitation
        const { error } = await supabase
            .from('group_invites')
            .insert({
                group_id: currentGroupId,
                inviter_id: currentUser.id,
                invitee_id: profiles.id,
                status: 'pending'
            });

        if (error) {
            console.error('Invite error:', error);
            showToast('Error sending invitation', 'error');
            return;
        }

        showToast(`✓ Invitation sent to ${profiles.full_name || profiles.email}!`, 'success');
        closeInviteGroupModal();
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Invitation';
    }
}

async function acceptGroupInvite(inviteId, groupId) {
    try {
        // Delete the invite
        await supabase
            .from('group_invites')
            .delete()
            .eq('id', inviteId);

        // Add user as member
        const { error } = await supabase
            .from('group_members')
            .insert({
                group_id: groupId,
                user_id: currentUser.id,
                role: 'member'
            });

        if (error) {
            console.error('Accept error:', error);
            showToast('Error accepting invitation', 'error');
            return;
        }

        showToast('✓ Joined group successfully!', 'success');
        await loadGroups();
    } catch (err) {
        console.error('Accept error:', err);
        showToast('Error accepting invitation', 'error');
    }
}

async function declineGroupInvite(inviteId) {
    try {
        const { error } = await supabase
            .from('group_invites')
            .delete()
            .eq('id', inviteId);

        if (error) {
            console.error('Decline error:', error);
            showToast('Error declining invitation', 'error');
            return;
        }

        showToast('Group invitation declined', 'success');
        await loadGroupInvites();
    } catch (err) {
        console.error('Decline error:', err);
        showToast('Error declining invitation', 'error');
    }
}

async function viewGroupMembers(groupId) {
    const { data, error } = await supabase
        .from('group_members')
        .select(`
            role,
            joined_at,
            profiles:user_id (
                id,
                email,
                full_name
            )
        `)
        .eq('group_id', groupId);

    if (error) {
        console.error('Error loading members:', error);
        showToast('Error loading group members', 'error');
        return;
    }

    const memberNames = data.map(m => {
        const name = m.profiles?.full_name || m.profiles?.email || 'Unknown';
        const role = m.role === 'admin' ? ' (Admin)' : '';
        return name + role;
    }).join('\n');

    alert(`Group Members:\n\n${memberNames}`);
}

function openCreateGroupModal() {
    document.getElementById('create-group-modal').classList.remove('hidden');

    // Populate member selection with friends first, then others
    const container = document.getElementById('group-members-to-add');
    container.innerHTML = '<p class="text-xs text-gray-500 mb-2">Select users to invite to this group</p>';

    if (allUsers.length === 0) {
        container.innerHTML += '<p class="text-xs text-gray-400">No users available to invite</p>';
        return;
    }

    // Separate friends and non-friends
    const friendIds = new Set(friends.map(f => f.id));
    const friendUsers = allUsers.filter(u => friendIds.has(u.id));
    const nonFriendUsers = allUsers.filter(u => !friendIds.has(u.id));

    // Add friends section
    if (friendUsers.length > 0) {
        container.innerHTML += '<p class="text-xs font-semibold text-gray-700 mt-2 mb-1">Friends</p>';
        friendUsers.forEach(user => {
            const name = user.full_name || user.email;
            container.innerHTML += `
                <label class="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
                    <input type="checkbox" value="${user.id}" class="group-member-checkbox">
                    <span class="text-sm">${name}</span>
                </label>
            `;
        });
    }

    // Add other users section
    if (nonFriendUsers.length > 0) {
        container.innerHTML += '<p class="text-xs font-semibold text-gray-700 mt-3 mb-1">Other Users</p>';
        nonFriendUsers.forEach(user => {
            const name = user.full_name || user.email;
            container.innerHTML += `
                <label class="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
                    <input type="checkbox" value="${user.id}" class="group-member-checkbox">
                    <span class="text-sm text-gray-600">${name}</span>
                </label>
            `;
        });
    }
}

function closeCreateGroupModal() {
    document.getElementById('create-group-modal').classList.add('hidden');
    document.getElementById('create-group-form').reset();
}

function openInviteGroupModal(groupId) {
    currentGroupId = groupId;
    document.getElementById('invite-group-modal').classList.remove('hidden');

    // Populate user dropdown with friends first, then others
    const select = document.getElementById('invite-user-id');
    select.innerHTML = '<option value="">Select a user...</option>';

    // Separate friends and non-friends
    const friendIds = new Set(friends.map(f => f.id));
    const friendUsers = allUsers.filter(u => friendIds.has(u.id));
    const nonFriendUsers = allUsers.filter(u => !friendIds.has(u.id));

    // Add friends optgroup
    if (friendUsers.length > 0) {
        const friendsGroup = document.createElement('optgroup');
        friendsGroup.label = 'Friends';
        friendUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name || user.email;
            friendsGroup.appendChild(option);
        });
        select.appendChild(friendsGroup);
    }

    // Add other users optgroup
    if (nonFriendUsers.length > 0) {
        const othersGroup = document.createElement('optgroup');
        othersGroup.label = 'Other Users';
        nonFriendUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name || user.email;
            othersGroup.appendChild(option);
        });
        select.appendChild(othersGroup);
    }
}

function closeInviteGroupModal() {
    document.getElementById('invite-group-modal').classList.add('hidden');
    document.getElementById('invite-group-form').reset();
    currentGroupId = null;
}

async function deleteGroup(groupId, groupName) {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"? This will remove all members and invitations.`)) {
        return;
    }

    const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

    if (error) {
        console.error('Error deleting group:', error);
        showToast('Error deleting group: ' + error.message, 'error');
        return;
    }

    showToast(`✓ Group "${groupName}" deleted successfully!`, 'success');
    await loadGroups();
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

// ============ THEME FUNCTIONS ============

function loadTheme() {
    const savedTheme = localStorage.getItem('splitwiser-theme') || 'emerald';
    currentTheme = savedTheme;
    applyTheme(savedTheme);

    // Set dropdown value
    const selector = document.getElementById('theme-selector');
    if (selector) {
        selector.value = savedTheme;
    }
}

function changeTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('splitwiser-theme', theme);
    applyTheme(theme);
    showToast(`Theme changed to ${theme}!`, 'success');
}

function applyTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('theme-emerald', 'theme-blue', 'theme-purple', 'theme-rose', 'theme-orange', 'theme-dark');

    // Add new theme class
    document.body.classList.add(`theme-${theme}`);

    // Also set data attribute for additional CSS targeting if needed
    document.body.setAttribute('data-theme', theme);
}
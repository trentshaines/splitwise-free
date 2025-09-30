# Test Accounts for Splitwise

## User Accounts

Sign up with these accounts on https://trentshaines.github.io/splitwise-free/

### Timothy
- **Email**: `zhangtimothy@gmail.com`
- **Password**: `Splitwise2025!`
- **Full Name**: Timothy Zhang

### Trent
- **Email**: `trentshaines@gmail.com`
- **Password**: `Splitwise2025!`
- **Full Name**: Trent Shaines

### Kelly
- **Email**: `kelly.splitwise@example.com`
- **Password**: `Splitwise2025!`
- **Full Name**: Kelly Smith

### Sujai
- **Email**: `sujai.splitwise@example.com`
- **Password**: `Splitwise2025!`
- **Full Name**: Sujai Patel

---

## Setup Instructions

1. **Sign up all 4 accounts** on the website (check email confirmations)
2. **Add friendships** between users:
   - Timothy → add Trent, Kelly, Sujai
   - Trent → add Timothy, Kelly
   - Kelly → add Timothy, Trent
   - Sujai → add Timothy (optional, no expenses yet)
3. **Run seed SQL** in Supabase SQL Editor:
   - Open `seed_expenses.sql`
   - Copy and paste into Supabase SQL Editor
   - Run to insert all 8 expenses from the old CLI data

---

## Expenses Summary (from old data)

Total: 8 expenses
- Timothy paid: 6 expenses ($777.35)
- Trent paid: 2 expenses ($514.06)

**Timothy owes Trent**: ~$206 based on old data
**Kelly owes**: ~$402 to Timothy + ~$103 to Trent
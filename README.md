# Splitwise - Expense Sharing App

A full-stack expense sharing application that helps you split bills and track balances with friends.

## Features

- 🔐 **User Authentication** - Secure signup/login with Supabase Auth
- 👥 **Friend Management** - Add friends by email
- 💰 **Expense Tracking** - Create and track shared expenses
- 📊 **Smart Splitting** - Equal or exact amount splits
- 💳 **Balance Calculation** - Automatic calculation of who owes whom
- ✅ **Settlements** - Record payments to settle balances
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔒 **Secure** - Row Level Security with Supabase

## Tech Stack

- **Frontend**: HTML, JavaScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Hosting**: GitHub Pages (static hosting)

## Quick Start

### 1. Setup Supabase

Follow the detailed instructions in [SETUP.md](SETUP.md) to:
- Create a Supabase project
- Run the SQL schema
- Get your API credentials

### 2. Configure

Edit `supabase-config.js` and add your Supabase credentials:

```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Run Locally

```bash
# Using Python
python3 -m http.server 8000

# Then open http://localhost:8000
```

### 4. Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then enable GitHub Pages in your repository settings.

## Usage

1. **Sign up** with your email
2. **Add friends** by their email addresses
3. **Create expenses** and choose how to split them
4. **View balances** to see who owes whom
5. **Settle up** when someone pays you back

## Project Structure

```
.
├── index.html              # Main HTML structure
├── app.js                  # Application logic
├── supabase-config.js      # Supabase client config
├── SETUP.md                # Detailed setup instructions
├── splitwise.py            # Original CLI version (Python)
└── README.md               # This file
```

## Old CLI Version

This repository also contains the original Python CLI version (`splitwise.py`). To use it:

```bash
python3 splitwise.py
```

## License

MIT

## Contributing

Feel free to open issues or submit pull requests!
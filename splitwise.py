#!/usr/bin/env python3
"""
Simple Splitwise CLI - Track shared expenses and settle balances
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict


class Splitwise:
    def __init__(self, data_file: str = "splitwise_data.json"):
        self.data_file = data_file
        self.users: List[str] = []
        self.expenses: List[Dict] = []
        self.settlements: List[Dict] = []
        self.load_data()

    def load_data(self):
        """Load data from JSON file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.users = data.get('users', [])
                    self.expenses = data.get('expenses', [])
                    self.settlements = data.get('settlements', [])
            except json.JSONDecodeError:
                print(f"Warning: Could not read {self.data_file}. Starting fresh.")

    def save_data(self):
        """Save data to JSON file"""
        data = {
            'users': self.users,
            'expenses': self.expenses,
            'settlements': self.settlements
        }
        with open(self.data_file, 'w') as f:
            json.dump(data, f, indent=2)

    def add_user(self, name: str) -> bool:
        """Add a new user"""
        if name in self.users:
            print(f"User '{name}' already exists!")
            return False
        self.users.append(name)
        self.save_data()
        print(f"User '{name}' added successfully!")
        return True

    def list_users(self):
        """List all users"""
        if not self.users:
            print("No users found. Add some users first!")
            return
        print("\nUsers:")
        for i, user in enumerate(self.users, 1):
            print(f"  {i}. {user}")

    def add_expense(self, description: str, amount: float, paid_by: str,
                    participants: List[str], split_type: str = "equal",
                    split_details: Optional[Dict[str, float]] = None):
        """Add a new expense"""
        if paid_by not in self.users:
            print(f"Error: User '{paid_by}' not found!")
            return False

        for participant in participants:
            if participant not in self.users:
                print(f"Error: User '{participant}' not found!")
                return False

        # Calculate individual shares
        shares = {}
        if split_type == "equal":
            share_amount = amount / len(participants)
            shares = {p: share_amount for p in participants}
        elif split_type == "exact":
            if split_details and sum(split_details.values()) == amount:
                shares = split_details
            else:
                print("Error: Exact amounts don't match total!")
                return False
        elif split_type == "percentage":
            if split_details and sum(split_details.values()) == 100:
                shares = {p: (amount * pct / 100) for p, pct in split_details.items()}
            else:
                print("Error: Percentages don't add up to 100!")
                return False

        expense = {
            'id': len(self.expenses) + 1,
            'description': description,
            'amount': amount,
            'paid_by': paid_by,
            'participants': participants,
            'split_type': split_type,
            'shares': shares,
            'date': datetime.now().isoformat()
        }

        self.expenses.append(expense)
        self.save_data()
        print(f"\nExpense '{description}' added successfully!")
        print(f"Total: ${amount:.2f}, paid by {paid_by}")
        print("Split:")
        for participant, share in shares.items():
            print(f"  {participant}: ${share:.2f}")
        return True

    def calculate_balances(self) -> Dict[str, Dict[str, float]]:
        """
        Calculate who owes whom
        Returns a nested dict: {debtor: {creditor: amount}}
        """
        # Track net balances between each pair of users
        balances = defaultdict(lambda: defaultdict(float))

        # Process expenses
        for expense in self.expenses:
            paid_by = expense['paid_by']
            shares = expense['shares']

            for participant, share in shares.items():
                if participant != paid_by:
                    # Participant owes paid_by
                    balances[participant][paid_by] += share

        # Process settlements
        for settlement in self.settlements:
            from_user = settlement['from_user']
            to_user = settlement['to_user']
            amount = settlement['amount']

            # Reduce the debt
            balances[from_user][to_user] -= amount

        # Simplify: net out mutual debts
        simplified = defaultdict(lambda: defaultdict(float))
        for debtor, creditors in list(balances.items()):
            for creditor, amount in list(creditors.items()):
                if amount > 0.01:  # Only keep significant debts
                    net = amount - balances[creditor][debtor]
                    if net > 0.01:
                        simplified[debtor][creditor] = net

        return dict(simplified)

    def show_balances(self):
        """Display all balances"""
        balances = self.calculate_balances()

        if not balances:
            print("\nAll settled up! No outstanding balances.")
            return

        print("\nOutstanding Balances:")
        print("-" * 40)
        for debtor, creditors in sorted(balances.items()):
            for creditor, amount in sorted(creditors.items()):
                print(f"{debtor} owes {creditor}: ${amount:.2f}")

        # Show individual user summaries
        print("\n" + "=" * 40)
        print("User Summaries:")
        print("=" * 40)
        user_totals = defaultdict(float)
        for debtor, creditors in balances.items():
            for creditor, amount in creditors.items():
                user_totals[debtor] -= amount
                user_totals[creditor] += amount

        for user in sorted(self.users):
            total = user_totals[user]
            if abs(total) < 0.01:
                print(f"{user}: Settled up")
            elif total > 0:
                print(f"{user}: Gets back ${total:.2f}")
            else:
                print(f"{user}: Owes ${abs(total):.2f}")

    def record_settlement(self, from_user: str, to_user: str, amount: float):
        """Record a payment between users"""
        if from_user not in self.users or to_user not in self.users:
            print("Error: Invalid user!")
            return False

        settlement = {
            'id': len(self.settlements) + 1,
            'from_user': from_user,
            'to_user': to_user,
            'amount': amount,
            'date': datetime.now().isoformat()
        }

        self.settlements.append(settlement)
        self.save_data()
        print(f"\n✓ Payment recorded: {from_user} paid {to_user} ${amount:.2f}")
        return True

    def list_expenses(self):
        """List all expenses"""
        if not self.expenses:
            print("\nNo expenses recorded yet!")
            return

        print("\nAll Expenses:")
        print("-" * 60)
        for expense in self.expenses:
            print(f"\n#{expense['id']} - {expense['description']}")
            print(f"  Amount: ${expense['amount']:.2f}")
            print(f"  Paid by: {expense['paid_by']}")
            print(f"  Date: {expense['date'][:10]}")
            print(f"  Split ({expense['split_type']}):")
            for participant, share in expense['shares'].items():
                print(f"    {participant}: ${share:.2f}")


def main():
    app = Splitwise()

    while True:
        print("\n" + "=" * 50)
        print("         SPLITWISE - Expense Tracker")
        print("=" * 50)
        print("\n1. Add User")
        print("2. List Users")
        print("3. Add Expense")
        print("4. List Expenses")
        print("5. Show Balances")
        print("6. Record Settlement")
        print("7. Exit")
        print()

        choice = input("Choose an option (1-7): ").strip()

        if choice == '1':
            # Add User
            name = input("Enter user name: ").strip()
            if name:
                app.add_user(name)

        elif choice == '2':
            # List Users
            app.list_users()

        elif choice == '3':
            # Add Expense
            if not app.users:
                print("Please add users first!")
                continue

            description = input("Expense description: ").strip()
            try:
                amount = float(input("Total amount: $").strip())
            except ValueError:
                print("Invalid amount!")
                continue

            print("\nWho paid?")
            app.list_users()
            paid_input = input("Enter name or number: ").strip()
            if paid_input.isdigit():
                idx = int(paid_input) - 1
                if 0 <= idx < len(app.users):
                    paid_by = app.users[idx]
                else:
                    print("Invalid number!")
                    continue
            else:
                paid_by = paid_input

            print("\nWho should split this expense?")
            print("Enter names or numbers separated by commas (e.g., 1,2,3 or Alice,Bob)")
            participants_input = input("Participants: ").strip()
            participants = []
            for p in participants_input.split(','):
                p = p.strip()
                if p.isdigit():
                    idx = int(p) - 1
                    if 0 <= idx < len(app.users):
                        participants.append(app.users[idx])
                    else:
                        print(f"Invalid number: {p}")
                        break
                else:
                    participants.append(p)
            else:
                # Only continue if no break occurred
                if not participants:
                    print("No valid participants entered!")
                    continue

            print("\nSplit type:")
            print("1. Equal split")
            print("2. Exact amounts")
            split_choice = input("Choose (1-2, default=1): ").strip() or "1"

            if split_choice == "1":
                # Preview equal split
                share_amount = amount / len(participants)
                print("\n--- PREVIEW ---")
                print(f"Expense: {description}")
                print(f"Total: ${amount:.2f}, paid by {paid_by}")
                print("Equal split:")
                for participant in participants:
                    print(f"  {participant}: ${share_amount:.2f}")
                confirm = input("\nConfirm? (y/n): ").strip().lower()
                if confirm == 'y':
                    app.add_expense(description, amount, paid_by, participants, "equal")
                else:
                    print("Expense cancelled.")

            elif split_choice == "2":
                split_details = {}
                print("\nEnter exact amount for each participant:")
                for participant in participants:
                    try:
                        share = float(input(f"  {participant}: $").strip())
                        split_details[participant] = share
                    except ValueError:
                        print(f"Invalid amount for {participant}")
                        break
                else:
                    # Preview exact split
                    print("\n--- PREVIEW ---")
                    print(f"Expense: {description}")
                    print(f"Total: ${amount:.2f}, paid by {paid_by}")
                    print("Exact split:")
                    for participant, share in split_details.items():
                        print(f"  {participant}: ${share:.2f}")
                    confirm = input("\nConfirm? (y/n): ").strip().lower()
                    if confirm == 'y':
                        app.add_expense(description, amount, paid_by, participants,
                                      "exact", split_details)
                    else:
                        print("Expense cancelled.")

        elif choice == '4':
            # List Expenses
            app.list_expenses()

        elif choice == '5':
            # Show Balances
            app.show_balances()

        elif choice == '6':
            # Record Settlement
            if not app.users:
                print("Please add users first!")
                continue

            print("\nWho is paying?")
            from_user = input("From: ").strip()
            print("Who is receiving?")
            to_user = input("To: ").strip()
            try:
                amount = float(input("Amount: $").strip())
                app.record_settlement(from_user, to_user, amount)
            except ValueError:
                print("Invalid amount!")

        elif choice == '7':
            # Exit
            print("\nGoodbye! Your data has been saved.")
            break

        else:
            print("Invalid option. Please choose 1-7.")


if __name__ == "__main__":
    main()
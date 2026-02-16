# Finance & Credit Card Spend Tracker

## Overview

A personal finance app that helps you track spending across multiple credit cards, monitor progress toward minimum spend requirements, and manage a simple monthly budget with categories — all with user accounts so your data syncs across devices.

## Core Features

### 1. Dashboard

- At-a-glance view of each credit card's minimum spend progress (progress bars showing how close you are to hitting the target)
- Monthly spending summary broken down by category
- Total personal spending vs. total credit card charges (distinguishing your own spend from amounts others owe you)

### 2. Credit Card Management

- Add multiple credit cards with a name, minimum spend target, and time period (e.g., "spend $4,000 in 3 months")
- Each card shows a progress tracker: total charged, your personal portion, and how much more you need to spend

### 3. Transaction Logging

- Log transactions with: amount, date, category, payment mode (cash, PayNow, credit card), credit card used (if applicable), and an optional description
- **Split amount support**: Enter the full amount charged to the card AND the portion that's actually yours (e.g., dinner was $200 total, your share was $50)
- The full amount counts toward CC minimum spend progress; only your portion counts toward your personal budget
- Quick-add form for fast entry

### 4. Budget Categories

- Create simple monthly budget categories (e.g., Food, Transport, Entertainment, Bills)
- Set a monthly budget limit per category
- See spending per category with progress indicators
- Only your personal portion of split transactions counts against category budgets

### 5. Monthly Summary View

- Calendar month view showing spending trends
- Breakdown: total charged to cards vs. your actual personal expenses
- Category-by-category budget vs. actual comparison

### 6. User Accounts & Authentication

- Email/password sign-up and login
- All data stored securely in the cloud via Supabase
- Each user's data is private and accessible across devices

## Design Direction

- Clean, modern dashboard layout
- Card-based UI with clear progress indicators
- Mobile-friendly so you can log transactions on the go
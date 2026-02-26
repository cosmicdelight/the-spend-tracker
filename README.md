# SpendTracker

A budget and finance tracker that separates your **actual spending** from **credit card spending** so you can stay on track toward your monthly minimum spend goals — and know what counts as your own expenditure vs. split expenses (e.g., when you pay for the table and friends pay you back).

**Built with Lovable** · [Live demo](https://the-spend-tracker.lovable.app/) · [GitHub](https://github.com/cosmicdelight/the-spend-tracker)

---

## What it does

- **Track actual + credit card spending** — Add both in a single expense dialog: the full amount on your card and your personal share (e.g., when you split with others)
- **Monitor minimum spend** — See if you're on track to hit your credit card minimum for the month
- **Handle split expenses** — Separate personal amount from total (e.g., group dinners, shared trips)
- **Income tracking** — Log salary, bonuses, dividends
- **Recurring transactions** — Auto-generate monthly subscriptions and bills
- **CSV import** — Bulk import transactions from bank exports
- **Duplicate transaction** — Copy an existing expense from the Edit dialog (uses today's date)
- **Auto-populate category** — Enter a description first; if Category is empty, it fills from past matching transactions on blur
- **Try Demo** — Instant access to a pre-seeded demo account
- **PWA** — Install as an app on your device

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI, Recharts |
| Forms | React Hook Form, Zod |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Tools | TanStack Query, date-fns, Lucide icons |
| Built with | [Lovable](https://lovable.dev/) (AI-powered app builder) |

---

## Live demo

**[the-spend-tracker.lovable.app](https://the-spend-tracker.lovable.app/)**

Use **Try Demo** on the login screen to explore without signing up.

---

## Getting started

1. **Clone the repo**
   ```sh
   git clone https://github.com/cosmicdelight/the-spend-tracker.git
   cd the-spend-tracker
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase project URL, anon key, and demo password (see `.env.example` for details)
   - For Edge Functions (`demo-login`, `seed-demo-account`), set `DEMO_PASSWORD` in Supabase secrets

3. **Install and run**
   ```sh
   npm install
   npm run dev
   ```

4. **(Optional) Seed the demo account**
   - Call the `seed-demo-account` Edge Function with your service role key to create the demo user and sample data

---

## Project structure

- `src/pages/` — Auth, dashboard (Index), Categories, Cards, Income categories
- `src/components/` — Transaction list, charts, dialogs, CSV import, onboarding tour
- `src/hooks/` — Auth, transactions, income, budget categories, credit cards
- `supabase/functions/` — `demo-login`, `seed-demo-account`, `process-recurring-transactions`

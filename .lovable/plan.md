
# Income Tracking Flow

## Overview

A dedicated income tracking system with its own database table, CRUD UI, an Income tab in the bottom nav, and a net savings summary integrated into the Stats tab. The design mirrors the existing transaction patterns throughout the codebase.

## Database

A new `income` table with RLS policies restricting access to the owning user.

```text
income
├── id               uuid  (PK, gen_random_uuid())
├── user_id          uuid  (NOT NULL)
├── amount           numeric (NOT NULL, default 0) — always stored in SGD
├── original_amount  numeric (NOT NULL, default 0)
├── original_currency text  (NOT NULL, default 'SGD')
├── date             date  (NOT NULL, default CURRENT_DATE)
├── source           text  (NOT NULL) — e.g. "Salary", "Freelance"
├── description      text  (nullable)
├── notes            text  (nullable)
└── created_at       timestamptz (default now())
```

RLS: `auth.uid() = user_id` on ALL operations (mirrors all other tables in the project).

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/[timestamp].sql` | New `income` table + RLS |
| `src/hooks/useIncome.ts` | New hook — `useIncome`, `useAddIncome`, `useUpdateIncome`, `useDeleteIncome` |
| `src/components/AddIncomeDialog.tsx` | New dialog — Add income entry |
| `src/components/EditIncomeDialog.tsx` | New dialog — Edit / delete income entry |
| `src/components/IncomeList.tsx` | New component — monthly list with navigation, mirrors `TransactionList` |
| `src/pages/Index.tsx` | Add "Income" tab to bottom nav, add income data to Stats tab |
| `src/components/BudgetOverview.tsx` | Add net savings summary card at the top |

## Feature Details

### New `income` hook (`src/hooks/useIncome.ts`)

Follows the exact same pattern as `useTransactions.ts`:

- `useIncome()` — queries `income` table ordered by date descending
- `useAddIncome()` — insert with `user_id`
- `useUpdateIncome()` — update by id
- `useDeleteIncome()` — delete by id

### Add Income Dialog (`src/components/AddIncomeDialog.tsx`)

A dialog triggered by a green "+ Add Income" button. Fields:

- **Amount** (required, > 0)
- **Currency** — same multi-currency selector using `useCurrencyConversion`, stored as SGD
- **Date** (required)
- **Source** — free text field (e.g. "Salary", "Freelance", "Investment", "Bonus")
- **Description** (optional)
- **Notes** (optional)

Form validation shows inline error messages matching the transaction dialog pattern.

### Edit Income Dialog (`src/components/EditIncomeDialog.tsx`)

Opened by clicking a row in IncomeList. Shows all fields pre-filled. Includes a delete button (using the existing `DeleteConfirmButton` pattern for two-step confirmation).

### Income List (`src/components/IncomeList.tsx`)

Mirrors `TransactionList`:

- Month navigation (back/forward chevrons, current month label)
- Entries grouped by date
- Each row shows: description or source, amount (green), source badge, date
- Click a row to open `EditIncomeDialog`
- Shows "No income this month" when empty

### Income Tab (bottom nav)

A fourth tab added between "Transactions" and "Stats":

```text
[ Dashboard ]  [ Transactions ]  [ Income ]  [ Stats ]
```

Uses the `TrendingUp` icon from lucide-react. The tab body renders:
- "+ Add Income" button at top
- `IncomeList` below

### Stats Tab Enhancement

At the top of `BudgetOverview`, a new summary card shows net savings for the selected period:

```text
┌──────────────────────────────────┐
│  Income      Spending    Savings  │
│  $5,200      $3,100      $2,100  │
└──────────────────────────────────┘
```

- Income and Savings numbers are passed in from `Index.tsx` alongside the existing `transactions` and `categories` props
- `BudgetOverview` receives a new optional `income` prop of type `IncomeEntry[]`
- The savings card is only shown when there is at least one income entry for the period

## Technical Notes

- Currency conversion reuses the existing `useCurrencyConversion` hook — no new external calls
- Income amounts are stored in SGD (matching the transactions approach), with `original_amount` and `original_currency` stored for display
- The `income` query key is `["income", user?.id]` to scope per-user and invalidate correctly
- The four-tab bottom nav stays within `max-w-4xl` — each tab gets `flex-1` just like the current three tabs
- `BudgetOverview` gets an optional `income?: IncomeEntry[]` prop — the net savings row only renders when the prop is provided and non-empty, so no existing snapshot tests or display breaks

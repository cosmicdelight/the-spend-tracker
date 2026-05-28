# Add "Expense Date" to Transactions

## Goal

Separate **when the card was charged** from **when the activity actually happens**. The existing `date` field keeps representing the charge/transaction date (used for credit card spend tracking). A new `expense_date` field represents when the spend "belongs" for budgeting and statistics.

Example: buying a concert ticket today for a show 2 months later → `date` = today (counts toward this period's card target), `expense_date` = concert month (counts toward that month's budget).

## Behavior

- **Optional field.** When left blank, it defaults to the transaction date — existing flows are unchanged for users who don't care.
- **Backfill:** all existing transactions get `expense_date = date`.
- **Credit card trackers:** keep using `date` (no change).
- **Budget, dashboard metrics, statistics charts, and Transactions list grouping:** switch to `expense_date`.
- **Transactions list rows:** grouped/displayed under `expense_date`. When `expense_date ≠ date`, the row shows a small "Charged: <date>" subtitle so the original transaction date stays visible.
- **CSV import:** add an optional `expense_date` column; falls back to `date` when missing/empty.
- **Recurring transactions:** generated rows set `expense_date = date` (same as today's behavior — users can edit later if needed).

## Changes

### Database (migration)
- `ALTER TABLE transactions ADD COLUMN expense_date date`.
- Backfill: `UPDATE transactions SET expense_date = date WHERE expense_date IS NULL`.
- `ALTER COLUMN expense_date SET NOT NULL` and `SET DEFAULT CURRENT_DATE`.
- Index on `(user_id, expense_date)` to keep month filters fast.
- Update recurring-transaction generation (edge function) to set `expense_date = date` on insert.

### UI
- **AddTransactionDialog / EditTransactionDialog:** new optional "Expense date" date picker, placed under the existing Date field, with helper text "Defaults to transaction date. Use this if the spend belongs to a different month (e.g. concert tickets bought in advance)." Empty value → submit as `date`.
- **TransactionList:** group by `expense_date`; month/year selector filters by `expense_date`; when `expense_date ≠ date`, render a small muted "Charged <Mon d>" line under the description.
- **BudgetOverview, Dashboard metric cards (Charged/Personal/Others Owe), SpendingTrendsChart, Statistics donuts/trends:** filter and bucket by `expense_date` instead of `date`.
- **ImportTransactionsDialog / csvImport.ts:** accept optional `expense_date` column; default to `date` when missing.

### Types & hooks
- Extend `Transaction` interface in `useTransactions.ts` with `expense_date: string`.
- Mutations (`useAddTransaction`, `useUpdateTransaction`) pass through `expense_date`.

## Notes

- Credit-card period logic in `creditCardPeriod.ts` and `CreditCardProgress.tsx` continues to use `date` — explicitly verified, no change needed.
- The dashboard "Charged this month" card semantically tracks card activity, but per your answer it will move to `expense_date`. Flagging this so you can confirm during review — if you'd rather keep that one card on `date`, it's a one-line tweak.

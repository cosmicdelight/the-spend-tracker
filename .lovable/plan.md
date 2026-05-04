## Goal

Change recurring transactions from an open-ended schedule (with cron auto-generation or manual "Create now" trigger) into a **fixed-count batch**: when the user creates a recurring transaction, they pick how many times it should repeat (e.g. 12), and **all occurrences are generated immediately** as real rows in `transactions` / `income`, with their `date` fields spaced by the chosen frequency. Future-dated rows then naturally appear in the Expenses (and Income) tab.

## UX changes

### Add Recurring Transaction dialog (`AddRecurringTransactionDialog.tsx`)
- Replace the **Auto-generate** switch with a new required field: **Number of occurrences** (numeric input, min 1, max 60, default 12).
- Keep: Total Amount, Your Share, Frequency (weekly/monthly), Day of Week / Day of Month (informational — the actual dates are derived from "Start date"), Start date (rename "Next Due Date" → "Start date"), Payment Mode, Credit Card, Category/Sub-category, Description, Notes.
- On submit: generate N transactions client-side and bulk-insert into `transactions`. Show success toast like "Created 12 transactions". Do **not** insert anything into `recurring_transactions`.

### Add Recurring Income dialog (`AddRecurringIncomeDialog.tsx`)
- Same treatment: add **Number of occurrences**, remove **Auto-generate**, bulk-insert into `income`.

### Expenses tab (`TransactionList.tsx`)
- Already groups by `date` and supports navigating months via the month/year selectors. Future-dated transactions will automatically appear when the user pages forward. No code change required for them to show up.
- Small enhancement: when the **current** month is selected, the date-group headers for future dates within that month will already show. Consider a subtle "Upcoming" badge for `tx.date > today` rows. (Optional — flagged for confirmation.)

### Dashboard
- The dashboard "Total Charged / Personal Spend" computation filters by current month based on `tx.date`, so future months in the same calendar year are excluded automatically — but **future dates within the current month will be included** in the totals. We'll filter those out by adding `&& d <= today` to the `monthlyTxs` filter so dashboard totals only reflect actual spend to date.
- Remove the **Recurring Transactions** section from the dashboard (`RecurringTransactionList`) since templates no longer exist.

### Removed surfaces
- `AddRecurringTransactionDialog` and `AddRecurringIncomeDialog` will no longer create rows in `recurring_transactions`. They become "batch generators".
- Remove `RecurringTransactionList`, `useRecurringTransactions`, `useDeleteRecurringTransaction`, `useCreateFromRecurring` from `Index.tsx` and from the codebase (files deleted).
- Remove the `process-recurring-transactions` edge function and any associated cron job (no longer needed).

## Technical details

### Date generation
Helper in the dialogs:
```ts
function generateDates(start: string, frequency: "weekly" | "monthly", count: number): string[] {
  const dates: string[] = [];
  const base = new Date(start + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    if (frequency === "weekly") d.setDate(base.getDate() + 7 * i);
    else d.setMonth(base.getMonth() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}
```

### Bulk insert
Use a single `supabase.from("transactions").insert([...rows])` call (or `income`) so all N rows are created atomically from the user's perspective. On success, invalidate `["transactions"]` (or `["income"]`) react-query cache.

### Files to edit
- `src/components/AddRecurringTransactionDialog.tsx` — replace auto-generate switch with occurrences input; bulk-insert into `transactions` directly via `supabase` client; remove `useAddRecurringTransaction` import.
- `src/components/AddRecurringIncomeDialog.tsx` — same treatment for `income`.
- `src/pages/Index.tsx` — remove recurring-template imports, the `<RecurringTransactionList>` block on the dashboard, and tweak `monthlyTxs` filter to exclude future-dated transactions from current-month totals.

### Files to delete
- `src/components/RecurringTransactionList.tsx`
- `src/hooks/useRecurringTransactions.ts`
- `supabase/functions/process-recurring-transactions/`

### Database
- No schema migration required to make the new flow work — we simply stop writing to `recurring_transactions`.
- The `recurring_transactions` table can stay in place (preserving any existing user data) but becomes unused. We will **not** drop it as part of this change to avoid data loss; we can revisit later if desired.
- If a cron job exists that calls `process-recurring-transactions`, it can be left dormant after the function is removed (it will simply no-op / 404). Mention this to the user.

## Open question

1. Do you want a visual marker (e.g. an "Upcoming" badge or muted styling) on future-dated transactions in the Expenses list, or should they look identical to past ones?
2. Should the dashboard "current month" totals include future-dated transactions in the same month, or only spend up to today (plan currently assumes the latter)?

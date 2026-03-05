# Codebase Review - The Spend Tracker

## Overview
The Spend Tracker is a React application built with Vite, Tailwind CSS, and Shadcn UI, using Supabase for the backend. It allows users to track expenses and income, manage budget categories, and handle recurring transactions.

## Potential Bugs & Issues

### 1. CSV Import - Missing `original_amount`
In `src/components/ImportTransactionsDialog.tsx`, the expense import logic does not set `original_amount`. Since the database column has a default of `0`, all imported expenses will show as `0` in their original currency amount, even if the converted SGD amount is correct.

### 2. Basic CSV Parsing
The `parseCSVLines` function in `src/lib/csvImport.ts` uses a simple `.split(",")`. This will fail if any CSV field contains a comma (e.g., a description like `"Dinner, with friends"`). A more robust CSV parser that handles quoted strings should be used.

### 3. Recurring Transactions Edge Function
The Supabase edge function `process-recurring-transactions` does not account for the `transaction_type` column. It inserts all due recurring transactions into the `transactions` table, effectively treating recurring income as an expense. It should branch based on `transaction_type` and insert into either `transactions` or `income`.

### 4. Timezone Sensitivity in Date Filtering
`src/pages/Index.tsx` and `src/components/BudgetOverview.tsx` filter transactions by month using `new Date(t.date)`. Since `t.date` is an ISO date string (YYYY-MM-DD), `new Date()` interprets it as UTC midnight. Depending on the user's local timezone, `d.getMonth()` might return the previous month (e.g., March 1st UTC is Feb 28th/29th in many US timezones).

### 5. Manual Recurring Transaction Advancement
When a user manually triggers a recurring transaction via "Create Now" in the UI (`useCreateFromRecurring` in `src/hooks/useRecurringTransactions.ts`), the `next_due_date` and `last_generated_at` of the recurring transaction are not updated. This could lead to duplicate transactions if the auto-generate function runs later.

### 6. Performance of Client-side Suggestions
`useDescriptionSuggestions` and `useCategoryFromDescription` in `src/hooks/useTransactions.ts` iterate over the entire transaction list on every render (memoized, but still O(N)). For users with thousands of transactions, this could cause UI lag.

### 7. Hardcoded Currency in Income Import
The income import logic in `ImportTransactionsDialog.tsx` hardcodes `"SGD"` as the `original_currency`. While reasonable for a default, it lacks the flexibility to support multi-currency income imports if they were to be added.

### 8. Redundant Toasters
As noted in the `IMPLEMENTATION_PLAN.md`, the project includes both Radix `Toaster` and Sonner, but primarily uses Radix via `useToast`.

---

## Architectural Observations

### State Management
The app uses `@tanstack/react-query` effectively for server state. Local UI state is handled with standard `useState`.

### Security (RLS)
Supabase Row Level Security (RLS) is enabled on all tables, ensuring users can only access their own data. However, client-side hooks like `useUpdateTransaction` could still benefit from adding `user_id` to their filters as a defensive measure.

### Component Structure
Some components, like `AddTransactionDialog.tsx` and `Index.tsx`, are becoming quite large and handle multiple responsibilities (Expense vs. Income logic). Splitting these into smaller, dedicated components would improve maintainability.

### Currency Conversion
Currency conversion is handled via the Frankfurter API with a client-side cache. If the API is unavailable, it defaults to 1:1 conversion without a clear warning to the user other than "loading rates...".

## Recommended Improvements (Short-term)
1.  **Fix CSV Import**: Ensure `original_amount` is set.
2.  **Fix Edge Function**: Update `process-recurring-transactions` to handle `income` type.
3.  **Improve Date Parsing**: Use manual string splitting (`t.date.split('-')`) for month/year filtering to avoid timezone shifts.
4.  **Advance Recurring Schedule**: Update the recurring transaction record when manually creating a transaction from it.

## Add "Settled Up" tracking for split expenses

Track whether friends have paid back their share of split expenses, with an indicator in the list and a quick filter for unsettled items.

### Scope rule
The field only exists/appears when the transaction is a split — i.e., `personal_amount < amount` (you covered more than your share). For non-split transactions, the field is hidden and irrelevant.

### Database
- Add `settled_up boolean NOT NULL DEFAULT false` to `public.transactions`.
- Backfill: leave existing rows as `false` (user can mark them later).
- No new index needed (filtering is client-side over already-loaded transactions, consistent with current patterns).

### Add / Edit Transaction dialogs
- In `AddTransactionDialog.tsx` and `EditTransactionDialog.tsx`: when the split section is active and "Your share" < total amount, render a `Checkbox` labeled **"Settled up"** with helper sub-text *"Friends have paid back their share."*
- If the split is removed or share equals total, the value is forced back to `false` on save.
- Default for new split transactions: `false` (unsettled).

### Transaction list (`TransactionList.tsx`)
- **Indicator per row**: for split transactions, show a small badge next to the "Yours: $X" line:
  - Unsettled → amber/warning badge **"Owed"**
  - Settled → muted check badge **"Settled"**
  - Clicking the badge toggles `settled_up` directly (optimistic update via `useUpdateTransaction`), so the user can mark things paid without opening the edit dialog.
- **Filter control**: add a small toggle button in the card header row (next to the month selector area) labeled **"Unsettled only"**. When active:
  - Filters the list to transactions where `personal_amount < amount AND settled_up = false`.
  - Visually highlighted (e.g., `variant="default"` when on, `outline` when off).
  - Works alongside the existing month selector and search.

### Dashboard "Others Owe You" metric
- Update the metric in `Index.tsx` so settled-up splits are excluded from the "Others Owe You" total. This keeps the number accurate to what's actually still outstanding.

### Types
- Add `settled_up: boolean` to the `Transaction` interface in `src/hooks/useTransactions.ts`.
- `src/integrations/supabase/types.ts` regenerates automatically after the migration.

### Files to edit
- New migration (add column + grants already in place)
- `src/hooks/useTransactions.ts`
- `src/components/AddTransactionDialog.tsx`
- `src/components/EditTransactionDialog.tsx`
- `src/components/TransactionList.tsx`
- `src/pages/Index.tsx`

### Out of scope
- No separate "settlements ledger" or per-friend tracking — this is a single boolean per transaction, matching the existing app's lightweight model.
- CSV import column for `settled_up` — can add later if needed.

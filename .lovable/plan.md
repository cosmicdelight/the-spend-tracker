

## Tap Date Header to Add Transaction with That Date

### What it does
Tapping a date header (e.g. "Wednesday, Mar 5") in the transaction list opens the Add Transaction dialog with that date pre-filled, making it quick to add a forgotten expense on a past date.

### Changes

**1. `src/components/AddTransactionDialog.tsx`**
- Add an optional `initialDate?: string` prop (YYYY-MM-DD format)
- Add optional `externalOpen?: boolean` and `onExternalOpenChange?: (open: boolean) => void` props to allow controlled open state from parent
- When opening with `initialDate`, set the date field to that value instead of today
- Reset to today's date in `resetAll()`

**2. `src/components/TransactionList.tsx`**
- Add state for `addTxDate` (string | null) to track which date header was tapped
- Make the date header (`<p>` element on line 132) clickable with cursor-pointer styling and a subtle hover effect
- On click, set `addTxDate` to that date string
- Render `AddTransactionDialog` in controlled mode, passing `initialDate={addTxDate}` and managing open/close via the new state
- Add a small `+` icon next to the date to hint at the interaction

**3. Files changed**
- `src/components/AddTransactionDialog.tsx` — add `initialDate`, `externalOpen`, `onExternalOpenChange` props
- `src/components/TransactionList.tsx` — clickable date headers, render controlled AddTransactionDialog


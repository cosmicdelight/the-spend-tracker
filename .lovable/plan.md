
# Description Field Auto-suggest

## What's being built

A new `DescriptionAutocomplete` component that replaces the plain `<Input>` for the Description field in both `AddTransactionDialog` and `EditTransactionDialog`. As you type, a dropdown appears below showing matching descriptions from your past transactions, sorted by most recent. Clicking a suggestion fills the field. The field still works as a normal text input when no matches exist or you dismiss the dropdown.

## Behaviour

- Suggestions appear after typing 1+ characters
- Filtered case-insensitively against all unique past descriptions
- Sorted by most recently used (most recent transaction date first)
- Max 6 suggestions shown at a time to keep the list compact
- Clicking a suggestion sets the value and closes the dropdown
- Pressing Escape closes the dropdown
- Keyboard navigation (Up/Down arrows, Enter to select) for accessibility
- Clicking outside closes the dropdown

## Technical approach

### New component: `src/components/DescriptionAutocomplete.tsx`

A self-contained component that accepts:
- `value` / `onChange` — works identically to a normal input
- `suggestions` — the deduplicated, pre-sorted list of past descriptions passed in from the dialog

It renders:
- A standard `<Input>` for typing
- A `<div>` dropdown (not a Popover, to avoid z-index/portal complications inside the dialog's scroll container) positioned below the input using `relative`/`absolute` CSS
- Suggestion items styled consistently with the rest of the app (`bg-popover`, `hover:bg-accent`, `border`, `rounded-md`, `shadow`)

### Hook addition: `useDescriptionSuggestions` (inside `useTransactions.ts`)

A simple derived hook that:
1. Reads the already-cached `transactions` query data (no extra network request)
2. Deduplicates descriptions
3. Sorts by most recent `date`
4. Returns the sorted unique string array

### Dialog changes

Both `AddTransactionDialog` and `EditTransactionDialog`:
- Import `useTransactions` (already imported in the hooks file, just need to call it in the dialog) and `useDescriptionSuggestions`
- Replace the Description `<Input>` with `<DescriptionAutocomplete>`

No database changes required — suggestions are derived from already-fetched transaction data.

## Files changed

| File | Change |
|---|---|
| `src/components/DescriptionAutocomplete.tsx` | New component |
| `src/hooks/useTransactions.ts` | Add `useDescriptionSuggestions` export |
| `src/components/AddTransactionDialog.tsx` | Swap Description input for new component |
| `src/components/EditTransactionDialog.tsx` | Swap Description input for new component |

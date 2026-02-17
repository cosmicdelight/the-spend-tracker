

# Simplify Transaction Card Layout

## Changes to `src/components/TransactionList.tsx`

1. **Swap category and description placement**
   - Row 1: Description (primary text) + Amount on the right
   - Row 2: Category badge + payment mode as secondary info

2. **Remove card name** from the metadata line (the `credit_card_id` lookup display)

3. **Remove edit and delete buttons entirely** -- the pencil icon button and the `DeleteConfirmButton` component
   - Clicking anywhere on the transaction card already opens the Edit dialog, which is sufficient
   - The `DeleteConfirmButton` import can be removed

4. **Keep the Edit dialog** -- it already supports editing; we just need to ensure users can also delete from within it (already handled by `EditTransactionDialog`)

### Result layout per transaction:
```text
+------------------------------------------+
| Test lunch                       $63.10  |
| Food & Dining · Cash        Yours: $50   |
+------------------------------------------+
```

Only `src/components/TransactionList.tsx` needs to be modified.


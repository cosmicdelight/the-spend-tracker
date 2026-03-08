

## Merge Categories / Sub-categories

### What it does
A new "Merge" action lets users combine two categories (or two sub-categories) into one. All existing transactions/income/recurring templates referencing the source are reassigned to the target, and the source category row is deleted.

### Two merge scenarios

1. **Merge category groups** — merge all items under category A into category B. Updates `transactions.category`, `income.category`, `recurring_transactions.category` from A→B, moves all `budget_categories` rows with `name=A` into `name=B` (deduplicating sub-categories), then deletes leftover source rows.

2. **Merge sub-categories** — within the same parent category, merge sub-category X into sub-category Y. Updates `transactions.sub_category`, `income.sub_category`, `recurring_transactions.sub_category` from X→Y (scoped to that category), then deletes the source `budget_categories` row.

### Implementation

**1. New hook: `useMergeBudgetCategoryGroup`** in `useBudgetCategories.ts`
- Takes `{ sourceName, targetName }`.
- Updates `transactions`, `income`, `recurring_transactions` where `category = sourceName` → `targetName`.
- Updates `budget_categories` rows: for each source sub-category, if a matching sub already exists under target, delete the source row; otherwise update `name` to `targetName`.
- Invalidates `budget_categories`, `transactions`, `income`, `recurring_transactions` queries.

**2. New hook: `useMergeBudgetSubCategory`** in `useBudgetCategories.ts`
- Takes `{ categoryName, sourceSubName, targetSubName }`.
- Updates `sub_category` in `transactions`, `income`, `recurring_transactions` where `category = categoryName` and `sub_category = sourceSubName`.
- Deletes the source `budget_categories` row.
- Invalidates relevant queries.

**3. New dialog: `MergeCategoryDialog.tsx`**
- A dialog with two modes (category group merge / sub-category merge), determined by props.
- For group merge: a searchable select dropdown listing all other category group names as the merge target.
- For sub-category merge: a dropdown listing sibling sub-categories as the target.
- Shows a confirmation message: "All transactions in [source] will be moved to [target]. This cannot be undone."
- Confirm button triggers the appropriate merge hook.

**4. UI integration in `Categories.tsx`**
- Add a "Merge" icon button (e.g. `Merge` or `GitMerge` from lucide-react) next to each category group header and each sub-category row.
- Clicking opens the `MergeCategoryDialog` with the source pre-filled.
- Button is hidden if there's only one category group (or one sub-category in the group) since there's nothing to merge into.

### Files changed
- `src/hooks/useBudgetCategories.ts` — add `useMergeBudgetCategoryGroup` and `useMergeBudgetSubCategory`
- `src/components/MergeCategoryDialog.tsx` — new dialog component
- `src/pages/Categories.tsx` — add merge buttons wired to the dialog


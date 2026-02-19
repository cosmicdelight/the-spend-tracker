
## Smart Category Resolution During CSV Import

### What's being built

After a user uploads a CSV file, the import flow will add a new "Category Review" step. Before showing the final preview table, the app checks every category (and sub-category) in the CSV against the user's existing categories. Any that are unrecognised are surfaced for the user to act on — either mapping them to an existing category or creating them as new ones. Only after all categories are resolved does the user reach the import confirmation.

---

### How the resolution logic works

**Step 1 — Collect unique pairs from the CSV**
After parsing the CSV, extract all unique `(category, sub_category)` pairs.

**Step 2 — Compare against existing categories**
For each CSV pair, check the user's existing `budget_categories` (or `income_categories`) for:
- **Exact match** → no action needed, mark as resolved.
- **Similar match** (case-insensitive, or partial string match like "food" ↔ "Food & Dining") → prompt the user to confirm the mapping or pick a different one.
- **No match at all** → prompt the user to either create a new category or map it manually.

**Step 3 — User resolves each unrecognised pair**
A new "Category Review" screen appears inside the existing dialog. Each unrecognised pair is shown as a card:
- If a similar category was found, a dropdown pre-selects the closest match. The user can accept, change the selection, or choose "Create new".
- If no similar category was found, the card defaults to "Create new" but the user can pick any existing category instead.

**Step 4 — Apply resolutions before import**
When the user clicks "Confirm & Import":
1. Any category marked "Create new" is inserted into `budget_categories` / `income_categories` via the existing `supabase.from(...).insert(...)` pattern (using the `useAddBudgetCategory` / `useAddIncomeCategory` hooks).
2. The in-memory parsed rows are remapped so their `category` / `sub_category` fields reflect the chosen mapping.
3. The normal bulk insert into `transactions` / `income` proceeds as today.

---

### Dialog flow (multi-step inside the same Dialog)

```text
Step 1 — Upload        Step 2 — Review Categories     Step 3 — Preview & Import
┌──────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
│ Expense / Income │   │ 3 categories need review │   │ 42 rows ready            │
│ toggle           │ → │                          │ → │ [data table preview]     │
│ [Choose file]    │   │ "Food" → ? [dropdown]    │   │ [Import 42 expenses]     │
│ Download tpl.    │   │ "Salary" → ? [dropdown]  │   └──────────────────────────┘
└──────────────────┘   │ [Confirm & continue]     │
                       └──────────────────────────┘
```

If all CSV categories already have exact matches, Step 2 is skipped automatically.

---

### Similarity matching algorithm

A lightweight string similarity function (no external library needed) will be used:
- Lowercase both strings.
- Check if one string **contains** the other, or if they share significant words (split on spaces, check overlap ≥ 1 word).
- Score the match; only surface it as a "suggestion" if the score is above a threshold (avoids false positives like "Food" ↔ "Salary").

---

### Technical implementation

**Files to modify:**
- `src/components/ImportTransactionsDialog.tsx` — main changes. Add:
  - A `step` state (`"upload" | "review" | "preview"`).
  - A `CategoryResolution` type: `{ csvCategory: string; csvSubCategory: string | null; action: "map" | "create"; mappedTo: string | null; mappedSubTo: string | null }`.
  - A `resolutions` state map keyed by `"category||sub_category"`.
  - A `CategoryReviewStep` inline component rendered during Step 2.
  - Updated `handleImport` to create new categories first, then remap rows.

**Hooks used (already exist, no new hooks needed):**
- `useBudgetCategories()` — reads existing expense categories.
- `useIncomeCategories()` — reads existing income categories.
- `useAddBudgetCategory()` — creates new expense categories.
- `useAddIncomeCategory()` — creates new income categories.

**No database migrations needed** — category tables already exist with the correct schema.

---

### Edge cases handled

| Scenario | Behaviour |
|---|---|
| All CSV categories already exist (exact match) | Step 2 is skipped; go straight to preview |
| User picks "Create new" for a sub-category but the parent doesn't exist yet | Parent category row is also inserted automatically |
| Two different CSV categories resolve to the same existing category | Rows are remapped correctly; no duplicates created |
| User goes Back from Step 2 to change the file | Resolutions are cleared and recalculated |
| Parse errors exist alongside unrecognised categories | Errors are shown on Step 1; Step 2 only shows valid rows |


# Spend by Credit Card in Stats

Add a new "Spend by Card" card to the Stats tab that breaks down spend per credit card for any month (or year), so past periods can be reviewed — not just the current month.

## What it looks like

- New card placed in the Stats tab, below the budget breakdown.
- It follows the Stats tab's existing period selector (Month/Year toggle + back/forward arrows), so switching to May 2026 updates the card breakdown too.
- One row per credit card that had spend in the selected period:
  - Card name, total charged in that period, and share of total card spend (percentage + slim bar).
  - Cards with no spend in the period are hidden; hidden-from-dropdown cards still appear.
- A row for non-card spend (cash / other payment modes) and a row for card transactions with no card assigned ("Unassigned"), so the totals reconcile.
- Tapping a card row expands a list of that period's transactions for that card (date, description, amount), clicking a transaction opens the edit dialog — same interaction pattern as the category breakdown.
- Empty state when no transactions exist in the period.

## Amount basis

- Uses the full charged amount (not personal share), matching the Dashboard card trackers.
- Groups by transaction date (the card-statement date), not expense date, again matching the card trackers.
- This is a plain calendar month/year breakdown; it does not use each card's rolling target period, so it stays comparable across cards. Minimum-target / cap progress remains on the Dashboard and Manage Cards pages.

## Technical notes

- New component `src/components/SpendByCardBreakdown.tsx` taking `cards`, `transactions`, and the selected `view`/`selectedMonth`/`selectedYear` values as props.
- Rendered from `src/components/BudgetOverview.tsx`, reusing its existing period state; no new state or data fetching beyond passing `cards` through.
- `src/pages/Index.tsx` passes the already-loaded `cards` from `useCreditCards()` into `BudgetOverview`.
- No database or schema changes.

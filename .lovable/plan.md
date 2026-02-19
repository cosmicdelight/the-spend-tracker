## Display Income in the Stats Tab

### What exists today

The Stats tab (`BudgetOverview.tsx`) currently:

- Shows a **Net Savings summary card** (Income / Spending / Savings) when income exists for the period — this is already working correctly with the mock data.
- Shows a **Monthly/Annual Budget card** with a spending pie chart + category list.
- Shows a **Spending Trends line chart** (`SpendingTrendsChart`) — expense lines only, income not passed in.

Income is already fetched and passed into `BudgetOverview` as `income={income}`, but it's only used for the three-number summary. There's no visual breakdown of income by category and no income trend line.

The mock data covers Sep 2025–Feb 2026 with four categories: **Salary & Employment** (Base, Bonus, Commission), **Investments** (Dividends, Interest), **Rental Income**, and **Other**.

---

### What will be built

**1. Income Breakdown Card** (new, inserted below the Spending Trends card)

- A donut pie chart of income grouped by category for the selected period, using the same month/year navigation state already shared by the spending card.
- A list below the chart showing each category with a coloured percentage badge and total amount, expandable to reveal sub-categories (e.g. Base, Bonus under Salary & Employment).
- A "Total Income: $X" header above the chart.
- If no income exists for the period: shows a quiet "No income this month/year yet" message.
- Uses distinct green tones for the colour palette to visually separate income from expenses.

**2. Income Trend Line in SpendingTrendsChart**

- The `SpendingTrendsChart` component receives a new optional `income?: IncomeEntry[]` prop.
- Monthly income totals are computed inside the existing `useMemo` and added as an `"Income"` key on each data row.
- A single thick green line (`hsl(140, 55%, 42%)`) is always rendered at the top of the chart when income data is present — regardless of which expense category filter is selected.
- The category filter pills do not affect the income line visibility (it stays on always as a reference).
- The legend and tooltip both label it as "Income" and show it in green.

**3. Wire-up in BudgetOverview**

- Pass `income={income}` down to `<SpendingTrendsChart>`.

---

### Files to modify


| File                                     | Change                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/components/BudgetOverview.tsx`      | Add `incomeGrouped` memo; add Income Breakdown card section; pass `income` to SpendingTrendsChart       |
| `src/components/SpendingTrendsChart.tsx` | Accept `income` prop; add Income data key to chart rows; render fixed green Income line; update tooltip |


No database changes. No new hooks.

---

### Visual layout after changes

```text
┌─────────────────────────────────────────┐
│  Income / Spending / Savings            │  ← existing Net Savings card
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Monthly Budget     [Month | Year]      │  ← existing, unchanged
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Spending Trends   [3m | 6m | 12m]      │
│  ── Income (thick green)                │  ← NEW line, always on top
│  ── Total Spending (dark)               │
│  -- Food / Transport / ...              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Income Breakdown      [Feb ▾] [2026 ▾] │  ← NEW card (same nav state)
│  Total Income: $7,050                   │
│  ┌────── donut ──────┐                  │
│  │  (green tones)    │  Salary  74% $5,200 │
│  │                   │  Rental  17% $1,200 │
│  │                   │  Invest   6%  $450  │
│  └───────────────────┘  Other    3%  $200  │
└─────────────────────────────────────────┘
```

---

### Technical details

`**BudgetOverview.tsx**`

- Add `incomeGrouped` memo (mirrors the `grouped` memo for expenses): groups `filteredIncome` by `category`, sums amounts, collects sub-categories.
- Add a dedicated green `INCOME_COLORS` palette so the income pie is visually distinct from the spending pie.
- The income card reuses the same `PieChart`/`Cell` components already imported — no new dependencies.
- Expandable sub-category rows for income categories that have sub-categories (e.g. Salary → Base / Bonus / Commission).

`**SpendingTrendsChart.tsx**`

- Import `IncomeEntry` type from `@/hooks/useIncome`.
- In the `useMemo`, loop through income entries per period and accumulate into `row["Income"]`.
- Render `<Line dataKey="Income" stroke="hsl(140, 55%, 42%)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />` — placed before the expense lines so it renders behind them.
- In `CustomTooltip`, show Income value first (in green) with a `+` prefix to distinguish it.
- In the category filter pill list, Income is not added as a filter button — it's always shown.
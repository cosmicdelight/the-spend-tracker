import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { format } from "date-fns";
import type { Transaction } from "@/hooks/useTransactions";
import type { IncomeEntry } from "@/hooks/useIncome";
import type { BudgetCategory } from "@/hooks/useBudgetCategories";

// The two chart cards and the edit dialog are irrelevant here and drag in recharts and
// Supabase hooks; the filter's effect on them is covered by spendFilter.test.ts.
vi.mock("@/components/SpendingTrendsChart", () => ({ default: () => null }));
vi.mock("@/components/SpendByCardBreakdown", () => ({ default: () => null }));
vi.mock("@/components/EditTransactionDialog", () => ({ default: () => null }));

// Stands in for the real menu so the test drives BudgetOverview's response to a filter
// rather than Radix's Popover, which needs pointer-capture polyfills under jsdom.
vi.mock("@/components/CategoryFilterMenu", () => ({
  default: ({ onChange }: { onChange: (next: unknown) => void }) => (
    <>
      <button
        type="button"
        onClick={() => onChange({ categories: new Set(["Dining"]), subs: new Set() })}
      >
        hide dining
      </button>
      <button
        type="button"
        onClick={() => onChange({ categories: new Set(["Dining", "Groceries"]), subs: new Set() })}
      >
        hide everything
      </button>
    </>
  ),
}));

import BudgetOverview from "@/components/BudgetOverview";

const today = format(new Date(), "yyyy-MM-dd");

const tx = (category: string, amount: number): Transaction =>
  ({
    id: `${category}-${amount}`,
    credit_card_id: null,
    amount,
    personal_amount: amount,
    date: today,
    expense_date: today,
    category,
    payment_mode: "cash",
    description: null,
    notes: null,
    sub_category: null,
    original_currency: "SGD",
    original_amount: amount,
    settled_up: false,
    created_at: today,
  }) as Transaction;

const income: IncomeEntry[] = [
  {
    id: "i1",
    user_id: "u1",
    amount: 1000,
    original_amount: 1000,
    original_currency: "SGD",
    date: today,
    category: "Salary",
    sub_category: null,
    description: null,
    notes: null,
    created_at: today,
  },
];

const categories: BudgetCategory[] = [
  { id: "c1", name: "Dining", sub_category_name: null, created_at: today },
  { id: "c2", name: "Groceries", sub_category_name: null, created_at: today },
];

function renderOverview() {
  return render(
    <BudgetOverview
      categories={categories}
      transactions={[tx("Dining", 400), tx("Groceries", 100)]}
      income={income}
      cards={[]}
    />,
  );
}

const hideDining = () => fireEvent.click(screen.getByRole("button", { name: /hide dining/i }));
const hideEverything = () => fireEvent.click(screen.getByRole("button", { name: /hide everything/i }));

describe("BudgetOverview net savings under a category filter", () => {
  it("shows income, spending and savings when nothing is filtered", () => {
    renderOverview();

    const card = within(screen.getByTestId("net-savings"));
    expect(card.getByText("$1000.00")).toBeInTheDocument();
    expect(card.getByText("$500.00")).toBeInTheDocument();
    expect(card.getByText("+$500.00")).toBeInTheDocument();
  });

  it("replaces the whole card with an explanation once a category is hidden", () => {
    // Income has its own category set and can't be filtered alongside spend, so
    // "unfiltered income - filtered spend" is not a smaller savings number, it's a wrong
    // one - and wrong in the flattering direction. Hiding Dining here would otherwise
    // report +$900.00 of savings that nobody made.
    renderOverview();

    hideDining();

    expect(screen.queryByTestId("net-savings")).not.toBeInTheDocument();
    expect(screen.queryByText("+$900.00")).not.toBeInTheDocument();
    expect(screen.getByText(/savings hidden while categories are filtered/i)).toBeInTheDocument();
  });

  it("drops the hidden category from the spending breakdown", () => {
    // The savings suppression keys off whether a filter is active, so it would still pass
    // if the rows themselves were never filtered. This pins the actual filtering.
    renderOverview();
    expect(screen.getByText("Dining")).toBeInTheDocument();

    hideDining();

    expect(screen.queryByText("Dining")).not.toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("says the filter is on rather than claiming there was no spending", () => {
    renderOverview();

    hideEverything();

    expect(screen.getByText(/no spending in the categories you're showing/i)).toBeInTheDocument();
    expect(screen.queryByText(/no spending this month yet/i)).not.toBeInTheDocument();
  });

  it("leaves the income breakdown alone", () => {
    // Only the derived savings figure is unsafe under a filter. Income reported on its
    // own terms is still true, so suppressing it too would hide something correct.
    renderOverview();

    hideDining();

    expect(screen.getByText(/income breakdown/i)).toBeInTheDocument();
  });

  it("brings the figures back from Show all", () => {
    renderOverview();

    hideDining();
    fireEvent.click(screen.getByRole("button", { name: /show all/i }));

    const card = within(screen.getByTestId("net-savings"));
    expect(card.getByText("+$500.00")).toBeInTheDocument();
  });
});

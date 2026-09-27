import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { format } from "date-fns";
import type { Transaction } from "@/hooks/useTransactions";
import { EMPTY_EXCLUSION, subKey, type CategoryExclusion } from "@/lib/spendFilter";

vi.mock("@/components/EditTransactionDialog", () => ({ default: () => null }));

import SpendByCardBreakdown from "@/components/SpendByCardBreakdown";
import SpendingTrendsChart from "@/components/SpendingTrendsChart";

const now = new Date();
const today = format(now, "yyyy-MM-dd");

const tx = (category: string, amount: number, sub: string | null = null): Transaction =>
  ({
    id: `${category}-${sub}-${amount}`,
    credit_card_id: null,
    amount,
    personal_amount: amount,
    date: today,
    expense_date: today,
    category,
    payment_mode: "cash",
    description: null,
    notes: null,
    sub_category: sub,
    original_currency: "SGD",
    original_amount: amount,
    settled_up: false,
    created_at: today,
  }) as Transaction;

const transactions = [tx("Dining", 400, "Cafes"), tx("Dining", 100, "Restaurants"), tx("Groceries", 250)];

const exclusion = (categories: string[] = [], subs: string[] = []): CategoryExclusion => ({
  categories: new Set(categories),
  subs: new Set(subs),
});

function renderCards(ex: CategoryExclusion) {
  return render(
    <SpendByCardBreakdown
      cards={[]}
      transactions={transactions}
      view="month"
      selectedMonth={now.getMonth()}
      selectedYear={now.getFullYear()}
      periodLabel="This month"
      exclusion={ex}
    />,
  );
}

/** The headline figure, not the per-row value that happens to match it. */
const totalCharged = () =>
  within(screen.getByText("Total Charged").parentElement!).getByText(/^\$/);

describe("SpendByCardBreakdown honours the category filter", () => {
  it("charges the full period total when nothing is hidden", () => {
    renderCards(EMPTY_EXCLUSION);

    expect(totalCharged()).toHaveTextContent("$750.00");
  });

  it("drops a hidden category from the total", () => {
    renderCards(exclusion(["Dining"]));

    expect(totalCharged()).toHaveTextContent("$250.00");
    expect(screen.queryByText("$750.00")).not.toBeInTheDocument();
  });

  it("drops only the hidden sub-category", () => {
    renderCards(exclusion([], [subKey("Dining", "Cafes")]));

    expect(totalCharged()).toHaveTextContent("$350.00");
  });

  it("says the filter is on rather than claiming there was no spending", () => {
    renderCards(exclusion(["Dining", "Groceries"]));

    expect(screen.getByText(/no spending in the categories you're showing/i)).toBeInTheDocument();
    expect(screen.queryByText(/no spending this month yet/i)).not.toBeInTheDocument();
  });
});

describe("SpendingTrendsChart honours the category filter", () => {
  const renderTrends = (ex: CategoryExclusion) =>
    render(<SpendingTrendsChart transactions={transactions} exclusion={ex} />);

  it("offers a chip per category when nothing is hidden", () => {
    renderTrends(EMPTY_EXCLUSION);

    expect(screen.getByRole("button", { name: "Dining" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Groceries" })).toBeInTheDocument();
  });

  it("removes the chip for a hidden category", () => {
    renderTrends(exclusion(["Dining"]));

    expect(screen.queryByRole("button", { name: "Dining" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Groceries" })).toBeInTheDocument();
  });

  it("deselects a chip whose category is hidden after it was picked", () => {
    // Regression: the chip holds a category name. Hiding that category while it was
    // selected would leave a highlighted chip driving a chart with no line in it.
    const { rerender } = renderTrends(EMPTY_EXCLUSION);
    fireEvent.click(screen.getByRole("button", { name: "Dining" }));
    expect(screen.getByRole("button", { name: "Dining" })).toHaveAttribute("aria-pressed", "true");

    rerender(<SpendingTrendsChart transactions={transactions} exclusion={exclusion(["Dining"])} />);

    // "All" is the reset chip; it goes back to being the active one.
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does not resurrect the selection when the category comes back", () => {
    // Regression: activeCategory masked the render but selectedCategory kept the stale
    // name, so un-hiding the category snapped the chart back to one isolated line the
    // user had already watched deselect itself.
    const { rerender } = renderTrends(EMPTY_EXCLUSION);
    fireEvent.click(screen.getByRole("button", { name: "Dining" }));

    rerender(<SpendingTrendsChart transactions={transactions} exclusion={exclusion(["Dining"])} />);
    rerender(<SpendingTrendsChart transactions={transactions} exclusion={EMPTY_EXCLUSION} />);

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dining" })).toHaveAttribute("aria-pressed", "false");
  });

  it("blames the window, not a filter, when nothing is hidden", () => {
    // Regression: the empty state was unconditional, so an account whose spend predates
    // the rolling window read "No spending in the categories you're showing" with an
    // entirely empty exclusion, and went hunting for a filter to clear.
    const old = format(new Date(now.getFullYear() - 2, 0, 15), "yyyy-MM-dd");
    const stale = [{ ...tx("Dining", 100), date: old, expense_date: old }] as Transaction[];

    render(<SpendingTrendsChart transactions={stale} exclusion={EMPTY_EXCLUSION} />);

    expect(screen.getByText(/no spending in the last 6 months/i)).toBeInTheDocument();
    expect(screen.queryByText(/categories you're showing/i)).not.toBeInTheDocument();
  });

  it("says the filter is on rather than plotting flat zero lines", () => {
    renderTrends(exclusion(["Dining", "Groceries"]));

    expect(screen.getByText(/no spending in the categories you're showing/i)).toBeInTheDocument();
  });
});

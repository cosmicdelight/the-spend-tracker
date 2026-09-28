import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { format } from "date-fns";
import type { Transaction } from "@/hooks/useTransactions";
import type { TransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";

vi.mock("@/hooks/useTransactions", () => ({
  useUpdateTransaction: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useTransactionAttachments", () => ({
  useTransactionAttachmentIds: () => ({ data: new Set<string>() }),
}));
vi.mock("@/components/EditTransactionDialog", () => ({ default: () => null }));
vi.mock("@/components/AddTransactionDialog", () => ({ default: () => null }));

import TransactionList from "@/components/TransactionList";

const today = format(new Date(), "yyyy-MM-dd");

const prefs: TransactionFieldPrefs = {
  currency: false,
  creditCard: false,
  subCategory: false,
  notes: false,
  attachments: false,
  dailyTotals: false,
};

const tx = (n: number, over: Partial<Transaction> = {}): Transaction =>
  ({
    id: `tx-${n}`,
    credit_card_id: null,
    amount: 10,
    personal_amount: 10,
    date: today,
    expense_date: today,
    category: "Dining",
    payment_mode: "cash",
    description: `Coffee ${String(n).padStart(3, "0")}`,
    notes: null,
    sub_category: null,
    original_currency: "SGD",
    original_amount: 10,
    settled_up: false,
    created_at: today,
    ...over,
  }) as Transaction;

const renderList = (transactions: Transaction[]) =>
  render(<TransactionList transactions={transactions} cards={[]} fieldPrefs={prefs} />);

const typeSearch = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText(/Search by description/i), { target: { value: text } });

const rendered = () => screen.queryAllByText(/^Coffee \d{3}$/);

describe("TransactionList search", () => {
  it("caps a broad search and says how many it left out", async () => {
    // A two-letter query against a real account matches thousands of rows, and every one
    // of them mounts a card. That is the DOM work that makes typing stutter on a phone.
    renderList(Array.from({ length: 250 }, (_, i) => tx(i)));

    typeSearch("coffee");

    await waitFor(() => expect(rendered()).toHaveLength(200));
    expect(screen.getByText(/Showing the 200 most recent of 250 matches/)).toBeInTheDocument();
    expect(screen.getByText("Coffee 000")).toBeInTheDocument();
    expect(screen.queryByText("Coffee 249")).not.toBeInTheDocument();
  });

  it("shows every match when asked", async () => {
    // The cap keeps the common case fast; it must never put a row out of reach. Surveying
    // years of one merchant is a real thing to want, and a capped answer to that question
    // is a wrong answer.
    renderList(Array.from({ length: 250 }, (_, i) => tx(i)));

    typeSearch("coffee");
    await waitFor(() => expect(rendered()).toHaveLength(200));

    fireEvent.click(screen.getByRole("button", { name: "Show all 250" }));

    await waitFor(() => expect(rendered()).toHaveLength(250));
    expect(screen.getByText("Coffee 249")).toBeInTheDocument();
    expect(screen.getByText("Showing all 250 matches.")).toBeInTheDocument();
    expect(screen.queryByText(/Showing the 200 most recent/)).not.toBeInTheDocument();
  });

  it("re-applies the cap to the next search", async () => {
    // Regression: held as a boolean, one "Show all" would stay on for every later query,
    // so the next two-letter search would render every match it had — the exact stutter
    // the cap exists to prevent, now silently re-enabled.
    renderList([
      ...Array.from({ length: 250 }, (_, i) => tx(i)),
      ...Array.from({ length: 220 }, (_, i) =>
        tx(1000 + i, { description: `Tea ${String(i).padStart(3, "0")}` }),
      ),
    ]);

    typeSearch("coffee");
    await waitFor(() => expect(rendered()).toHaveLength(200));
    fireEvent.click(screen.getByRole("button", { name: "Show all 250" }));
    await waitFor(() => expect(rendered()).toHaveLength(250));

    typeSearch("tea");

    await waitFor(() => expect(screen.getByText(/Showing the 200 most recent of 220/)).toBeInTheDocument());
    expect(screen.queryAllByText(/^Tea \d{3}$/)).toHaveLength(200);
  });

  it("never caps the month view", async () => {
    // Regression: the cap must not leak into the unsearched list. Hiding rows a month
    // genuinely contains is the silent truncation #16 exists to prevent, and it would be
    // far harder to notice here than in the search results.
    renderList(Array.from({ length: 250 }, (_, i) => tx(i)));

    await waitFor(() => expect(rendered()).toHaveLength(250));
    expect(screen.queryByText(/Showing the 200 most recent/)).not.toBeInTheDocument();
  });

  it("says nothing about a cap when the matches fit", async () => {
    renderList(Array.from({ length: 5 }, (_, i) => tx(i)));

    typeSearch("coffee");

    await waitFor(() => expect(rendered()).toHaveLength(5));
    expect(screen.queryByText(/Showing the 200 most recent/)).not.toBeInTheDocument();
  });

  it("still matches on notes and sub-category, not just the description", async () => {
    renderList([
      tx(1, { notes: "reimbursed by Jo" }),
      tx(2, { sub_category: "Reimbursable" }),
      tx(3),
    ]);

    typeSearch("reimburs");

    await waitFor(() => expect(rendered()).toHaveLength(2));
    expect(screen.queryByText("Coffee 003")).not.toBeInTheDocument();
  });

  it("returns to the month view when the search is cleared", async () => {
    renderList([tx(1), tx(2, { description: "Tea 002" })]);

    typeSearch("coffee");
    await waitFor(() => expect(rendered()).toHaveLength(1));

    typeSearch("");
    await waitFor(() => expect(screen.getByText("Tea 002")).toBeInTheDocument());
    expect(rendered()).toHaveLength(1);
  });
});

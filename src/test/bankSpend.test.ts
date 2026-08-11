import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { getCurrentPeriod, getCurrentCardPeriod, filterTransactionsForCurrentPeriod } from "@/lib/creditCardPeriod";
import { getBankCards, filterTransactionsForBankPeriod } from "@/lib/bankSpend";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { Bank } from "@/hooks/useBanks";

const card = (over: Partial<CreditCard> & { id: string }): CreditCard => ({
  name: "Card",
  bank_id: null,
  spend_target: 0,
  spend_cap: null,
  time_period_months: 1,
  start_date: "2026-01-01",
  sort_order: 0,
  hidden_from_dropdown: false,
  created_at: "",
  updated_at: "",
  ...over,
});

const bank = (over: Partial<Bank> & { id: string }): Bank => ({
  name: "Bank",
  spend_target: 0,
  spend_cap: null,
  time_period_months: 1,
  start_date: "2026-01-01",
  sort_order: 0,
  created_at: "",
  updated_at: "",
  ...over,
});

/** Period bounds are local-midnight dates (parseISO), so compare them in local time. */
const day = (d: Date) => format(d, "yyyy-MM-dd");

const tx = (date: string, amount: number, credit_card_id: string | null) => ({
  date,
  amount,
  personal_amount: amount,
  credit_card_id,
});

describe("getCurrentPeriod", () => {
  it("steps forward to the period containing now", () => {
    const { periodStart, periodEnd } = getCurrentPeriod(
      { start_date: "2026-01-01", time_period_months: 1 },
      new Date("2026-03-15T12:00:00Z"),
    );
    expect(day(periodStart)).toBe("2026-03-01");
    expect(day(periodEnd)).toBe("2026-04-01");
  });

  it("handles multi-month periods", () => {
    const { periodStart, periodEnd } = getCurrentPeriod(
      { start_date: "2026-01-01", time_period_months: 3 },
      new Date("2026-05-10T12:00:00Z"),
    );
    expect(day(periodStart)).toBe("2026-04-01");
    expect(day(periodEnd)).toBe("2026-07-01");
  });

  it("uses the first period when now is before the start date", () => {
    const { periodStart, daysElapsed } = getCurrentPeriod(
      { start_date: "2026-06-01", time_period_months: 1 },
      new Date("2026-05-01T12:00:00Z"),
    );
    expect(day(periodStart)).toBe("2026-06-01");
    expect(daysElapsed).toBe(0);
  });

  it("card wrapper delegates to the generic period", () => {
    const c = card({ id: "c1", start_date: "2026-01-01", time_period_months: 1 });
    const now = new Date("2026-03-15T12:00:00Z");
    expect(getCurrentCardPeriod(c, now)).toEqual(getCurrentPeriod(c, now));
  });
});

describe("filterTransactionsForCurrentPeriod (card)", () => {
  it("keeps only this card's transactions inside the current period", () => {
    const c = card({ id: "c1", start_date: "2026-01-01", time_period_months: 1 });
    const now = new Date("2026-03-15T12:00:00Z");
    const txs = [
      tx("2026-03-02", 10, "c1"), // in period, this card
      tx("2026-03-20", 20, "c1"), // in period, this card
      tx("2026-02-28", 40, "c1"), // previous period
      tx("2026-03-05", 80, "c2"), // in period, other card
      tx("2026-03-06", 160, null), // in period, not a card
    ];
    const result = filterTransactionsForCurrentPeriod(c, txs, now);
    expect(result.reduce((s, t) => s + t.amount, 0)).toBe(30);
  });
});

describe("bank spend", () => {
  const b = bank({ id: "b1", start_date: "2026-01-01", time_period_months: 1 });
  const cards = [
    card({ id: "c1", bank_id: "b1" }),
    card({ id: "c2", bank_id: "b1" }),
    card({ id: "c3", bank_id: "b2" }),
    card({ id: "c4", bank_id: null }),
  ];

  it("getBankCards returns only the bank's cards", () => {
    expect(getBankCards(b, cards).map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("sums across every card in the bank, within the bank's period", () => {
    const now = new Date("2026-03-15T12:00:00Z");
    const txs = [
      tx("2026-03-02", 10, "c1"), // counted
      tx("2026-03-09", 20, "c2"), // counted (second card, same bank)
      tx("2026-03-30", 40, "c1"), // counted (still inside March)
      tx("2026-02-27", 80, "c1"), // excluded: previous period
      tx("2026-03-04", 160, "c3"), // excluded: other bank
      tx("2026-03-04", 320, "c4"), // excluded: no bank
      tx("2026-03-04", 640, null), // excluded: not a card transaction
    ];
    const result = filterTransactionsForBankPeriod(b, cards, txs, now);
    expect(result.reduce((s, t) => s + t.amount, 0)).toBe(70);
  });

  it("respects the bank's own period, independent of its cards' periods", () => {
    // Bank runs quarterly from Feb 1; cards are monthly from Jan 1.
    const quarterly = bank({ id: "b1", start_date: "2026-02-01", time_period_months: 3 });
    const now = new Date("2026-03-15T12:00:00Z");
    const txs = [
      tx("2026-02-05", 10, "c1"), // inside Feb–May bank period
      tx("2026-03-05", 20, "c2"), // inside
      tx("2026-01-20", 40, "c1"), // before the bank's first period
    ];
    const result = filterTransactionsForBankPeriod(quarterly, cards, txs, now);
    expect(result.reduce((s, t) => s + t.amount, 0)).toBe(30);
  });

  it("returns nothing when the bank has no cards", () => {
    const empty = bank({ id: "b9" });
    const txs = [tx("2026-03-02", 10, "c1")];
    expect(filterTransactionsForBankPeriod(empty, cards, txs, new Date("2026-03-15T12:00:00Z"))).toEqual([]);
  });
});

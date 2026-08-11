import type { Bank } from "@/hooks/useBanks";
import type { CreditCard } from "@/hooks/useCreditCards";
import { filterTransactionsForPeriod } from "./creditCardPeriod";

/** The cards assigned to a bank, in their existing sort order. */
export function getBankCards(bank: Bank, cards: CreditCard[]): CreditCard[] {
  return cards.filter((c) => c.bank_id === bank.id);
}

/**
 * Transactions charged to any of a bank's cards within the bank's current period.
 * Uses the transaction (statement) date, matching the card trackers.
 */
export function filterTransactionsForBankPeriod<T extends { date: string; credit_card_id: string | null }>(
  bank: Bank,
  cards: CreditCard[],
  transactions: T[],
  now: Date = new Date(),
): T[] {
  const cardIds = new Set(getBankCards(bank, cards).map((c) => c.id));
  return filterTransactionsForPeriod(
    bank,
    transactions,
    (t) => t.credit_card_id != null && cardIds.has(t.credit_card_id),
    now,
  );
}

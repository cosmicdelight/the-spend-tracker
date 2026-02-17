import { addMonths, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import type { CreditCard } from "@/hooks/useCreditCards";

/**
 * For a recurring credit card period, find the current active period window.
 * E.g. start_date=2026-01-01, time_period_months=1 → periods are Jan, Feb, Mar...
 * Returns { periodStart, periodEnd, daysLeft, totalDays, daysElapsed }
 */
export function getCurrentCardPeriod(card: CreditCard, now: Date = new Date()) {
  const start = parseISO(card.start_date);
  const months = card.time_period_months;

  // Find which period we're in by stepping forward from start_date
  let periodStart = start;
  let periodEnd = addMonths(start, months);

  // If now is before the first period even starts, use the first period
  if (isBefore(now, start)) {
    return {
      periodStart: start,
      periodEnd,
      daysLeft: differenceInDays(periodEnd, now),
      totalDays: differenceInDays(periodEnd, start),
      daysElapsed: 0,
    };
  }

  // Step forward until we find the period containing `now`
  while (isAfter(now, periodEnd) || now >= periodEnd) {
    periodStart = periodEnd;
    periodEnd = addMonths(periodStart, months);
  }

  const totalDays = differenceInDays(periodEnd, periodStart);
  const daysElapsed = differenceInDays(now, periodStart);
  const daysLeft = Math.max(differenceInDays(periodEnd, now), 0);

  return { periodStart, periodEnd, daysLeft, totalDays, daysElapsed };
}

/**
 * Filter transactions to only those within the current card period.
 */
export function filterTransactionsForCurrentPeriod<T extends { date: string; credit_card_id: string | null }>(
  card: CreditCard,
  transactions: T[],
  now: Date = new Date(),
): T[] {
  const { periodStart, periodEnd } = getCurrentCardPeriod(card, now);
  return transactions.filter((t) => {
    if (t.credit_card_id !== card.id) return false;
    const txDate = parseISO(t.date);
    return txDate >= periodStart && txDate < periodEnd;
  });
}

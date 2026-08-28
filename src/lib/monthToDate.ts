import { parseISO } from "date-fns";
import { formatLocalDate } from "./localDate";

export interface DatedRow {
  date: string;
  expense_date?: string | null;
}

/**
 * Rows falling in the calendar month containing `now`, up to and including today.
 *
 * Every date here is handled in the viewer's local calendar, end to end. `parseISO` is
 * what makes that true for the stored values: `new Date("2026-08-01")` parses a
 * date-only string as UTC midnight, which in a negative UTC offset is still the
 * previous day locally — so reading `.getMonth()` off it drops every transaction dated
 * the first of the month out of that month's totals.
 */
export function filterMonthToDate<T extends DatedRow>(rows: T[], now: Date = new Date()): T[] {
  const month = now.getMonth();
  const year = now.getFullYear();
  const todayStr = formatLocalDate(now);
  return rows.filter((row) => {
    const key = row.expense_date || row.date;
    const d = parseISO(key);
    return d.getMonth() === month && d.getFullYear() === year && key <= todayStr;
  });
}

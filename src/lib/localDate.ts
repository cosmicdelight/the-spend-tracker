import { format } from "date-fns";

/**
 * A date as YYYY-MM-DD in the viewer's own timezone.
 *
 * Deliberately not `toISOString().split("T")[0]`, which is UTC: east of Greenwich that
 * still reads yesterday for the first hours of the day. At UTC+8 it means "today" is
 * wrong until 08:00 local, so a same-day transaction compared against it looks like it
 * is in the future and drops out of the dashboard totals.
 *
 * Transaction dates are stored as plain YYYY-MM-DD calendar days with no time or zone,
 * so the only correct thing to compare them against is the viewer's local calendar day.
 *
 * Delegates to date-fns rather than hand-rolling the parts: `format` is already the
 * codebase's date formatter, pads years below 1000 to four digits, and throws on an
 * invalid date instead of returning "NaN-NaN-NaN" — a string that sorts after every
 * real date and would silently defeat the `<=` comparisons this feeds.
 */
export function formatLocalDate(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

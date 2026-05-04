/**
 * Generate a sequence of ISO date strings (YYYY-MM-DD) starting at `start`,
 * spaced by `frequency`. Used to materialize recurring transactions/income.
 *
 * Timezone behavior: `start` is parsed at local midnight (`T00:00:00`) and
 * each result is formatted from the local Y/M/D parts, so dates remain stable
 * regardless of the runner's timezone (no UTC drift across DST or offsets).
 */
export function generateRecurringDates(
  start: string,
  frequency: "weekly" | "monthly",
  count: number,
): string[] {
  const dates: string[] = [];
  const base = new Date(start + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    if (frequency === "weekly") d.setDate(base.getDate() + 7 * i);
    else d.setMonth(base.getMonth() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

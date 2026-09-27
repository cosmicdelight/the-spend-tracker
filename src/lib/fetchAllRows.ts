/**
 * Reads every row of a query, a page at a time.
 *
 * PostgREST refuses to return more than `db-max-rows` in one response — 1000 on Supabase
 * by default — and it does so *silently*: no error, no flag, just a shorter array than
 * the table holds. A `.select("*")` with no range therefore looks like it works right up
 * until an account crosses the threshold, and then quietly starts hiding data.
 *
 * That is not hypothetical here. The transactions query ran unbounded for months; by the
 * time it was noticed the account had 5,288 rows and the app could see exactly 1,000 of
 * them. Everything dated before the cutoff had vanished from search, from the stats tab,
 * and from the month views — including transactions saved seconds earlier, if they
 * carried an older date.
 */

/** Supabase's default `db-max-rows`. Requesting more per page just gets you this many. */
export const SUPABASE_MAX_ROWS = 1000;

/**
 * Guard against looping forever if a page never comes back short — a server that ignored
 * `Range` would otherwise spin here until the tab died.
 */
const MAX_PAGES = 100;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Calls `page` with successive ranges until it returns a short page.
 *
 * **The query `page` builds must have a total order.** Postgres makes no promise about
 * the relative order of rows that tie on every ORDER BY column, so with a non-unique sort
 * a row can land in two different pages, or in none — losing rows while looking like it
 * worked. End the sort on something unique, normally the primary key.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = SUPABASE_MAX_ROWS,
): Promise<T[]> {
  const all: T[] = [];

  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * pageSize;
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;

    const rows = data ?? [];
    all.push(...rows);

    // A short page means the end of the table. An exactly-full one is ambiguous, so it
    // costs one more request to find out.
    if (rows.length < pageSize) return all;
  }

  throw new Error(
    `fetchAllRows gave up after ${MAX_PAGES} pages of ${pageSize}. The query is either ` +
      `enormous or the server is ignoring the requested range.`,
  );
}

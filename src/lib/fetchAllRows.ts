/**
 * Reads every row of a query, without assuming one response can carry them all.
 *
 * PostgREST refuses to return more than `db-max-rows` in a single response — 1000 on
 * Supabase by default — and it does so *silently*: no error, no flag, just a shorter
 * array than the table holds. A `.select("*")` with no range therefore looks correct
 * right up until an account crosses the threshold, and then quietly starts hiding data.
 *
 * That is not hypothetical here. The transactions query ran unbounded for months; by the
 * time it was noticed the account had 5,288 rows and the app could see exactly 1,000 of
 * them. Everything older had vanished from search, from the stats tab and from every
 * month view — including transactions saved seconds earlier, if they carried an old date.
 */

/** Supabase's default `db-max-rows`. Asking for more per page just gets you this many. */
export const SUPABASE_MAX_ROWS = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
  /** Row count for the whole query. Required — see the note in `fetchAllRows`. */
  count?: number | null;
}

/**
 * Fetches one page, learns the total from it, then fetches the rest in parallel.
 *
 * **The query must request a count** (`.select("*", { count: "exact" })`). Without one
 * there is no way to tell a short page caused by the end of the table from a short page
 * caused by the server's own cap — and guessing wrong is silent truncation, which is the
 * single thing this function exists to prevent. It throws rather than guess.
 *
 * The stride comes from how many rows the first response actually carried, not from
 * `pageSize`. `db-max-rows` is server configuration: a stack that caps at 500 answers a
 * request for 1000 with 500, and a helper that assumed otherwise would leave a gap in
 * every subsequent range.
 *
 * **The query must also have a total order.** Postgres makes no promise about the
 * relative order of rows tying on every ORDER BY column, so with a non-unique sort a row
 * can land in two pages or in none. End the sort on something unique, normally the id.
 *
 * Offset paging over a table being written to concurrently can still shift under us; the
 * pages go out together precisely to keep that window as small as possible. For a
 * single-user app the exposure is a few milliseconds.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = SUPABASE_MAX_ROWS,
): Promise<T[]> {
  const first = await page(0, pageSize - 1);
  const head = rowsOf(first);

  // An empty table needs nothing further, whatever the count says.
  if (head.length === 0) return head;

  const total = first.count;
  if (total === undefined || total === null) {
    throw new Error(
      "fetchAllRows needs a row count to know when to stop. Build the query with " +
        '.select(columns, { count: "exact" }).',
    );
  }

  // One page held everything. The common case, and it costs a single request.
  if (head.length >= total) return head;

  const stride = head.length;
  const pending: PromiseLike<PageResult<T>>[] = [];
  for (let from = stride; from < total; from += stride) {
    pending.push(page(from, from + stride - 1));
  }

  const rest = await Promise.all(pending);
  const all = head.slice();
  for (const result of rest) {
    all.push(...rowsOf(result));
  }
  return all;
}

/**
 * Unwraps one response, refusing anything ambiguous.
 *
 * A null payload with no error is treated as a fault rather than an empty page. Returning
 * what had arrived so far would be exactly the silent truncation being fixed, reached by
 * a different route.
 */
function rowsOf<T>(result: PageResult<T>): T[] {
  if (result.error) throw result.error;
  if (result.data === null) {
    throw new Error("fetchAllRows: the query returned no data and no error.");
  }
  return result.data;
}

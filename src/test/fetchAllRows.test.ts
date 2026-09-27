import { describe, it, expect, vi } from "vitest";
import { fetchAllRows, SUPABASE_MAX_ROWS } from "@/lib/fetchAllRows";

/**
 * A fake table that answers range requests the way PostgREST does, including its own
 * server-side cap on how many rows one response may carry.
 */
const table = (total: number, serverCap = Infinity) => {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: [number, number][] = [];
  const page = (from: number, to: number) => {
    calls.push([from, to]);
    const window = Math.min(to - from + 1, serverCap);
    return Promise.resolve({ data: rows.slice(from, from + window), error: null, count: total });
  };
  return { rows, calls, page };
};

describe("fetchAllRows", () => {
  it("makes one request when the table fits in a page", async () => {
    const t = table(10);

    const all = await fetchAllRows(t.page, 1000);

    expect(all).toHaveLength(10);
    expect(t.calls).toEqual([[0, 999]]);
  });

  it("does not pay for a second request just to discover the end", async () => {
    // The count tells it the table is exhausted, so the common case stays one round trip
    // even when the first page comes back exactly full.
    const t = table(1000);

    const all = await fetchAllRows(t.page, 1000);

    expect(all).toHaveLength(1000);
    expect(t.calls).toHaveLength(1);
  });

  it("reads a table several pages long", async () => {
    // 5,288 is the real size of the account that surfaced the truncation.
    const t = table(5288);

    const all = await fetchAllRows(t.page, 1000);

    expect(all).toHaveLength(5288);
    expect(all.map((r) => r.id)).toEqual(t.rows.map((r) => r.id));
  });

  it("fetches the pages after the first concurrently", async () => {
    // Serialised, six round trips sit on the critical path before anything renders.
    let inFlight = 0;
    let peak = 0;
    const rows = Array.from({ length: 5000 }, (_, i) => ({ id: i }));
    const page = async (from: number, to: number) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return { data: rows.slice(from, to + 1), error: null, count: rows.length };
    };

    await fetchAllRows(page, 1000);

    expect(peak).toBeGreaterThan(1);
  });

  it("keeps reading when the server caps below the requested page size", async () => {
    // Regression: the stride used to come from pageSize. A stack whose db-max-rows is
    // lower answers a 1000-row request with 500, the short page read as end-of-table, and
    // the helper returned 500 of 5,288 rows reporting success — the very truncation it
    // exists to prevent, one layer up.
    const t = table(5288, 500);

    const all = await fetchAllRows(t.page, 1000);

    expect(all).toHaveLength(5288);
    expect(all.map((r) => r.id)).toEqual(t.rows.map((r) => r.id));
  });

  it("asks for windows the capped server can actually fill", async () => {
    const t = table(1200, 500);

    await fetchAllRows(t.page, 1000);

    // First request probes with pageSize, the rest use the stride the server revealed.
    expect(t.calls).toEqual([
      [0, 999],
      [500, 999],
      [1000, 1499],
    ]);
  });

  it("handles an empty table without needing a count", async () => {
    const page = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

    expect(await fetchAllRows(page, 1000)).toEqual([]);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it("throws the query's error instead of returning a partial list", async () => {
    const boom = { message: "connection reset" };
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null, count: 2000 })
      .mockResolvedValueOnce({ data: null, error: boom, count: 2000 });

    await expect(fetchAllRows(page, 1000)).rejects.toBe(boom);
  });

  it("throws on a null payload rather than calling it the end of the table", async () => {
    // Regression: `data ?? []` made a null indistinguishable from an empty final page, so
    // a fault mid-run returned a short list that every caller treated as complete.
    const page = vi.fn().mockResolvedValue({ data: null, error: null, count: 10 });

    await expect(fetchAllRows(page, 1000)).rejects.toThrow(/no data and no error/);
  });

  it("refuses to run without a count rather than guessing where to stop", async () => {
    // Regression: an arbitrary page ceiling used to turn an oversized table into a thrown
    // error and a blank screen. With a count there is nothing to guess and no ceiling.
    const page = vi
      .fn()
      .mockResolvedValue({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null });

    await expect(fetchAllRows(page, 1000)).rejects.toThrow(/needs a row count/);
  });

  it("defaults to Supabase's own cap", async () => {
    const t = table(1);

    await fetchAllRows(t.page);

    expect(SUPABASE_MAX_ROWS).toBe(1000);
    expect(t.calls).toEqual([[0, 999]]);
  });
});

import { describe, it, expect, vi } from "vitest";
import { fetchAllRows, SUPABASE_MAX_ROWS } from "@/lib/fetchAllRows";

/** A fake table of `total` rows that answers range requests the way PostgREST does. */
const table = (total: number) => {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: [number, number][] = [];
  const page = (from: number, to: number) => {
    calls.push([from, to]);
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
  };
  return { rows, calls, page };
};

describe("fetchAllRows", () => {
  it("makes one request when the table is smaller than a page", async () => {
    const t = table(10);

    const all = await fetchAllRows(t.page, 1000);

    expect(all).toHaveLength(10);
    expect(t.calls).toEqual([[0, 999]]);
  });

  it("keeps paging until a short page comes back", async () => {
    // The case that matters: 5,288 rows is what the real account held while the app was
    // showing exactly 1,000 of them.
    const t = table(5288);

    const all = await fetchAllRows(t.page, 1000);

    expect(all).toHaveLength(5288);
    expect(t.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [3000, 3999],
      [4000, 4999],
      [5000, 5999],
    ]);
  });

  it("returns rows in page order, without gaps or repeats", async () => {
    const t = table(2500);

    const all = await fetchAllRows(t.page, 1000);

    expect(all.map((r) => r.id)).toEqual(t.rows.map((r) => r.id));
  });

  it("spends one extra request when the total is an exact multiple of the page size", async () => {
    // A full page is indistinguishable from the last page, so it has to ask again.
    const t = table(2000);

    const all = await fetchAllRows(t.page, 1000);

    expect(all).toHaveLength(2000);
    expect(t.calls).toHaveLength(3);
  });

  it("handles an empty table", async () => {
    const t = table(0);

    expect(await fetchAllRows(t.page, 1000)).toEqual([]);
  });

  it("throws the query's error instead of returning a partial list", async () => {
    // Returning what arrived so far would be the silent truncation this helper exists to
    // stop, just with extra steps.
    const boom = { message: "connection reset" };
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null })
      .mockResolvedValueOnce({ data: null, error: boom });

    await expect(fetchAllRows(page, 1000)).rejects.toBe(boom);
  });

  it("treats a null data with no error as the end", async () => {
    const page = vi.fn().mockResolvedValue({ data: null, error: null });

    expect(await fetchAllRows(page, 1000)).toEqual([]);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it("gives up rather than looping forever on a server that ignores the range", async () => {
    const page = vi
      .fn()
      .mockResolvedValue({ data: Array.from({ length: 10 }, (_, i) => ({ id: i })), error: null });

    await expect(fetchAllRows(page, 10)).rejects.toThrow(/gave up after 100 pages/);
  });

  it("defaults to Supabase's own cap", async () => {
    const t = table(1);

    await fetchAllRows(t.page);

    expect(SUPABASE_MAX_ROWS).toBe(1000);
    expect(t.calls).toEqual([[0, 999]]);
  });
});

import { describe, it, expect } from "vitest";
import { filterMonthToDate } from "@/lib/monthToDate";
import { withTZ } from "./tz";

const row = (date: string) => ({ date, expense_date: null });

describe("filterMonthToDate", () => {
  it("counts a transaction dated today during the early-morning UTC gap", () => {
    // Regression: todayStr came from toISOString(), so at 07:00 SGT it still read
    // 2026-08-24 and a transaction dated today looked like it was in the future.
    const kept = withTZ("Asia/Singapore", () =>
      filterMonthToDate([row("2026-08-25")], new Date(2026, 7, 25, 7, 0))
    );
    expect(kept).toHaveLength(1);
  });

  it("keeps counting it after the gap closes", () => {
    const kept = withTZ("Asia/Singapore", () =>
      filterMonthToDate([row("2026-08-25")], new Date(2026, 7, 25, 9, 0))
    );
    expect(kept).toHaveLength(1);
  });

  it("keeps a first-of-month transaction in that month west of Greenwich", () => {
    // Regression: new Date("2026-08-01") is UTC midnight, which in New York is
    // 2026-07-31 20:00 local, so getMonth() reported July and the row vanished.
    const kept = withTZ("America/New_York", () =>
      filterMonthToDate([row("2026-08-01")], new Date(2026, 7, 15, 12, 0))
    );
    expect(kept).toHaveLength(1);
  });

  it("excludes a future-dated transaction", () => {
    const kept = withTZ("Asia/Singapore", () =>
      filterMonthToDate([row("2026-08-26")], new Date(2026, 7, 25, 9, 0))
    );
    expect(kept).toHaveLength(0);
  });

  it("excludes other months", () => {
    const kept = withTZ("Asia/Singapore", () =>
      filterMonthToDate([row("2026-07-25"), row("2025-08-25")], new Date(2026, 7, 25, 9, 0))
    );
    expect(kept).toHaveLength(0);
  });

  it("prefers expense_date over date when present", () => {
    const kept = withTZ("Asia/Singapore", () =>
      filterMonthToDate(
        [{ date: "2026-07-30", expense_date: "2026-08-25" }],
        new Date(2026, 7, 25, 9, 0)
      )
    );
    expect(kept).toHaveLength(1);
  });
});

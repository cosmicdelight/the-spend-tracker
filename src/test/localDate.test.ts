import { describe, it, expect } from "vitest";
import { formatLocalDate } from "@/lib/localDate";

describe("formatLocalDate", () => {
  it("formats a date from its local calendar parts", () => {
    expect(formatLocalDate(new Date(2026, 7, 25, 7, 30))).toBe("2026-08-25");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatLocalDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("reports the local day just after local midnight", () => {
    // The case the dashboard got wrong: early morning, when a positive UTC offset means
    // toISOString() is still reporting the previous calendar day.
    const justAfterMidnight = new Date(2026, 7, 25, 0, 30);
    expect(formatLocalDate(justAfterMidnight)).toBe("2026-08-25");
  });

  it("follows local time rather than UTC when the two disagree", () => {
    const d = new Date(2026, 7, 25, 0, 30);
    const utcDay = d.toISOString().split("T")[0];
    // Only diverges when the runner is not on UTC; assert the divergence where it
    // exists, and the local answer everywhere.
    if (utcDay !== "2026-08-25") {
      expect(formatLocalDate(d)).not.toBe(utcDay);
    }
    expect(formatLocalDate(d)).toBe("2026-08-25");
  });

  it("defaults to now", () => {
    const now = new Date();
    expect(formatLocalDate()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    );
  });
});

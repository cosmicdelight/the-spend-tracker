import { describe, it, expect, vi, afterEach } from "vitest";
import { formatLocalDate } from "@/lib/localDate";
import { withTZ } from "./tz";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatLocalDate", () => {
  it("formats a date from its local calendar parts", () => {
    expect(formatLocalDate(new Date(2026, 7, 25, 7, 30))).toBe("2026-08-25");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatLocalDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("pads years below 1000 to four digits", () => {
    expect(formatLocalDate(new Date(999, 0, 5))).toBe("0999-01-05");
  });

  it("follows local time rather than UTC when the two disagree", () => {
    // Unconditional: the zone is pinned, so this asserts the divergence everywhere
    // rather than only on a developer machine that happens not to be on UTC.
    const { local, utc } = withTZ("Asia/Singapore", () => {
      const d = new Date(2026, 7, 25, 0, 30); // 00:30 SGT is 16:30Z the previous day
      return { local: formatLocalDate(d), utc: d.toISOString().split("T")[0] };
    });
    expect(utc).toBe("2026-08-24"); // the old behaviour, and why it was wrong
    expect(local).toBe("2026-08-25");
  });

  it("defaults to the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 25, 9, 0));
    expect(formatLocalDate()).toBe("2026-08-25");
  });

  it("throws on an invalid date rather than returning a malformed string", () => {
    // "NaN-NaN-NaN" would sort after every real date and silently defeat the `<=`
    // comparisons this feeds.
    expect(() => formatLocalDate(new Date("nonsense"))).toThrow(RangeError);
  });
});

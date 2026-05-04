import { describe, it, expect } from "vitest";
import { generateRecurringDates } from "@/lib/recurringDates";

describe("generateRecurringDates", () => {
  describe("weekly", () => {
    it("generates the requested number of dates spaced 7 days apart", () => {
      const dates = generateRecurringDates("2026-01-01", "weekly", 4);
      expect(dates).toEqual([
        "2026-01-01",
        "2026-01-08",
        "2026-01-15",
        "2026-01-22",
      ]);
    });

    it("crosses month boundaries correctly", () => {
      const dates = generateRecurringDates("2026-01-29", "weekly", 3);
      expect(dates).toEqual(["2026-01-29", "2026-02-05", "2026-02-12"]);
    });

    it("crosses year boundaries correctly", () => {
      const dates = generateRecurringDates("2026-12-25", "weekly", 3);
      expect(dates).toEqual(["2026-12-25", "2027-01-01", "2027-01-08"]);
    });

    it("handles count of 1 (just the start date)", () => {
      expect(generateRecurringDates("2026-06-15", "weekly", 1)).toEqual([
        "2026-06-15",
      ]);
    });

    it("returns empty array when count is 0", () => {
      expect(generateRecurringDates("2026-06-15", "weekly", 0)).toEqual([]);
    });
  });

  describe("monthly", () => {
    it("generates the requested number of dates one month apart", () => {
      const dates = generateRecurringDates("2026-01-15", "monthly", 4);
      expect(dates).toEqual([
        "2026-01-15",
        "2026-02-15",
        "2026-03-15",
        "2026-04-15",
      ]);
    });

    it("crosses year boundaries correctly", () => {
      const dates = generateRecurringDates("2026-11-10", "monthly", 4);
      expect(dates).toEqual([
        "2026-11-10",
        "2026-12-10",
        "2027-01-10",
        "2027-02-10",
      ]);
    });

    it("rolls forward when the day-of-month does not exist (Jan 31 -> Mar 3 in non-leap year)", () => {
      // JS Date semantics: setMonth(1) on Jan 31 yields Mar 3 in a non-leap year.
      // We document and lock in this behavior so it doesn't change unexpectedly.
      const dates = generateRecurringDates("2025-01-31", "monthly", 3);
      expect(dates).toEqual(["2025-01-31", "2025-03-03", "2025-03-31"]);
    });

    it("handles leap-year February correctly", () => {
      // 2024 is a leap year.
      const dates = generateRecurringDates("2024-01-31", "monthly", 3);
      expect(dates).toEqual(["2024-01-31", "2024-03-02", "2024-03-31"]);
    });

    it("handles 12 occurrences spanning a full year", () => {
      const dates = generateRecurringDates("2026-01-01", "monthly", 12);
      expect(dates).toHaveLength(12);
      expect(dates[0]).toBe("2026-01-01");
      expect(dates[11]).toBe("2026-12-01");
    });
  });

  describe("timezone behavior", () => {
    it("preserves the input calendar date (no off-by-one from UTC parsing)", () => {
      // A naive `new Date('2026-01-01')` parses as UTC midnight, which becomes
      // 2025-12-31 in negative-offset timezones. Using `T00:00:00` keeps it local.
      const dates = generateRecurringDates("2026-01-01", "weekly", 1);
      expect(dates[0]).toBe("2026-01-01");
    });

    it("preserves the calendar date for monthly schedules at the start of the month", () => {
      const dates = generateRecurringDates("2026-03-01", "monthly", 3);
      expect(dates).toEqual(["2026-03-01", "2026-04-01", "2026-05-01"]);
    });

    it("does not drift across a spring-forward DST transition (US: 2026-03-08)", () => {
      // Weekly schedule straddling DST. The local calendar day must remain stable.
      const dates = generateRecurringDates("2026-03-01", "weekly", 4);
      expect(dates).toEqual([
        "2026-03-01",
        "2026-03-08",
        "2026-03-15",
        "2026-03-22",
      ]);
    });

    it("does not drift across a fall-back DST transition (US: 2026-11-01)", () => {
      const dates = generateRecurringDates("2026-10-25", "weekly", 4);
      expect(dates).toEqual([
        "2026-10-25",
        "2026-11-01",
        "2026-11-08",
        "2026-11-15",
      ]);
    });

    it("monthly schedule does not drift across DST boundaries", () => {
      const dates = generateRecurringDates("2026-02-15", "monthly", 4);
      expect(dates).toEqual([
        "2026-02-15",
        "2026-03-15",
        "2026-04-15",
        "2026-05-15",
      ]);
    });

    it("returns dates in strict YYYY-MM-DD format", () => {
      const dates = generateRecurringDates("2026-01-05", "monthly", 3);
      for (const d of dates) {
        expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });
});

import { describe, it, expect } from "vitest";
import { isSplitExpense, resolveShare } from "@/lib/splitExpense";

describe("isSplitExpense", () => {
  it("treats a share of zero as a split", () => {
    // The reported bug: entering 0 in "Your Share" means you paid and someone else
    // owes all of it, so the settled-up checkbox must appear.
    expect(isSplitExpense(0, 100)).toBe(true);
  });

  it("treats a partial share as a split", () => {
    expect(isSplitExpense(50, 100)).toBe(true);
    expect(isSplitExpense(0.01, 100)).toBe(true);
    expect(isSplitExpense(99.99, 100)).toBe(true);
  });

  it("is not a split when you paid your whole share", () => {
    expect(isSplitExpense(100, 100)).toBe(false);
  });

  it("is not a split when the share exceeds the total", () => {
    // Note this only classifies; it does not prevent. Rejecting that input is the
    // submit handlers' job — see the share-vs-total check in both dialogs.
    expect(isSplitExpense(150, 100)).toBe(false);
  });

  it("is not a split on an empty form", () => {
    expect(isSplitExpense(0, 0)).toBe(false);
  });

  it("rejects a negative share rather than calling it a split", () => {
    // Defensive only: min="0" stops a negative share reaching the save path, so this
    // guards the live checkbox while someone is mid-typing.
    expect(isSplitExpense(-5, 100)).toBe(false);
    expect(isSplitExpense(-5, 0)).toBe(false);
  });
});

describe("resolveShare", () => {
  it("reads a blank share as the total, matching the placeholder", () => {
    expect(resolveShare("", 100)).toBe(100);
  });

  it("reads zero as zero rather than as blank", () => {
    expect(resolveShare("0", 100)).toBe(0);
    expect(resolveShare("0.00", 100)).toBe(0);
  });

  it("reads a normal value", () => {
    expect(resolveShare("42.5", 100)).toBe(42.5);
  });

  it("reads unparseable input as the total, not as zero", () => {
    // Typing a decimal passes through these states. Reading them as 0 would flash the
    // settled-up checkbox on and off, since 0 is a legitimate split.
    expect(resolveShare(".", 100)).toBe(100);
    expect(resolveShare("-", 100)).toBe(100);
    expect(resolveShare("abc", 100)).toBe(100);
  });
});

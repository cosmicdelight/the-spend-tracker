import { describe, it, expect } from "vitest";
import { isSplitExpense } from "@/lib/splitExpense";

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
    expect(isSplitExpense(150, 100)).toBe(false);
  });

  it("is not a split on an empty form", () => {
    expect(isSplitExpense(0, 0)).toBe(false);
  });

  it("rejects a negative share rather than calling it a split", () => {
    // min=\"0\" on the input discourages this, but it is typeable before submit.
    expect(isSplitExpense(-5, 100)).toBe(false);
    expect(isSplitExpense(-5, 0)).toBe(false);
  });
});

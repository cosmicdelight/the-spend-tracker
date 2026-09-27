import { describe, it, expect } from "vitest";
import {
  NO_SUB,
  EMPTY_EXCLUSION,
  subKey,
  isExcluded,
  excludeCategories,
  buildFilterOptions,
  isFilterActive,
  excludedCount,
  isCategoryHidden,
  categoryState,
  toggleCategory,
  toggleSub,
  type CategoryExclusion,
} from "@/lib/spendFilter";

const tx = (category: string, sub: string | null = null) => ({ category, sub_category: sub });
const cat = (name: string, sub: string | null = null) => ({ name, sub_category_name: sub });

const exclusion = (categories: string[] = [], subs: string[] = []): CategoryExclusion => ({
  categories: new Set(categories),
  subs: new Set(subs),
});

describe("excludeCategories", () => {
  it("returns the same array when nothing is excluded", () => {
    // The identity fast path is load-bearing: three components run this inside a useMemo
    // whose result feeds further memos. A fresh array would invalidate all of them on
    // every render for a filter nobody touched.
    const rows = [tx("Groceries"), tx("Dining", "Cafes")];

    expect(excludeCategories(rows, EMPTY_EXCLUSION)).toBe(rows);
  });

  it("drops every row in an excluded category, including ones carrying a sub", () => {
    const rows = [tx("Dining", "Cafes"), tx("Dining", null), tx("Groceries")];

    const kept = excludeCategories(rows, exclusion(["Dining"]));

    expect(kept).toEqual([tx("Groceries")]);
  });

  it("drops only the named sub, leaving its siblings", () => {
    const rows = [tx("Dining", "Cafes"), tx("Dining", "Restaurants")];

    const kept = excludeCategories(rows, exclusion([], [subKey("Dining", "Cafes")]));

    expect(kept).toEqual([tx("Dining", "Restaurants")]);
  });

  it("drops the sub-less rows of a category when NO_SUB is excluded", () => {
    // Regression guard: NO_SUB must equal the sentinel BudgetOverview's `grouped` rollup
    // buckets null subs under. If the two drift, this slice becomes un-hideable.
    const rows = [tx("Dining", null), tx("Dining", "Cafes")];

    const kept = excludeCategories(rows, exclusion([], [subKey("Dining", null)]));

    expect(kept).toEqual([tx("Dining", "Cafes")]);
    expect(subKey("Dining", null)).toBe(subKey("Dining", NO_SUB));
  });

  it("hides a whole excluded category even when only one of its subs is listed", () => {
    const rows = [tx("Dining", "Cafes"), tx("Dining", "Restaurants")];

    const kept = excludeCategories(rows, exclusion(["Dining"], [subKey("Dining", "Cafes")]));

    expect(kept).toEqual([]);
  });
});

describe("subKey", () => {
  it("does not collide when a category name contains the delimiter shape", () => {
    // With a printable delimiter like "::", category "A::B" + sub "X" and category "A" +
    // sub "B::X" both encode to "A::B::X", so hiding one would silently hide the other.
    // Category and sub names are free text, so this is reachable, not theoretical.
    expect(subKey("A::B", "X")).not.toBe(subKey("A", "B::X"));
  });

  it("distinguishes a sub named like the NO_SUB sentinel from a genuinely null sub", () => {
    // Both encode the same on purpose — a sub literally named "(no sub-category)" is
    // indistinguishable from none, and treating them as one thing is the honest outcome.
    expect(subKey("Dining", NO_SUB)).toBe(subKey("Dining", null));
  });
});

describe("isExcluded", () => {
  it("reports a sub as excluded when its parent category is", () => {
    expect(isExcluded(exclusion(["Dining"]), "Dining", "Cafes")).toBe(true);
  });

  it("reports nothing as excluded under an empty filter", () => {
    expect(isExcluded(EMPTY_EXCLUSION, "Dining", "Cafes")).toBe(false);
    expect(isFilterActive(EMPTY_EXCLUSION)).toBe(false);
  });
});

describe("buildFilterOptions", () => {
  it("offers a category that exists only on transactions", () => {
    // transactions.category is denormalised text with no foreign key, so a deleted
    // category, a CSV import, or the 'Uncategorized' column default can name a category
    // with no budget_categories row. Offering only the table's rows would leave that
    // spend permanently unreachable by the filter.
    const options = buildFilterOptions([cat("Dining", "Cafes")], [tx("Uncategorized")]);

    expect(options.map((o) => o.name)).toEqual(["Dining", "Uncategorized"]);
  });

  it("de-duplicates the constraint-free budget_categories table", () => {
    // budget_categories has no unique constraint, so duplicate (name, sub) rows exist.
    const options = buildFilterOptions(
      [cat("Dining", "Cafes"), cat("Dining", "Cafes"), cat("Dining", "Restaurants")],
      [],
    );

    expect(options).toEqual([{ name: "Dining", subs: ["Cafes", "Restaurants"] }]);
  });

  it("offers NO_SUB only where spend actually has no sub", () => {
    const options = buildFilterOptions(
      [cat("Dining", "Cafes"), cat("Travel", "Flights")],
      [tx("Dining", null), tx("Travel", "Flights")],
    );

    expect(options.find((o) => o.name === "Dining")!.subs).toContain(NO_SUB);
    expect(options.find((o) => o.name === "Travel")!.subs).not.toContain(NO_SUB);
  });

  it("sorts NO_SUB last within a category", () => {
    const options = buildFilterOptions([], [tx("Dining", null), tx("Dining", "Cafes")]);

    expect(options[0].subs).toEqual(["Cafes", NO_SUB]);
  });
});

describe("toggleCategory", () => {
  it("clears that category's sub exclusions when the category is shown again", () => {
    // While a category is hidden its sub checkboxes are disabled, so a sub hidden earlier
    // is invisible to the user. Restoring it silently on re-show would hide spend with
    // nothing on screen to explain why.
    const hiddenSub = toggleSub(EMPTY_EXCLUSION, "Dining", "Cafes");
    const hiddenParent = toggleCategory(hiddenSub, "Dining");

    const shownAgain = toggleCategory(hiddenParent, "Dining");

    expect(isFilterActive(shownAgain)).toBe(false);
  });

  it("leaves another category's sub exclusions alone", () => {
    const ex = toggleSub(EMPTY_EXCLUSION, "Travel", "Flights");

    const next = toggleCategory(toggleCategory(ex, "Dining"), "Dining");

    expect(next.subs.has(subKey("Travel", "Flights"))).toBe(true);
  });
});

describe("isCategoryHidden", () => {
  it("separates a hidden category from one whose subs all happen to be hidden", () => {
    // The list disables sub checkboxes off this, not off categoryState: unticking the
    // last sub must not disable the boxes the user was just clicking.
    const option = { name: "Dining", subs: ["Cafes", "Restaurants"] };
    const allSubsHidden = exclusion([], [subKey("Dining", "Cafes"), subKey("Dining", "Restaurants")]);

    expect(categoryState(allSubsHidden, option)).toBe("hidden");
    expect(isCategoryHidden(allSubsHidden, "Dining")).toBe(false);
    expect(isCategoryHidden(exclusion(["Dining"]), "Dining")).toBe(true);
  });
});

describe("excludedCount", () => {
  it("counts a fully-sub-hidden category once, as the list renders it", () => {
    // Without the options the footer says "2 hidden" for what the list shows as one
    // hidden row, and the count disagrees with the thing directly above it.
    const option = { name: "Dining", subs: ["Cafes", "Restaurants"] };
    const ex = exclusion([], [subKey("Dining", "Cafes"), subKey("Dining", "Restaurants")]);

    expect(excludedCount(ex, [option])).toBe(1);
  });

  it("still counts a partially-hidden category's subs separately", () => {
    const option = { name: "Dining", subs: ["Cafes", "Restaurants"] };
    const ex = exclusion([], [subKey("Dining", "Cafes")]);

    expect(excludedCount(ex, [option])).toBe(1);
  });

  it("does not double-count subs of an already-hidden category", () => {
    const ex = exclusion(["Dining"], [subKey("Dining", "Cafes"), subKey("Travel", "Flights")]);

    expect(excludedCount(ex)).toBe(2);
  });

  it("counts nothing for an empty exclusion", () => {
    expect(excludedCount(EMPTY_EXCLUSION)).toBe(0);
  });
});

describe("categoryState", () => {
  const option = { name: "Dining", subs: ["Cafes", "Restaurants"] };

  it("is shown when nothing under it is excluded", () => {
    expect(categoryState(EMPTY_EXCLUSION, option)).toBe("shown");
  });

  it("is partial when only some subs are excluded", () => {
    expect(categoryState(exclusion([], [subKey("Dining", "Cafes")]), option)).toBe("partial");
  });

  it("is hidden when the category itself is excluded", () => {
    expect(categoryState(exclusion(["Dining"]), option)).toBe("hidden");
  });

  it("is hidden when every sub is individually excluded", () => {
    const ex = exclusion([], [subKey("Dining", "Cafes"), subKey("Dining", "Restaurants")]);

    expect(categoryState(ex, option)).toBe("hidden");
  });
});

/**
 * Category / sub-category exclusion for the Stats tab.
 *
 * The filter is subtractive: the user picks what to HIDE, and an empty exclusion means
 * everything is shown. That keeps the default state identical to the tab's behaviour
 * before the filter existed, so nothing can be hidden by accident.
 *
 * Nothing here touches dates. Each Stats card filters its own period on its own axis —
 * BudgetOverview on `expense_date || date`, SpendByCardBreakdown on `date` alone — and
 * those divergences are deliberate. This composes with whichever one a card uses.
 */

/**
 * Stand-in for a null `sub_category`.
 *
 * Must stay identical to the sentinel `BudgetOverview`'s `grouped` rollup uses, or a
 * category's "(no sub-category)" slice would be un-hideable: the filter would emit one
 * key and the rollup would bucket under another.
 */
export const NO_SUB = "(no sub-category)";

export interface CategoryExclusion {
  /** Whole categories hidden, by name. */
  categories: ReadonlySet<string>;
  /** Individual sub-categories hidden, as `subKey()` strings. */
  subs: ReadonlySet<string>;
}

export const EMPTY_EXCLUSION: CategoryExclusion = {
  categories: new Set<string>(),
  subs: new Set<string>(),
};

/**
 * NUL, not "::" or "|".
 *
 * Category and sub names are free text — typed by the user, or imported from a CSV — so
 * any printable delimiter can be part of a name. With "::" a category literally called
 * "Food::Snacks" would produce the same key as category "Food" plus sub "Snacks", and
 * hiding one would silently hide the other. NUL cannot appear in a Postgres text value.
 */
const SEP = "\u0000";

/** Encodes one (category, sub) pair. A null sub encodes as the NO_SUB sentinel. */
export function subKey(category: string, sub: string | null): string {
  return `${category}${SEP}${sub ?? NO_SUB}`;
}

function categoryOf(key: string): string {
  const i = key.indexOf(SEP);
  return i === -1 ? key : key.slice(0, i);
}

export function isFilterActive(ex: CategoryExclusion): boolean {
  return ex.categories.size > 0 || ex.subs.size > 0;
}

/**
 * Whether the category itself is hidden, as opposed to merely having all of its subs
 * hidden one by one.
 *
 * `categoryState` deliberately collapses both into "hidden" for the checkbox, but the two
 * must not be confused when deciding whether to disable the sub rows: disabling them
 * because the user unticked the last one takes away the control they were just using.
 */
export function isCategoryHidden(ex: CategoryExclusion, name: string): boolean {
  return ex.categories.has(name);
}

export function isExcluded(ex: CategoryExclusion, category: string, sub: string | null): boolean {
  // A whole-category exclusion wins outright, so a sub does not need its own entry for
  // the parent's checkbox to hide it.
  if (ex.categories.has(category)) return true;
  return ex.subs.has(subKey(category, sub));
}

/**
 * Drops excluded rows.
 *
 * Returns `rows` **by identity** when nothing is excluded. Three components run this
 * inside a `useMemo` whose result feeds further memos; handing back a fresh array on
 * every render would invalidate all of them for a filter nobody has touched.
 */
export function excludeCategories<T extends { category: string; sub_category: string | null }>(
  rows: T[],
  ex: CategoryExclusion,
): T[] {
  if (!isFilterActive(ex)) return rows;
  return rows.filter((row) => !isExcluded(ex, row.category, row.sub_category));
}

export interface FilterOption {
  name: string;
  subs: string[];
}

/**
 * The categories and sub-categories the filter can offer.
 *
 * Built from the union of `budget_categories` and whatever the transactions actually
 * carry. `transactions.category` is denormalised text with no foreign key, so a
 * transaction can name a category that has no row — a deleted category, a CSV import, or
 * the `'Uncategorized'` column default. Offering only the table's rows would leave that
 * spend permanently unreachable by the filter.
 *
 * Feed this the *unfiltered* transaction list. Built from the visible month instead, the
 * options would come and go as the user pages through periods, and an exclusion set in
 * March would quietly stop matching in April.
 *
 * `budget_categories` has no unique constraint, hence the de-duplication.
 */
export function buildFilterOptions(
  categories: { name: string; sub_category_name: string | null }[],
  transactions: { category: string; sub_category: string | null }[],
): FilterOption[] {
  const map = new Map<string, Set<string>>();
  const bucket = (name: string) => {
    let set = map.get(name);
    if (!set) {
      set = new Set<string>();
      map.set(name, set);
    }
    return set;
  };

  for (const cat of categories) {
    const subs = bucket(cat.name);
    if (cat.sub_category_name) subs.add(cat.sub_category_name);
  }

  for (const tx of transactions) {
    const subs = bucket(tx.category);
    // NO_SUB is offered only where spend actually lands there, so categories that always
    // carry a sub don't grow a row that could never hide anything.
    subs.add(tx.sub_category || NO_SUB);
  }

  return [...map.entries()]
    .map(([name, subs]) => ({
      name,
      subs: [...subs].sort((a, b) => {
        if (a === NO_SUB) return 1;
        if (b === NO_SUB) return -1;
        return a.localeCompare(b);
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * How many distinct things the user has hidden, for the trigger's "N hidden" label.
 *
 * Counted against what the list renders, not the raw set sizes: subs of an already-hidden
 * category are redundant rather than separately hidden, and a category whose every sub was
 * unticked shows as one hidden row, so it counts once. Without `options` the two can only
 * be counted separately, and the footer ends up disagreeing with the list above it.
 */
export function excludedCount(ex: CategoryExclusion, options: FilterOption[] = []): number {
  const collapsed = new Set(
    options.filter((o) => categoryState(ex, o) === "hidden").map((o) => o.name),
  );
  for (const name of ex.categories) collapsed.add(name);

  let count = collapsed.size;
  for (const key of ex.subs) {
    if (!collapsed.has(categoryOf(key))) count++;
  }
  return count;
}

/** Checkbox state for a category row: every sub shown, none shown, or somewhere between. */
export function categoryState(
  ex: CategoryExclusion,
  option: FilterOption,
): "shown" | "hidden" | "partial" {
  if (ex.categories.has(option.name)) return "hidden";
  const hiddenSubs = option.subs.filter((sub) => ex.subs.has(subKey(option.name, sub)));
  if (hiddenSubs.length === 0) return "shown";
  return hiddenSubs.length === option.subs.length ? "hidden" : "partial";
}

/**
 * Toggles a whole category.
 *
 * Re-showing a category also drops its per-sub exclusions. While the parent is hidden its
 * sub checkboxes are disabled, so any sub the user hid earlier is invisible to them;
 * restoring those silently on re-show would hide spend with nothing on screen explaining
 * why. The master switch resets what it masked.
 */
export function toggleCategory(ex: CategoryExclusion, name: string): CategoryExclusion {
  if (!ex.categories.has(name)) {
    const categories = new Set(ex.categories);
    categories.add(name);
    return { categories, subs: ex.subs };
  }
  return showCategory(ex, name);
}

/**
 * Shows a category and everything under it.
 *
 * Distinct from `toggleCategory` because of the partial state: a category with only some
 * subs hidden is not itself in `categories`, so toggling it would *hide* it. Clicking a
 * half-ticked box should clear the filter for that category, not invert into hiding it.
 */
export function showCategory(ex: CategoryExclusion, name: string): CategoryExclusion {
  const categories = new Set(ex.categories);
  categories.delete(name);
  const subs = new Set<string>();
  for (const key of ex.subs) {
    if (categoryOf(key) !== name) subs.add(key);
  }
  return { categories, subs };
}

export function toggleSub(ex: CategoryExclusion, category: string, sub: string): CategoryExclusion {
  const key = subKey(category, sub);
  const subs = new Set(ex.subs);
  if (subs.has(key)) subs.delete(key);
  else subs.add(key);
  return { categories: ex.categories, subs };
}

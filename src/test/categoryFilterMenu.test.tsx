import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryFilterList } from "@/components/CategoryFilterMenu";
import {
  EMPTY_EXCLUSION,
  NO_SUB,
  subKey,
  type CategoryExclusion,
  type FilterOption,
} from "@/lib/spendFilter";

const options: FilterOption[] = [
  { name: "Dining", subs: ["Cafes", "Restaurants"] },
  { name: "Travel", subs: ["Flights", NO_SUB] },
  { name: "Groceries", subs: [] },
];

const exclusion = (categories: string[] = [], subs: string[] = []): CategoryExclusion => ({
  categories: new Set(categories),
  subs: new Set(subs),
});

const onChange = vi.fn();

function renderList(ex: CategoryExclusion = EMPTY_EXCLUSION) {
  return render(<CategoryFilterList options={options} exclusion={ex} onChange={onChange} />);
}

/** Last exclusion the list emitted. */
const emitted = (): CategoryExclusion => onChange.mock.calls.at(-1)![0];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CategoryFilterList", () => {
  it("shows every category ticked when nothing is excluded", () => {
    // Ticked means shown. The default state must look like "everything is visible",
    // because that is exactly what the tab does before anyone touches the filter.
    renderList();

    for (const name of ["Dining", "Travel", "Groceries"]) {
      expect(screen.getByRole("checkbox", { name })).toBeChecked();
    }
  });

  it("hides a category when its box is unticked", () => {
    renderList();

    fireEvent.click(screen.getByRole("checkbox", { name: "Dining" }));

    expect(emitted().categories.has("Dining")).toBe(true);
  });

  it("hides a single sub-category once its parent is expanded", () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: /show sub-categories of dining/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Cafes" }));

    expect(emitted().subs.has(subKey("Dining", "Cafes"))).toBe(true);
    expect(emitted().categories.size).toBe(0);
  });

  it("offers the no-sub-category slice as a real row", () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: /show sub-categories of travel/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: NO_SUB }));

    expect(emitted().subs.has(subKey("Travel", null))).toBe(true);
  });

  it("renders a half-filtered category as indeterminate, not ticked", () => {
    // Regression guard: ui/checkbox.tsx renders the Radix Indicator for both "checked"
    // and "indeterminate", so without a distinct icon a partial category would read as
    // fully shown.
    renderList(exclusion([], [subKey("Dining", "Cafes")]));

    expect(screen.getByRole("checkbox", { name: "Dining" })).toHaveAttribute("aria-checked", "mixed");
  });

  it("shows everything under a half-filtered category when its box is clicked", () => {
    // Clicking a half-ticked parent must clear it, not invert into hiding the whole
    // category — the parent is a master switch, not a toggle over its own absence.
    renderList(exclusion([], [subKey("Dining", "Cafes")]));

    fireEvent.click(screen.getByRole("checkbox", { name: "Dining" }));

    expect(emitted().categories.size).toBe(0);
    expect(emitted().subs.size).toBe(0);
  });

  it("disables sub checkboxes while the parent is hidden", () => {
    renderList(exclusion(["Dining"]));

    fireEvent.click(screen.getByRole("button", { name: /show sub-categories of dining/i }));

    expect(screen.getByRole("checkbox", { name: "Cafes" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Cafes" })).not.toBeChecked();
  });

  it("keeps sub checkboxes usable after the last one is unticked", () => {
    // Regression: the disabled state used to key off categoryState, which also reports
    // "hidden" once every sub is individually excluded — so unticking the last sub
    // disabled the very boxes the user was clicking, with no way back except the parent.
    renderList(exclusion([], [subKey("Dining", "Cafes"), subKey("Dining", "Restaurants")]));

    fireEvent.click(screen.getByRole("button", { name: /sub-categories of dining/i }));

    expect(screen.getByRole("checkbox", { name: "Cafes" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Restaurants" })).toBeEnabled();
  });

  it("collapses a category the search opened", () => {
    // Regression: isOpen used to OR the expanded set with a derived auto-expand, so
    // clicking the chevron added the name to the set and the category stayed open.
    renderList();
    fireEvent.change(screen.getByPlaceholderText(/search categories/i), {
      target: { value: "cafes" },
    });
    expect(screen.getByRole("checkbox", { name: "Cafes" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sub-categories of dining/i }));

    expect(screen.queryByRole("checkbox", { name: "Cafes" })).not.toBeInTheDocument();
  });

  it("clears the whole filter from Show all", () => {
    renderList(exclusion(["Dining"], [subKey("Travel", "Flights")]));

    fireEvent.click(screen.getByRole("button", { name: /show all/i }));

    expect(emitted().categories.size).toBe(0);
    expect(emitted().subs.size).toBe(0);
  });

  it("disables Show all when nothing is hidden", () => {
    renderList();

    expect(screen.getByRole("button", { name: /show all/i })).toBeDisabled();
    expect(screen.getByText(/nothing hidden/i)).toBeInTheDocument();
  });

  it("reports how many things are hidden", () => {
    renderList(exclusion(["Dining"], [subKey("Travel", "Flights")]));

    expect(screen.getByText("2 hidden")).toBeInTheDocument();
  });

  it("narrows to matching categories when searching", () => {
    renderList();

    fireEvent.change(screen.getByPlaceholderText(/search categories/i), {
      target: { value: "trav" },
    });

    expect(screen.getByRole("checkbox", { name: "Travel" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Dining" })).not.toBeInTheDocument();
  });

  it("opens a category whose sub matched the search", () => {
    // Matching only on a sub and leaving the category collapsed would show a row that
    // looks unrelated to what was typed.
    renderList();

    fireEvent.change(screen.getByPlaceholderText(/search categories/i), {
      target: { value: "cafes" },
    });

    expect(screen.getByRole("checkbox", { name: "Cafes" })).toBeInTheDocument();
  });
});

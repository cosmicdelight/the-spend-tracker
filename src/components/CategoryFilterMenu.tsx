import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, ChevronRight, ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  EMPTY_EXCLUSION,
  categoryState,
  excludedCount,
  isExcluded,
  isFilterActive,
  showCategory,
  toggleCategory,
  toggleSub,
  type CategoryExclusion,
  type FilterOption,
} from "@/lib/spendFilter";

interface ListProps {
  options: FilterOption[];
  exclusion: CategoryExclusion;
  onChange: (next: CategoryExclusion) => void;
}

/**
 * The filter body, split out from the Popover so it can be tested directly.
 *
 * Radix Popover needs pointer-capture polyfills under jsdom and no existing test in this
 * repo opens one; the list is a pure controlled component, so testing it here covers the
 * behaviour without any of that.
 *
 * A ticked box means *shown*, not hidden. The state underneath is an exclusion set, but a
 * checkbox that makes things disappear when you tick it reads backwards.
 */
export function CategoryFilterList({ options, exclusion, onChange }: ListProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const needle = search.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(needle);

  const visible = needle
    ? options.filter((o) => matches(o.name) || o.subs.some(matches))
    : options;

  const active = isFilterActive(exclusion);
  const count = excludedCount(exclusion);

  return (
    <div className="flex flex-col">
      <div className="p-2">
        <Input
          ref={inputRef}
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
        />
      </div>

      <div
        className="max-h-64 overflow-y-auto overscroll-contain p-1"
        onWheel={(e) => e.stopPropagation()}
      >
        {visible.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No categories.</p>
        )}

        {visible.map((option, i) => {
          const state = categoryState(exclusion, option);
          const hidden = state === "hidden";
          // A search that matched only a sub opens the category, so the match is visible
          // without the user hunting for the chevron.
          const isOpen =
            expanded.has(option.name) || (needle !== "" && !matches(option.name) && option.subs.some(matches));
          const catId = `${uid}-cat-${i}`;

          return (
            <div key={option.name}>
              <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent/50">
                <Checkbox
                  id={catId}
                  checked={state === "shown" ? true : state === "partial" ? "indeterminate" : false}
                  onCheckedChange={() =>
                    onChange(state === "shown" ? toggleCategory(exclusion, option.name) : showCategory(exclusion, option.name))
                  }
                />
                <label htmlFor={catId} className="flex-1 cursor-pointer truncate text-sm">
                  {option.name}
                </label>
                {option.subs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(option.name)}
                    aria-label={`${isOpen ? "Hide" : "Show"} sub-categories of ${option.name}`}
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent"
                  >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {isOpen &&
                option.subs.map((sub, j) => {
                  const subId = `${uid}-sub-${i}-${j}`;
                  const subHidden = isExcluded(exclusion, option.name, sub);
                  return (
                    <div
                      key={sub}
                      className="flex items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 hover:bg-accent/50"
                    >
                      <Checkbox
                        id={subId}
                        checked={!subHidden}
                        disabled={hidden}
                        onCheckedChange={() => onChange(toggleSub(exclusion, option.name, sub))}
                      />
                      <label
                        htmlFor={subId}
                        className={cn(
                          "flex-1 cursor-pointer truncate text-sm",
                          hidden ? "text-muted-foreground/50" : "text-muted-foreground",
                        )}
                      >
                        {sub}
                      </label>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* No "hide all" — one click should never empty the whole tab. */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={!active}
          onClick={() => onChange(EMPTY_EXCLUSION)}
        >
          Show all
        </Button>
        <span className="text-xs text-muted-foreground">
          {active ? `${count} hidden` : "Nothing hidden"}
        </span>
      </div>
    </div>
  );
}

interface Props extends ListProps {
  className?: string;
}

export default function CategoryFilterMenu({ options, exclusion, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const active = isFilterActive(exclusion);
  const count = excludedCount(exclusion);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant={active ? "default" : "outline"}
            size="sm"
            aria-expanded={open}
            className="h-8 gap-1.5"
          >
            <ListFilter className="h-3.5 w-3.5" />
            {active ? `${count} hidden` : "Filter categories"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-0 z-50 bg-popover"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Remounted per open so the search box resets, matching SearchableSelect. */}
          {open && <CategoryFilterList options={options} exclusion={exclusion} onChange={onChange} />}
        </PopoverContent>
      </Popover>

      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Clear category filter"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={() => onChange(EMPTY_EXCLUSION)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import type { IncomeEntry } from "@/hooks/useIncome";
import EditIncomeDialog from "./EditIncomeDialog";

interface Props {
  income: IncomeEntry[];
}

export default function IncomeList({ income }: Props) {
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);

  const viewDate = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const filtered = useMemo(
    () =>
      income.filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      }),
    [income, viewMonth, viewYear],
  );

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, IncomeEntry[]>();
    for (const entry of filtered) {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date)!.push(entry);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const monthTotal = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const isCurrentMonth = monthOffset === 0;
  const monthLabel = format(viewDate, "MMMM yyyy");

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Income</CardTitle>
              {filtered.length > 0 && (
                <p className="text-sm font-semibold mt-0.5 text-[hsl(var(--chart-2))]">
                  +${monthTotal.toFixed(2)} total
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonthOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">{monthLabel}</span>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                disabled={isCurrentMonth}
                onClick={() => setMonthOffset((o) => o + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground">No income this month.</p>
          )}
          <div className="space-y-4">
            {grouped.map(([date, entries]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  {format(parseISO(date), "EEEE, MMM d")}
                </p>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate min-w-0 flex-1 mr-2">
                          {entry.description || entry.category}
                        </span>
                        <span className="text-sm font-semibold text-[hsl(var(--chart-2))] shrink-0">
                          +${Number(entry.amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground font-medium">
                          {entry.category}
                        </span>
                        {entry.sub_category && (
                          <>
                            <span>·</span>
                            <span>{entry.sub_category}</span>
                          </>
                        )}
                        {entry.original_currency !== "SGD" && (
                          <>
                            <span>·</span>
                            <span>{entry.original_currency} {Number(entry.original_amount).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <EditIncomeDialog
        entry={editingEntry}
        open={!!editingEntry}
        onOpenChange={(o) => { if (!o) setEditingEntry(null); }}
      />
    </>
  );
}

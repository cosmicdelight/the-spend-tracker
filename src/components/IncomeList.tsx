import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import type { IncomeEntry } from "@/hooks/useIncome";
import EditIncomeDialog from "./EditIncomeDialog";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  income: IncomeEntry[];
}

export default function IncomeList({ income }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);

  const filtered = useMemo(
    () =>
      income.filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [income, selectedMonth, selectedYear],
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
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const goBack = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };

  const goForward = () => {
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Income</CardTitle>
              {filtered.length > 0 && (
                <p className="text-sm font-semibold mt-0.5 text-[hsl(var(--chart-2))]">
                  +${monthTotal.toFixed(2)} total
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Array.from({ length: now.getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isCurrentMonth} onClick={goForward}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
                  className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Today
                </button>
              )}
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

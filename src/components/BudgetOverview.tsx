import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronDown, ChevronRight, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { format } from "date-fns";
import type { BudgetCategory } from "@/hooks/useBudgetCategories";
import type { Transaction } from "@/hooks/useTransactions";
import type { IncomeEntry } from "@/hooks/useIncome";
import SpendingTrendsChart from "@/components/SpendingTrendsChart";
import EditTransactionDialog from "@/components/EditTransactionDialog";

function CategoryTransactions({ category, transactions }: { category: string; transactions: Transaction[] }) {
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const txs = useMemo(
    () => transactions
      .filter((t) => t.category === category)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, category],
  );

  if (txs.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Transactions ({txs.length})
      </p>
      <div className="max-h-60 space-y-1 overflow-y-auto">
        {txs.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setEditTx(tx)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{tx.description || tx.sub_category || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(tx.date), "MMM d, yyyy")}
                {tx.sub_category && tx.description ? ` · ${tx.sub_category}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-medium">${Number(tx.personal_amount).toFixed(2)}</p>
              {Number(tx.amount) !== Number(tx.personal_amount) && (
                <p className="text-xs text-muted-foreground">${Number(tx.amount).toFixed(2)} total</p>
              )}
            </div>
          </button>
        ))}
      </div>
      <EditTransactionDialog transaction={editTx} open={!!editTx} onOpenChange={(open) => { if (!open) setEditTx(null); }} />
    </div>
  );
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(262, 60%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(340, 65%, 50%)",
  "hsl(45, 85%, 50%)",
  "hsl(140, 55%, 42%)",
  "hsl(20, 80%, 55%)",
  "hsl(280, 50%, 60%)",
  "hsl(170, 60%, 40%)",
];

interface Props {
  categories: BudgetCategory[];
  transactions: Transaction[];
  income?: IncomeEntry[];
}

interface GroupedEntry {
  name: string;
  value: number;
  subs: { name: string; value: number }[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BudgetOverview({ categories, transactions, income }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "year">("month");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const goBack = () => {
    if (view === "month") {
      if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
      else setSelectedMonth((m) => m - 1);
    } else {
      setSelectedYear((y) => y - 1);
    }
  };

  const goForward = () => {
    if (view === "month") {
      const isCurrentPeriod = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
      if (isCurrentPeriod) return;
      if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
      else setSelectedMonth((m) => m + 1);
    } else {
      if (selectedYear >= now.getFullYear()) return;
      setSelectedYear((y) => y + 1);
    }
  };

  const isAtCurrent = view === "month"
    ? selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
    : selectedYear === now.getFullYear();

  const periodLabel = view === "month"
    ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    : `${selectedYear}`;

  const filteredTxs = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        if (view === "month") {
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        }
        return d.getFullYear() === selectedYear;
      }),
    [transactions, selectedMonth, selectedYear, view],
  );

  // Group by parent category name, aggregate spend, collect sub-category breakdown
  const grouped: GroupedEntry[] = useMemo(() => {
    const map = new Map<string, { total: number; subs: Map<string, number> }>();

    for (const cat of categories) {
      if (!map.has(cat.name)) map.set(cat.name, { total: 0, subs: new Map() });
    }

    for (const tx of filteredTxs) {
      // Create entry for categories not in budget_categories
      if (!map.has(tx.category)) {
        map.set(tx.category, { total: 0, subs: new Map() });
      }
      const entry = map.get(tx.category)!;
      const amt = Number(tx.personal_amount);
      entry.total += amt;
      const subKey = tx.sub_category || "(no sub-category)";
      entry.subs.set(subKey, (entry.subs.get(subKey) || 0) + amt);
    }

    return [...map.entries()]
      .map(([name, { total, subs }]) => ({
        name,
        value: total,
        subs: [...subs.entries()]
          .map(([n, v]) => ({ name: n, value: v }))
          .filter((s) => s.value > 0)
          .sort((a, b) => b.value - a.value),
      }))
      .filter((g) => g.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories, filteredTxs]);

  const totalSpent = grouped.reduce((s, d) => s + d.value, 0);

  const filteredIncome = useMemo(
    () =>
      (income ?? []).filter((e) => {
        const d = new Date(e.date);
        if (view === "month") {
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        }
        return d.getFullYear() === selectedYear;
      }),
    [income, selectedMonth, selectedYear, view],
  );
  const totalIncome = filteredIncome.reduce((s, e) => s + Number(e.amount), 0);
  const netSavings = totalIncome - totalSpent;
  const showSavings = income && filteredIncome.length > 0;

  const pieData = grouped.map((g) => ({ name: g.name, value: g.value }));
  const topLabelNames = new Set(pieData.slice(0, 7).map((d) => d.name));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const entry = payload[0].payload as { name: string; value: number };
      const pct = totalSpent > 0 ? ((entry.value / totalSpent) * 100).toFixed(1) : "0";
      return (
        <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
          <p className="font-medium">{entry.name}</p>
          <p className="text-muted-foreground">
            ${entry.value.toFixed(2)} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">

    {/* Net savings summary */}
    {showSavings && (
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-3 divide-x text-center">
            <div className="px-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="mt-1 text-lg font-heading font-bold text-[hsl(var(--chart-2))]">
                ${totalIncome.toFixed(2)}
              </p>
            </div>
            <div className="px-3">
              <p className="text-xs text-muted-foreground">Spending</p>
              <p className="mt-1 text-lg font-heading font-bold text-destructive">
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="px-3">
              <p className="text-xs text-muted-foreground">Savings</p>
              <p className={`mt-1 text-lg font-heading font-bold ${netSavings >= 0 ? "text-[hsl(var(--chart-2))]" : "text-destructive"}`}>
                {netSavings >= 0 ? "+" : ""}${netSavings.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{view === "month" ? "Monthly" : "Annual"} Budget</CardTitle>
          <div className="flex gap-1 rounded-lg border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setView("month")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${view === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("year")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${view === "year" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Year
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={goBack} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          {view === "month" ? (
            <div className="flex items-center gap-1">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
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
            </div>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Array.from({ length: now.getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={goForward}
            disabled={isAtCurrent}
            className={`rounded-md p-1 transition-colors ${isAtCurrent ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          {!isAtCurrent && (
            <button
              type="button"
              onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
              className="ml-1 rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Today
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* ... keep existing code (total spend, pie chart, category list) */}
        {totalSpent > 0 && (
          <div className="mb-4 text-center">
            <p className="text-xs text-muted-foreground">Total Personal Spend</p>
            <p className="text-2xl font-heading font-bold">${totalSpent.toFixed(2)}</p>
          </div>
        )}
        {categories.length === 0 && <p className="text-sm text-muted-foreground">No budget categories yet.</p>}

        {pieData.length > 0 && (
          <div className="mb-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  label={({ name, percent, midAngle, outerRadius: oR, cx: cxVal, cy: cyVal }) => {
                    if (!topLabelNames.has(name)) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = oR + 35;
                    const x = cxVal + radius * Math.cos(-midAngle * RADIAN);
                    const y = cyVal + radius * Math.sin(-midAngle * RADIAN);
                    const textAnchor = x > cxVal ? "start" : "end";
                    return (
                      <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" className="fill-foreground text-[10px] font-medium">
                        {`${name} ${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  labelLine={({ points, name, midAngle, outerRadius: oR, cx: cxVal, cy: cyVal }: any) => {
                    if (!topLabelNames.has(name)) return <line style={{ display: 'none' }} />;
                    const RADIAN = Math.PI / 180;
                    const startX = points[0].x;
                    const startY = points[0].y;
                    const midRadius = oR + 18;
                    const midX = cxVal + midRadius * Math.cos(-midAngle * RADIAN);
                    const midY = cyVal + midRadius * Math.sin(-midAngle * RADIAN);
                    const endRadius = oR + 30;
                    const endX = cxVal + endRadius * Math.cos(-midAngle * RADIAN);
                    const endY = cyVal + endRadius * Math.sin(-midAngle * RADIAN);
                    return (
                      <polyline
                        points={`${startX},${startY} ${midX},${midY} ${endX},${endY}`}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                        fill="none"
                      />
                    );
                  }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {pieData.length === 0 && categories.length > 0 && (
          <p className="mb-4 text-center text-sm text-muted-foreground">No spending {view === "month" ? "this month" : "this year"} yet.</p>
        )}

        {/* Legend / category list */}
        <div className="divide-y">
          {grouped.map((entry, i) => {
            const isExpanded = expanded === entry.name;
            const hasSubs = categories.some((c) => c.name === entry.name && c.sub_category_name);

            return (
              <div key={entry.name}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  onClick={() => setExpanded(isExpanded ? null : entry.name)}
                >
                  <span
                    className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  >
                    {totalSpent > 0 ? ((entry.value / totalSpent) * 100).toFixed(0) : 0}%
                  </span>
                  <span className="flex-1 text-left font-medium">{entry.name}</span>
                  <span className="font-medium">${entry.value.toFixed(2)}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-1 mb-2 ml-6 space-y-3">
                    {hasSubs && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center gap-4">
                          <div className="h-36 w-36 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={entry.subs}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={30}
                                  outerRadius={55}
                                  paddingAngle={3}
                                  dataKey="value"
                                  strokeWidth={0}
                                >
                                  {entry.subs.map((_, j) => (
                                    <Cell key={j} fill={COLORS[(i + j + 1) % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-1 text-sm">
                            {entry.subs.map((sub, j) => (
                              <div key={sub.name} className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: COLORS[(i + j + 1) % COLORS.length] }}
                                />
                                <span className="text-muted-foreground">{sub.name}</span>
                                <span className="font-medium">${sub.value.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <CategoryTransactions category={entry.name} transactions={filteredTxs} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <SpendingTrendsChart transactions={transactions} />
    </div>
  );
}

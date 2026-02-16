import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BudgetCategory } from "@/hooks/useBudgetCategories";
import type { Transaction } from "@/hooks/useTransactions";

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
}

interface GroupedEntry {
  name: string;
  value: number;
  subs: { name: string; value: number }[];
}

export default function BudgetOverview({ categories, transactions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTxs = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }),
    [transactions, currentMonth, currentYear],
  );

  // Group by parent category name, aggregate spend, collect sub-category breakdown
  const grouped: GroupedEntry[] = useMemo(() => {
    const map = new Map<string, { total: number; subs: Map<string, number> }>();

    for (const cat of categories) {
      if (!map.has(cat.name)) map.set(cat.name, { total: 0, subs: new Map() });
    }

    for (const tx of monthlyTxs) {
      const entry = map.get(tx.category);
      if (!entry) continue;
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
  }, [categories, monthlyTxs]);

  const totalSpent = grouped.reduce((s, d) => s + d.value, 0);

  const pieData = grouped.map((g) => ({ name: g.name, value: g.value }));

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Budget</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 && <p className="text-sm text-muted-foreground">No budget categories yet.</p>}

        {pieData.length > 0 && (
          <div className="mb-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
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
          <p className="mb-4 text-center text-sm text-muted-foreground">No spending this month yet.</p>
        )}

        {/* Legend / category list */}
        <div className="space-y-1">
          {grouped.map((entry, i) => {
            const isExpanded = expanded === entry.name;
            const hasSubs = categories.some((c) => c.name === entry.name && c.sub_category_name);

            return (
              <div key={entry.name}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-muted/50"
                  onClick={() => hasSubs && setExpanded(isExpanded ? null : entry.name)}
                >
                  <div className="flex items-center gap-2">
                    {hasSubs ? (
                      isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )
                    ) : (
                      <span className="w-3.5" />
                    )}
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  <span className="text-muted-foreground">${entry.value.toFixed(2)}</span>
                </button>

                {isExpanded && hasSubs && (
                  <div className="mt-1 mb-2 ml-6 rounded-lg border bg-muted/30 p-3">
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

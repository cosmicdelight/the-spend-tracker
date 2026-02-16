import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/hooks/useTransactions";

const LINE_COLORS = [
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

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  transactions: Transaction[];
}

export default function SpendingTrendsChart({ transactions }: Props) {
  const [months, setMonths] = useState(6);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Build per-month, per-category data for the last N months
  const { chartData, categoryNames } = useMemo(() => {
    const now = new Date();
    const periods: { year: number; month: number; label: string }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear() !== now.getFullYear() ? d.getFullYear().toString().slice(2) : ""}`.trim(),
      });
    }

    // Aggregate spend per category per period
    const catTotals = new Map<string, number>();
    const periodCatMap = new Map<string, Map<string, number>>();

    for (const p of periods) {
      periodCatMap.set(`${p.year}-${p.month}`, new Map());
    }

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = periodCatMap.get(key);
      if (!bucket) continue;
      const amt = Number(tx.personal_amount);
      bucket.set(tx.category, (bucket.get(tx.category) || 0) + amt);
      catTotals.set(tx.category, (catTotals.get(tx.category) || 0) + amt);
    }

    // Top categories by total spend across all shown months
    const topCats = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    const chartData = periods.map((p) => {
      const bucket = periodCatMap.get(`${p.year}-${p.month}`)!;
      const row: Record<string, string | number> = { month: p.label, Total: 0 };
      let total = 0;
      for (const cat of topCats) {
        const val = Math.round((bucket.get(cat) || 0) * 100) / 100;
        row[cat] = val;
        total += val;
      }
      row.Total = Math.round(total * 100) / 100;
      return row;
    });

    return { chartData, categoryNames: topCats };
  }, [transactions, months]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
        <p className="mb-1 font-medium">{label}</p>
        {payload
          .filter((p: any) => p.value > 0)
          .sort((a: any, b: any) => b.value - a.value)
          .map((p: any) => (
            <p key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.dataKey}: ${Number(p.value).toFixed(2)}
            </p>
          ))}
      </div>
    );
  };

  if (transactions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Spending Trends</CardTitle>
          <div className="flex gap-1 rounded-lg border bg-muted p-0.5">
            {[3, 6, 12].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMonths(n)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  months === n ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {n}m
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              selectedCategory === null ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categoryNames.map((cat, i) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                selectedCategory === cat ? "text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              style={selectedCategory === cat ? { backgroundColor: LINE_COLORS[i % LINE_COLORS.length] } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              {!selectedCategory && (
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              {!selectedCategory && (
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {categoryNames
                .filter((cat) => !selectedCategory || selectedCategory === cat)
                .map((cat) => {
                  const i = categoryNames.indexOf(cat);
                  return (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={selectedCategory ? 2.5 : 1.5}
                      dot={{ r: selectedCategory ? 3 : 2 }}
                      activeDot={{ r: selectedCategory ? 5 : 4 }}
                      strokeDasharray={!selectedCategory && i > 3 ? "4 2" : undefined}
                    />
                  );
                })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

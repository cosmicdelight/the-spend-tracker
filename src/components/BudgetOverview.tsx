import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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

interface ChartEntry {
  name: string;
  value: number;
  id: string;
  subCategory?: string | null;
}

export default function BudgetOverview({ categories, transactions }: Props) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const data: ChartEntry[] = categories
    .map((cat) => {
      const spent = monthlyTxs
        .filter((t) => t.category === cat.name)
        .reduce((s, t) => s + Number(t.personal_amount), 0);
      return { name: cat.name, value: spent, id: cat.id, subCategory: cat.sub_category_name };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalSpent = data.reduce((s, d) => s + d.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const entry = payload[0].payload as ChartEntry;
      const pct = totalSpent > 0 ? ((entry.value / totalSpent) * 100).toFixed(1) : "0";
      return (
        <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
          <p className="font-medium">{entry.name}</p>
          <p className="text-muted-foreground">${entry.value.toFixed(2)} ({pct}%)</p>
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

        {data.length > 0 && (
          <div className="mb-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.length === 0 && categories.length > 0 && (
          <p className="mb-4 text-center text-sm text-muted-foreground">No spending this month yet.</p>
        )}

        {/* Legend / category list */}
        <div className="space-y-2">
          {data.map((entry, i) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="font-medium">{entry.name}</span>
                {entry.subCategory && (
                  <span className="text-xs text-muted-foreground">/ {entry.subCategory}</span>
                )}
              </div>
              <span className="text-muted-foreground">${entry.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

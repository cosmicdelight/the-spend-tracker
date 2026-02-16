import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BudgetCategory } from "@/hooks/useBudgetCategories";
import type { Transaction } from "@/hooks/useTransactions";

interface Props {
  categories: BudgetCategory[];
  transactions: Transaction[];
  onDeleteCategory: (id: string) => void;
}

export default function BudgetOverview({ categories, transactions, onDeleteCategory }: Props) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length === 0 && <p className="text-sm text-muted-foreground">No budget categories yet.</p>}
        {categories.map((cat) => {
          const spent = monthlyTxs
            .filter((t) => t.category === cat.name)
            .reduce((s, t) => s + Number(t.personal_amount), 0);
          const limit = Number(cat.monthly_limit);
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const over = spent > limit;

          return (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className={over ? "text-destructive font-semibold" : "text-muted-foreground"}>
                    ${spent.toFixed(2)} / ${limit.toFixed(2)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteCategory(cat.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Progress value={pct} className={`h-2 ${over ? "[&>div]:bg-destructive" : ""}`} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

import { RecurringTransaction } from "@/hooks/useRecurringTransactions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2 } from "lucide-react";

interface Props {
  recurring: RecurringTransaction[];
  onDelete: (id: string) => void;
  onCreateNow: (rec: RecurringTransaction) => void;
}

export default function RecurringTransactionList({ recurring, onDelete, onCreateNow }: Props) {
  if (recurring.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recurring Transactions
      </h2>
      <div className="space-y-2">
        {recurring.map((rec) => (
          <div key={rec.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{rec.description || rec.category}</p>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {rec.frequency}
                </Badge>
                {rec.auto_generate && (
                  <Badge variant="outline" className="text-xs shrink-0">auto</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{rec.category}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">${Number(rec.amount).toFixed(2)}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">Next: {rec.next_due_date}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreateNow(rec)} title="Create transaction now">
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(rec.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

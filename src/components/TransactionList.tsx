import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/useTransactions";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { TransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";
import { format, parseISO } from "date-fns";
import EditTransactionDialog from "./EditTransactionDialog";

interface Props {
  transactions: Transaction[];
  cards: CreditCard[];
  fieldPrefs: TransactionFieldPrefs;
}

export default function TransactionList({ transactions, cards, fieldPrefs }: Props) {

  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const viewDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return d;
  }, [monthOffset]);

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      }),
    [transactions, viewMonth, viewYear],
  );

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = tx.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const isCurrentMonth = monthOffset === 0;
  const monthLabel = format(viewDate, "MMMM yyyy");

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transactions</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonthOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">{monthLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isCurrentMonth} onClick={() => setMonthOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 && <p className="text-sm text-muted-foreground">No transactions this month.</p>}
          <div className="space-y-4">
            {grouped.map(([date, txs]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{format(parseISO(date), "EEEE, MMM d")}</p>
                <div className="space-y-2">
                  {txs.map((tx) => {
                    const isSplit = Number(tx.personal_amount) !== Number(tx.amount);
                    return (
                      <div key={tx.id} className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setEditingTx(tx)}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate min-w-0 flex-1 mr-2">{tx.description || tx.category}</span>
                          <span className="text-sm font-semibold shrink-0">${Number(tx.amount).toFixed(2)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{tx.category}</span>
                            <span>·</span>
                            <span className="capitalize">{tx.payment_mode.replace("_", " ")}</span>
                          </div>
                          {isSplit && <span className="text-xs text-muted-foreground shrink-0">Yours: ${Number(tx.personal_amount).toFixed(2)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <EditTransactionDialog transaction={editingTx} open={!!editingTx} onOpenChange={(o) => !o && setEditingTx(null)} fieldPrefs={fieldPrefs} />
    </>
  );
}

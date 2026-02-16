import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/useTransactions";
import type { CreditCard } from "@/hooks/useCreditCards";
import { format, parseISO } from "date-fns";
import EditTransactionDialog from "./EditTransactionDialog";
import DeleteConfirmButton from "./DeleteConfirmButton";

interface Props {
  transactions: Transaction[];
  cards: CreditCard[];
  onDelete: (id: string) => void;
}

export default function TransactionList({ transactions, cards, onDelete }: Props) {
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c.name]));

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
                      <div key={tx.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditingTx(tx)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{tx.description || tx.category}</span>
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{tx.category}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{tx.payment_mode.replace("_", " ")}</span>
                            {tx.credit_card_id && cardMap[tx.credit_card_id] && (
                              <><span>·</span><span>{cardMap[tx.credit_card_id]}</span></>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-semibold">${Number(tx.amount).toFixed(2)}</p>
                            {isSplit && <p className="text-xs text-muted-foreground">Yours: ${Number(tx.personal_amount).toFixed(2)}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingTx(tx)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteConfirmButton label="this transaction" onConfirm={() => onDelete(tx.id)} />
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
      <EditTransactionDialog transaction={editingTx} open={!!editingTx} onOpenChange={(o) => !o && setEditingTx(null)} />
    </>
  );
}

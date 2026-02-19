import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/useTransactions";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { TransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";
import { format, parseISO } from "date-fns";
import EditTransactionDialog from "./EditTransactionDialog";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  transactions: Transaction[];
  cards: CreditCard[];
  fieldPrefs: TransactionFieldPrefs;
}

export default function TransactionList({ transactions, cards, fieldPrefs }: Props) {

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [transactions, selectedMonth, selectedYear],
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
            <CardTitle className="text-lg">Transactions</CardTitle>
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

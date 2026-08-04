import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, CreditCard as CreditCardIcon } from "lucide-react";
import { format } from "date-fns";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { Transaction } from "@/hooks/useTransactions";
import EditTransactionDialog from "@/components/EditTransactionDialog";

const CARD_COLORS = [
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

const UNASSIGNED_KEY = "__unassigned__";
const NON_CARD_KEY = "__non_card__";

interface Props {
  cards: CreditCard[];
  transactions: Transaction[];
  view: "month" | "year";
  selectedMonth: number;
  selectedYear: number;
  periodLabel: string;
}

interface Row {
  key: string;
  name: string;
  value: number;
  txs: Transaction[];
}

export default function SpendByCardBreakdown({
  cards,
  transactions,
  view,
  selectedMonth,
  selectedYear,
  periodLabel,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const { rows, total } = useMemo(() => {
    // Group by transaction date (statement date), matching the card trackers
    const periodTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      if (view === "month") {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }
      return d.getFullYear() === selectedYear;
    });

    const buckets = new Map<string, Transaction[]>();
    for (const tx of periodTxs) {
      let key: string;
      if (tx.credit_card_id) key = tx.credit_card_id;
      else if (tx.payment_mode === "credit_card") key = UNASSIGNED_KEY;
      else key = NON_CARD_KEY;
      const list = buckets.get(key);
      if (list) list.push(tx);
      else buckets.set(key, [tx]);
    }

    const nameFor = (key: string) => {
      if (key === UNASSIGNED_KEY) return "Unassigned card";
      if (key === NON_CARD_KEY) return "Cash / other";
      return cards.find((c) => c.id === key)?.name ?? "Unknown card";
    };

    const rows: Row[] = [...buckets.entries()]
      .map(([key, txs]) => ({
        key,
        name: nameFor(key),
        value: txs.reduce((s, t) => s + Number(t.amount), 0),
        txs: [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }))
      .filter((r) => r.value !== 0)
      .sort((a, b) => b.value - a.value);

    return { rows, total: rows.reduce((s, r) => s + r.value, 0) };
  }, [transactions, cards, view, selectedMonth, selectedYear]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <CreditCardIcon className="h-4 w-4 text-primary" />
        <CardTitle className="text-lg">Spend by Card</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">{periodLabel}</span>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No spending {view === "month" ? "this month" : "this year"} yet.
          </p>
        ) : (
          <>
            <div className="mb-4 text-center">
              <p className="text-xs text-muted-foreground">Total Charged</p>
              <p className="text-2xl font-heading font-bold">${total.toFixed(2)}</p>
            </div>

            <div className="divide-y">
              {rows.map((row, i) => {
                const isExpanded = expanded === row.key;
                const pct = total > 0 ? (row.value / total) * 100 : 0;
                const color = CARD_COLORS[i % CARD_COLORS.length];
                return (
                  <div key={row.key}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : row.key)}
                      className="w-full rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {pct.toFixed(0)}%
                        </span>
                        <span className="flex-1 text-left font-medium">{row.name}</span>
                        <span className="font-medium">${row.value.toFixed(2)}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="mt-1.5 ml-[3.25rem] h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-1 mb-2 ml-6 rounded-lg border bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Transactions ({row.txs.length})
                        </p>
                        <div className="max-h-60 space-y-1 overflow-y-auto">
                          {row.txs.map((tx) => (
                            <button
                              key={tx.id}
                              type="button"
                              onClick={() => setEditTx(tx)}
                              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {tx.description || tx.sub_category || tx.category || "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.date), "MMM d, yyyy")}
                                  {tx.category ? ` · ${tx.category}` : ""}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="font-medium">${Number(tx.amount).toFixed(2)}</p>
                                {Number(tx.amount) !== Number(tx.personal_amount) && (
                                  <p className="text-xs text-muted-foreground">
                                    ${Number(tx.personal_amount).toFixed(2)} personal
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <EditTransactionDialog
          transaction={editTx}
          open={!!editTx}
          onOpenChange={(open) => {
            if (!open) setEditTx(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

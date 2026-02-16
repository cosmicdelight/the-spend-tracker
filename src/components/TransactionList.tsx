import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/useTransactions";
import type { CreditCard } from "@/hooks/useCreditCards";
import { format, parseISO } from "date-fns";

interface Props {
  transactions: Transaction[];
  cards: CreditCard[];
  onDelete: (id: string) => void;
}

export default function TransactionList({ transactions, cards, onDelete }: Props) {
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
        <div className="space-y-2">
          {transactions.slice(0, 20).map((tx) => {
            const isSplit = Number(tx.personal_amount) !== Number(tx.amount);
            return (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{tx.description || tx.category}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{tx.category}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(parseISO(tx.date), "MMM d")}</span>
                    <span>·</span>
                    <span className="capitalize">{tx.payment_mode.replace("_", " ")}</span>
                    {tx.credit_card_id && cardMap[tx.credit_card_id] && (
                      <><span>·</span><span>{cardMap[tx.credit_card_id]}</span></>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">${Number(tx.amount).toFixed(2)}</p>
                    {isSplit && <p className="text-xs text-muted-foreground">Yours: ${Number(tx.personal_amount).toFixed(2)}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(tx.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

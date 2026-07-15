import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard as CreditCardIcon, AlertTriangle } from "lucide-react";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { Transaction } from "@/hooks/useTransactions";
import { filterTransactionsForCurrentPeriod } from "@/lib/creditCardPeriod";
import CreditCardProgressBlock from "./CreditCardProgressBlock";

interface Props {
  card: CreditCard;
  transactions: Transaction[];
}

export default function CreditCardProgress({ card, transactions }: Props) {
  const periodTxs = filterTransactionsForCurrentPeriod(card, transactions);
  const totalCharged = periodTxs.reduce((s, t) => s + Number(t.amount), 0);
  const overCap = card.spend_cap != null && Number(card.spend_cap) > 0 && totalCharged > Number(card.spend_cap);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <CreditCardIcon className="h-4 w-4 text-primary" />
        <CardTitle className="text-base flex items-center gap-1.5">
          {card.name}
          {overCap && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Over cap" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CreditCardProgressBlock card={card} transactions={transactions} />
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CreditCard as CreditCardIcon } from "lucide-react";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { Transaction } from "@/hooks/useTransactions";
import { getCurrentCardPeriod, filterTransactionsForCurrentPeriod } from "@/lib/creditCardPeriod";

interface Props {
  card: CreditCard;
  transactions: Transaction[];
}

export default function CreditCardProgress({ card, transactions }: Props) {
  const periodTxs = filterTransactionsForCurrentPeriod(card, transactions);
  const totalCharged = periodTxs.reduce((s, t) => s + Number(t.amount), 0);
  const personalSpend = periodTxs.reduce((s, t) => s + Number(t.personal_amount), 0);
  const target = Number(card.spend_target);
  const pct = target > 0 ? Math.min((totalCharged / target) * 100, 100) : 0;

  const { daysLeft, totalDays, daysElapsed } = getCurrentCardPeriod(card);
  const expectedPct = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 100;
  const onPace = target <= 0 || pct >= expectedPct;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <CreditCardIcon className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">{card.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Charged</span>
          <span className="font-semibold">${totalCharged.toFixed(2)} / ${target.toFixed(2)}</span>
        </div>
        <Progress value={pct} className="h-2.5" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Personal: ${personalSpend.toFixed(2)}</span>
          <span className={target > 0 ? (onPace ? "text-success" : "text-warning") : ""}>
            {daysLeft}d left{target > 0 ? ` · ${onPace ? "On pace" : "Behind"}` : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

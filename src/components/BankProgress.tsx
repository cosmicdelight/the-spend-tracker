import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, AlertTriangle } from "lucide-react";
import type { Bank } from "@/hooks/useBanks";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { Transaction } from "@/hooks/useTransactions";
import { getBankCards, filterTransactionsForBankPeriod } from "@/lib/bankSpend";
import SpendProgressBlock from "./SpendProgressBlock";

interface Props {
  bank: Bank;
  cards: CreditCard[];
  transactions: Transaction[];
}

export default function BankProgress({ bank, cards, transactions }: Props) {
  const bankCards = getBankCards(bank, cards);
  const periodTxs = filterTransactionsForBankPeriod(bank, cards, transactions);
  const totalCharged = periodTxs.reduce((s, t) => s + Number(t.amount), 0);
  const overCap = bank.spend_cap != null && Number(bank.spend_cap) > 0 && totalCharged > Number(bank.spend_cap);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Landmark className="h-4 w-4 text-primary" />
        <CardTitle className="text-base flex items-center gap-1.5">
          {bank.name}
          {overCap && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Over cap" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SpendProgressBlock config={bank} periodTransactions={periodTxs} />
        <p className="text-xs text-muted-foreground truncate">
          {bankCards.length === 0
            ? "No cards assigned yet"
            : `${bankCards.length} card${bankCards.length === 1 ? "" : "s"}: ${bankCards.map((c) => c.name).join(", ")}`}
        </p>
      </CardContent>
    </Card>
  );
}

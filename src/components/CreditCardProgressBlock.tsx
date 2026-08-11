import type { CreditCard } from "@/hooks/useCreditCards";
import type { Transaction } from "@/hooks/useTransactions";
import { filterTransactionsForCurrentPeriod } from "@/lib/creditCardPeriod";
import SpendProgressBlock from "./SpendProgressBlock";

interface Props {
  card: CreditCard;
  transactions: Transaction[];
}

/**
 * Progress + status block for a credit card's current period.
 */
export default function CreditCardProgressBlock({ card, transactions }: Props) {
  const periodTxs = filterTransactionsForCurrentPeriod(card, transactions);
  return <SpendProgressBlock config={card} periodTransactions={periodTxs} />;
}

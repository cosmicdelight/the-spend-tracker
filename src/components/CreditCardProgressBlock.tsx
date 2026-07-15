import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { Transaction } from "@/hooks/useTransactions";
import { getCurrentCardPeriod, filterTransactionsForCurrentPeriod } from "@/lib/creditCardPeriod";

interface Props {
  card: CreditCard;
  transactions: Transaction[];
}

/**
 * Shared progress + status block for a credit card, handling any combination of
 * minimum spend target and maximum spend cap.
 */
export default function CreditCardProgressBlock({ card, transactions }: Props) {
  const periodTxs = filterTransactionsForCurrentPeriod(card, transactions);
  const totalCharged = periodTxs.reduce((s, t) => s + Number(t.amount), 0);
  const personalSpend = periodTxs.reduce((s, t) => s + Number(t.personal_amount), 0);

  const target = Number(card.spend_target) || 0;
  const cap = card.spend_cap != null ? Number(card.spend_cap) : null;
  const hasTarget = target > 0;
  const hasCap = cap != null && cap > 0;

  const denominator = hasCap ? cap! : hasTarget ? target : 0;
  const pct = denominator > 0 ? Math.min((totalCharged / denominator) * 100, 100) : 0;

  const { daysLeft, totalDays, daysElapsed } = getCurrentCardPeriod(card);
  const expectedPct = hasTarget && totalDays > 0 ? (daysElapsed / totalDays) * 100 : 100;
  const targetPct = hasTarget ? (totalCharged / target) * 100 : 0;
  const onPace = !hasTarget || targetPct >= expectedPct;

  const overCap = hasCap && totalCharged > cap!;
  const overCapBy = overCap ? totalCharged - cap! : 0;
  const belowMin = hasTarget && totalCharged < target;

  let indicatorClass = "bg-primary";
  if (overCap) indicatorClass = "bg-destructive";
  else if (hasTarget && hasCap && !belowMin) indicatorClass = "bg-success";
  else if (hasTarget && belowMin && !onPace) indicatorClass = "bg-warning";

  // Denominator label
  const denomLabel = hasCap ? `$${cap!.toFixed(2)}` : hasTarget ? `$${target.toFixed(2)}` : "—";

  const minMarkerPct = hasTarget && hasCap ? Math.min((target / cap!) * 100, 100) : null;

  return (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          Charged
          {overCap && <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-label="Over cap" />}
        </span>
        <span className="font-semibold">
          ${totalCharged.toFixed(2)} / {denomLabel}
        </span>
      </div>

      <div className="relative">
        <Progress value={pct} className="h-2.5" indicatorClassName={indicatorClass} />
        {minMarkerPct != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/70"
            style={{ left: `${minMarkerPct}%` }}
            aria-label={`Minimum target marker at $${target.toFixed(2)}`}
            title={`Min $${target.toFixed(2)}`}
          />
        )}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground gap-2">
        <span className="truncate">
          Personal: ${personalSpend.toFixed(2)}
          {hasTarget && hasCap && (
            <> · Min ${target.toFixed(2)} · Cap ${cap!.toFixed(2)}</>
          )}
        </span>
        <span className={overCap ? "text-destructive font-medium" : hasTarget ? (onPace ? "text-success" : "text-warning") : ""}>
          {overCap
            ? `Over cap by $${overCapBy.toFixed(2)}`
            : hasTarget
              ? `${daysLeft}d left · ${onPace ? "On pace" : "Behind"}`
              : hasCap
                ? `${daysLeft}d left · $${(cap! - totalCharged).toFixed(2)} under cap`
                : `${daysLeft}d left`}
        </span>
      </div>
    </>
  );
}

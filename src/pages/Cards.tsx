import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreditCards, useDeleteCreditCard, useReorderCreditCards, type CreditCard } from "@/hooks/useCreditCards";
import { useTransactions } from "@/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard as CreditCardIcon, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, addMonths, parseISO } from "date-fns";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import EditCreditCardDialog from "@/components/EditCreditCardDialog";
import DeleteConfirmButton from "@/components/DeleteConfirmButton";

export default function Cards() {
  const { user, loading } = useAuth();
  const { data: cards = [] } = useCreditCards();
  const { data: transactions = [] } = useTransactions();
  const deleteCard = useDeleteCreditCard();
  const reorder = useReorderCreditCards();
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const moveCard = (index: number, direction: -1 | 1) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= cards.length) return;
    reorder.mutate([
      { id: cards[index].id, sort_order: cards[swapIndex].sort_order },
      { id: cards[swapIndex].id, sort_order: cards[index].sort_order },
    ]);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-heading font-bold">Manage Cards</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <AddCreditCardDialog />

        <div className="space-y-3">
          {cards.map((card, index) => {
            const cardTxs = transactions.filter((t) => t.credit_card_id === card.id);
            const totalCharged = cardTxs.reduce((s, t) => s + Number(t.amount), 0);
            const personalSpend = cardTxs.reduce((s, t) => s + Number(t.personal_amount), 0);
            const target = Number(card.spend_target);
            const pct = target > 0 ? Math.min((totalCharged / target) * 100, 100) : 0;
            const endDate = addMonths(parseISO(card.start_date), card.time_period_months);
            const daysLeft = Math.max(differenceInDays(endDate, new Date()), 0);

            return (
              <Card key={card.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{card.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-muted-foreground/60" disabled={index === 0} onClick={() => moveCard(index, -1)}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-muted-foreground/60" disabled={index === cards.length - 1} onClick={() => moveCard(index, 1)}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingCard(card)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteConfirmButton label="this credit card" onConfirm={() => deleteCard.mutate(card.id)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Charged</span>
                    <span className="font-semibold">${totalCharged.toFixed(2)} / ${target.toFixed(2)}</span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Personal: ${personalSpend.toFixed(2)}</span>
                    <span>{daysLeft}d left</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {cards.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No credit cards yet. Add one above!</p>
        )}
      </main>

      <EditCreditCardDialog card={editingCard} open={!!editingCard} onOpenChange={(o) => !o && setEditingCard(null)} />
    </div>
  );
}

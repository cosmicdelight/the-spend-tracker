import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreditCards, useDeleteCreditCard, useReorderCreditCards, type CreditCard } from "@/hooks/useCreditCards";
import { useTransactions } from "@/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard as CreditCardIcon, Pencil, GripVertical, AlertTriangle, EyeOff } from "lucide-react";
import { filterTransactionsForCurrentPeriod } from "@/lib/creditCardPeriod";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import EditCreditCardDialog from "@/components/EditCreditCardDialog";
import DeleteConfirmButton from "@/components/DeleteConfirmButton";
import CreditCardProgressBlock from "@/components/CreditCardProgressBlock";

export default function Cards() {
  const { user, loading } = useAuth();
  const { data: cards = [] } = useCreditCards();
  const { data: transactions = [] } = useTransactions();
  const deleteCard = useDeleteCreditCard();
  const reorder = useReorderCreditCards();
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const from = result.source.index;
    const to = result.destination.index;
    // Build new order assignments
    const reordered = [...cards];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updates = reordered.map((card, i) => ({ id: card.id, sort_order: i + 1 }));
    reorder.mutate(updates);
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

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="cards">
            {(provided) => (
              <div className="space-y-3" ref={provided.innerRef} {...provided.droppableProps}>
                {cards.map((card, index) => {
                  const periodTxs = filterTransactionsForCurrentPeriod(card, transactions);
                  const totalCharged = periodTxs.reduce((s, t) => s + Number(t.amount), 0);
                  const overCap = card.spend_cap != null && Number(card.spend_cap) > 0 && totalCharged > Number(card.spend_cap);

                  return (
                    <Draggable key={card.id} draggableId={card.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <Card className={snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <CreditCardIcon className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base flex items-center gap-1.5">
                                  {card.name}
                                  {overCap && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Over cap" />}
                                  {card.hidden_from_dropdown && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Hidden from dropdown" />}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingCard(card)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <DeleteConfirmButton label="this credit card" onConfirm={() => deleteCard.mutate(card.id)} />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <CreditCardProgressBlock card={card} transactions={transactions} />
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {cards.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No credit cards yet. Add one above!</p>
        )}
      </main>

      <EditCreditCardDialog card={editingCard} open={!!editingCard} onOpenChange={(o) => !o && setEditingCard(null)} />
    </div>
  );
}

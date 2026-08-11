import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBanks, useDeleteBank, useReorderBanks, type Bank } from "@/hooks/useBanks";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useTransactions } from "@/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Landmark, Pencil, GripVertical, AlertTriangle, CreditCard as CreditCardIcon } from "lucide-react";
import { getBankCards, filterTransactionsForBankPeriod } from "@/lib/bankSpend";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import AddBankDialog from "@/components/AddBankDialog";
import EditBankDialog from "@/components/EditBankDialog";
import DeleteConfirmButton from "@/components/DeleteConfirmButton";
import SpendProgressBlock from "@/components/SpendProgressBlock";

export default function Banks() {
  const { user, loading } = useAuth();
  const { data: banks = [] } = useBanks();
  const { data: cards = [] } = useCreditCards();
  const { data: transactions = [] } = useTransactions();
  const deleteBank = useDeleteBank();
  const reorder = useReorderBanks();
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const from = result.source.index;
    const to = result.destination.index;
    const reordered = [...banks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updates = reordered.map((bank, i) => ({ id: bank.id, sort_order: i + 1 }));
    reorder.mutate(updates);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const unassignedCards = cards.filter((c) => !c.bank_id);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-heading font-bold">Manage Banks</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <AddBankDialog />
          <Link to="/cards">
            <Button variant="outline"><CreditCardIcon className="mr-2 h-4 w-4" />Manage Cards</Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          A bank's progress covers every card assigned to it. Assign a card to a bank from Manage Cards.
        </p>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="banks">
            {(provided) => (
              <div className="space-y-3" ref={provided.innerRef} {...provided.droppableProps}>
                {banks.map((bank, index) => {
                  const bankCards = getBankCards(bank, cards);
                  const periodTxs = filterTransactionsForBankPeriod(bank, cards, transactions);
                  const totalCharged = periodTxs.reduce((s, t) => s + Number(t.amount), 0);
                  const overCap = bank.spend_cap != null && Number(bank.spend_cap) > 0 && totalCharged > Number(bank.spend_cap);

                  return (
                    <Draggable key={bank.id} draggableId={bank.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <Card className={snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <Landmark className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base flex items-center gap-1.5">
                                  {bank.name}
                                  {overCap && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Over cap" />}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingBank(bank)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <DeleteConfirmButton label="this bank" onConfirm={() => deleteBank.mutate(bank.id)} />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <SpendProgressBlock config={bank} periodTransactions={periodTxs} />
                              <div className="flex flex-wrap gap-1.5">
                                {bankCards.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">No cards assigned yet</span>
                                ) : (
                                  bankCards.map((card) => (
                                    <span key={card.id} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                                      <CreditCardIcon className="h-3 w-3" />
                                      {card.name}
                                    </span>
                                  ))
                                )}
                              </div>
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

        {banks.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No banks yet. Add one above!</p>
        )}

        {banks.length > 0 && unassignedCards.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Not assigned to a bank: {unassignedCards.map((c) => c.name).join(", ")}
          </p>
        )}
      </main>

      <EditBankDialog bank={editingBank} open={!!editingBank} onOpenChange={(o) => !o && setEditingBank(null)} />
    </div>
  );
}

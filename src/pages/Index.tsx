import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreditCards, useDeleteCreditCard } from "@/hooks/useCreditCards";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useBudgetCategories, useDeleteBudgetCategory } from "@/hooks/useBudgetCategories";
import { useRecurringTransactions, useDeleteRecurringTransaction, useCreateFromRecurring } from "@/hooks/useRecurringTransactions";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import AddBudgetCategoryDialog from "@/components/AddBudgetCategoryDialog";
import AddRecurringTransactionDialog from "@/components/AddRecurringTransactionDialog";
import RecurringTransactionList from "@/components/RecurringTransactionList";
import CreditCardProgress from "@/components/CreditCardProgress";
import BudgetOverview from "@/components/BudgetOverview";
import TransactionList from "@/components/TransactionList";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet } from "lucide-react";

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const { data: cards = [] } = useCreditCards();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useBudgetCategories();
  const deleteCard = useDeleteCreditCard();
  const deleteTx = useDeleteTransaction();
  const deleteCat = useDeleteBudgetCategory();
  const { data: recurring = [] } = useRecurringTransactions();
  const deleteRec = useDeleteRecurringTransaction();
  const createFromRec = useCreateFromRecurring();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalCharged = monthlyTxs.reduce((s, t) => s + Number(t.amount), 0);
  const totalPersonal = monthlyTxs.reduce((s, t) => s + Number(t.personal_amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-heading font-bold">SpendTracker</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1.5 h-4 w-4" />Sign Out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Charged</p>
            <p className="mt-1 text-xl font-heading font-bold">${totalCharged.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Personal Spend</p>
            <p className="mt-1 text-xl font-heading font-bold">${totalPersonal.toFixed(2)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Others Owe You</p>
            <p className="mt-1 text-xl font-heading font-bold">${(totalCharged - totalPersonal).toFixed(2)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <AddTransactionDialog />
          <AddCreditCardDialog />
          <AddBudgetCategoryDialog />
          <AddRecurringTransactionDialog />
        </div>

        {/* Credit Cards */}
        {cards.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Credit Card Progress</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((card) => (
                <CreditCardProgress key={card.id} card={card} transactions={transactions} onDelete={(id) => deleteCard.mutate(id)} />
              ))}
            </div>
          </section>
        )}

        {/* Recurring Transactions */}
        <RecurringTransactionList
          recurring={recurring}
          onDelete={(id) => deleteRec.mutate(id)}
          onCreateNow={(rec) => createFromRec.mutate(rec)}
        />

        {/* Budget + Transactions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BudgetOverview categories={categories} transactions={transactions} onDeleteCategory={(id) => deleteCat.mutate(id)} />
          <TransactionList transactions={transactions} cards={cards} onDelete={(id) => deleteTx.mutate(id)} />
        </div>
      </main>
    </div>
  );
}

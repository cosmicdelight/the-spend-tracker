import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useBudgetCategories } from "@/hooks/useBudgetCategories";
import { useRecurringTransactions, useDeleteRecurringTransaction, useCreateFromRecurring } from "@/hooks/useRecurringTransactions";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import AddRecurringTransactionDialog from "@/components/AddRecurringTransactionDialog";
import RecurringTransactionList from "@/components/RecurringTransactionList";
import CreditCardProgress from "@/components/CreditCardProgress";
import BudgetOverview from "@/components/BudgetOverview";
import TransactionList from "@/components/TransactionList";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet, Settings, CreditCard, LayoutDashboard, PieChart } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const { data: cards = [] } = useCreditCards();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useBudgetCategories();
  const deleteTx = useDeleteTransaction();
  const { data: recurring = [] } = useRecurringTransactions();
  const deleteRec = useDeleteRecurringTransaction();
  const createFromRec = useCreateFromRecurring();
  const [tab, setTab] = useState<"dashboard" | "budget">("dashboard");

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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-heading font-bold">SpendTracker</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1.5 h-4 w-4" />Sign Out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl w-full flex-1 space-y-6 px-4 py-6 pb-20">
        {tab === "dashboard" &&
        <>
            {/* Summary row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground text-center">Total Charged</p>
                <p className="mt-1 text-xl font-heading font-bold text-center">${totalCharged.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground text-center">Personal Spend</p>
                <p className="mt-1 text-xl font-heading font-bold text-center">${totalPersonal.toFixed(2)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground text-center">Others Owe You</p>
                <p className="mt-1 text-xl font-heading font-bold text-center">${(totalCharged - totalPersonal).toFixed(2)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <AddTransactionDialog />
              <AddRecurringTransactionDialog />
              <Link to="/cards">
                <Button variant="outline" size="sm"><CreditCard className="mr-1 h-3 w-3" />Manage Cards</Button>
              </Link>
              <Link to="/categories">
                <Button variant="outline" size="sm"><Settings className="mr-1 h-3 w-3" />Manage Categories</Button>
              </Link>
            </div>

            {/* Credit Cards */}
            {cards.length > 0 &&
          <section>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Credit Card Progress</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {cards.map((card) =>
              <CreditCardProgress key={card.id} card={card} transactions={transactions} />
              )}
                </div>
              </section>
          }

            {/* Recurring Transactions */}
            <RecurringTransactionList
            recurring={recurring}
            onDelete={(id) => deleteRec.mutate(id)}
            onCreateNow={(rec) => createFromRec.mutate(rec)} />


            {/* Transactions */}
            <TransactionList transactions={transactions} cards={cards} onDelete={(id) => deleteTx.mutate(id)} />
          </>
        }

        {tab === "budget" &&
        <BudgetOverview categories={categories} transactions={transactions} />
        }
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl">
          <button
            type="button"
            onClick={() => setTab("dashboard")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "dashboard" ? "text-primary" : "text-muted-foreground"}`
            }>

            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setTab("budget")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "budget" ? "text-primary" : "text-muted-foreground"}`
            }>

            <PieChart className="h-5 w-5" />
            Budget
          </button>
        </div>
      </nav>
    </div>);

}
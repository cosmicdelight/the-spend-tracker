import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useBudgetCategories } from "@/hooks/useBudgetCategories";
import { useRecurringTransactions, useDeleteRecurringTransaction, useCreateFromRecurring } from "@/hooks/useRecurringTransactions";
import { useTransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";
import { useIncome } from "@/hooks/useIncome";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import ImportTransactionsDialog from "@/components/ImportTransactionsDialog";
import AddRecurringTransactionDialog from "@/components/AddRecurringTransactionDialog";
import AddRecurringIncomeDialog from "@/components/AddRecurringIncomeDialog";
import RecurringTransactionList from "@/components/RecurringTransactionList";
import CreditCardProgress from "@/components/CreditCardProgress";
import BudgetOverview from "@/components/BudgetOverview";
import TransactionList from "@/components/TransactionList";
import TransactionFieldSettings from "@/components/TransactionFieldSettings";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import ManagePaymentModesDialog from "@/components/ManagePaymentModesDialog";
import AddIncomeDialog from "@/components/AddIncomeDialog";
import IncomeList from "@/components/IncomeList";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet, Settings, CreditCard, LayoutDashboard, PieChart, List, TrendingUp } from "lucide-react";
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
  const { prefs: fieldPrefs, toggle: toggleField } = useTransactionFieldPrefs();
  const { data: income = [] } = useIncome();
  const [tab, setTab] = useState<"dashboard" | "transactions" | "income" | "budget">("dashboard");

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
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="text-lg font-heading font-bold truncate">SpendTracker</h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ChangePasswordDialog />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Sign Out</span>
            </Button>
          </div>
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

            {/* Dashboard quick-add */}
            <div className="flex flex-wrap gap-2">
              <AddTransactionDialog fieldPrefs={fieldPrefs} dashboardTrigger />
              <ImportTransactionsDialog />
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
        </>
        }

        {tab === "transactions" &&
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <AddTransactionDialog fieldPrefs={fieldPrefs} />
              <AddRecurringTransactionDialog />
              <Link to="/cards">
                <Button variant="outline" size="sm"><CreditCard className="mr-1 h-3 w-3" />Manage Cards</Button>
              </Link>
              <Link to="/categories">
                <Button variant="outline" size="sm"><Settings className="mr-1 h-3 w-3" />Manage Categories</Button>
              </Link>
              <ManagePaymentModesDialog />
              <TransactionFieldSettings prefs={fieldPrefs} onToggle={toggleField} />
            </div>
            <TransactionList transactions={transactions} cards={cards} fieldPrefs={fieldPrefs} />
          </div>
        }

        {tab === "income" &&
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <AddIncomeDialog />
              <AddRecurringIncomeDialog />
              <Link to="/income-categories">
                <Button variant="outline" size="sm"><Settings className="mr-1 h-3 w-3" />Manage Categories</Button>
              </Link>
            </div>
            <IncomeList income={income} />
          </div>
        }

        {tab === "budget" &&
          <BudgetOverview categories={categories} transactions={transactions} income={income} />
        }
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl">
          <button
            type="button"
            onClick={() => setTab("dashboard")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "dashboard" ? "text-primary" : "text-muted-foreground"}`}>
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setTab("transactions")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "transactions" ? "text-primary" : "text-muted-foreground"}`}>
            <List className="h-5 w-5" />
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setTab("income")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "income" ? "text-primary" : "text-muted-foreground"}`}>
            <TrendingUp className="h-5 w-5" />
            Income
          </button>
          <button
            type="button"
            onClick={() => setTab("budget")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "budget" ? "text-primary" : "text-muted-foreground"}`}>
            <PieChart className="h-5 w-5" />
            Stats
          </button>
        </div>
      </nav>
    </div>);
}

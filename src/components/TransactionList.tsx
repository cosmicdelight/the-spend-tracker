import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Search, X, Check, Users, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateTransaction, type Transaction } from "@/hooks/useTransactions";
import { useTransactionAttachmentIds } from "@/hooks/useTransactionAttachments";
import type { CreditCard } from "@/hooks/useCreditCards";
import type { TransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";
import { format, parseISO, isToday } from "date-fns";
import EditTransactionDialog from "./EditTransactionDialog";
import AddTransactionDialog, { type DuplicateTransactionData } from "./AddTransactionDialog";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  transactions: Transaction[];
  cards: CreditCard[];
  fieldPrefs: TransactionFieldPrefs;
}

export default function TransactionList({ transactions, cards, fieldPrefs }: Props) {

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [addTxDate, setAddTxDate] = useState<string | null>(null);
  const [duplicateData, setDuplicateData] = useState<DuplicateTransactionData | undefined>(undefined);
  const [settledFilter, setSettledFilter] = useState<'all' | 'unsettled' | 'settled'>('all');
  const updateTx = useUpdateTransaction();
  const { data: attachmentIds } = useTransactionAttachmentIds();

  const isSearching = search.trim().length > 0;

  const filtered = useMemo(() => {
    let base: Transaction[];
    if (isSearching) {
      const q = search.trim().toLowerCase();
      base = transactions.filter((t) =>
        (t.description ?? "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.sub_category ?? "").toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q)
      );
    } else {
      base = transactions.filter((t) => {
        const d = new Date(t.expense_date || t.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }
    if (settledFilter === 'unsettled') {
      base = base.filter((t) => Number(t.personal_amount) < Number(t.amount) && !t.settled_up);
    } else if (settledFilter === 'settled') {
      base = base.filter((t) => Number(t.personal_amount) < Number(t.amount) && t.settled_up);
    }
    return base;
  }, [transactions, selectedMonth, selectedYear, search, isSearching, settledFilter]);

  // Group by expense_date (falls back to date)
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = tx.expense_date || tx.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const goBack = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };

  const goForward = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  return (
    <>
      <Card>
      <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">Transactions</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack} disabled={isSearching}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                disabled={isSearching}
                className="rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
              >
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={isSearching}
                className="rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
              >
                {Array.from({ length: now.getFullYear() - 2020 + 2 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isSearching} onClick={goForward}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
                className={`rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${(isCurrentMonth || isSearching) ? "invisible pointer-events-none" : ""}`}
              >
                Today
              </button>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by description, category, sub-category, or notes…"
                className="pl-8 pr-8 h-9 text-sm"
              />
              {isSearching && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant={settledFilter === 'unsettled' ? "default" : "outline"}
              size="sm"
              className="h-9 shrink-0"
              onClick={() => setSettledFilter((v) => v === 'unsettled' ? 'all' : 'unsettled')}
              title="Show only unsettled split expenses"
            >
              <Users className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Unsettled</span>
            </Button>
            <Button
              type="button"
              variant={settledFilter === 'settled' ? "default" : "outline"}
              size="sm"
              className="h-9 shrink-0"
              onClick={() => setSettledFilter((v) => v === 'settled' ? 'all' : 'settled')}
              title="Show only settled split expenses"
            >
              <Check className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Settled</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isSearching ? `No transactions matching "${search}".` : "No transactions this month."}
            </p>
          )}
          <div className="space-y-4">
            {grouped.map(([date, txs]) => {
              const today = isToday(parseISO(date));
              const dayTotal = txs.reduce((s, tx) => s + Number(tx.amount), 0);
              const dayPersonal = txs.reduce((s, tx) => s + Number(tx.personal_amount), 0);
              return (
              <div key={date}>
                <button
                  type="button"
                  onClick={() => setAddTxDate(date)}
                  className={`mb-1.5 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                    today
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{format(parseISO(date), isSearching ? "EEEE, d MMM yyyy" : "EEEE, d MMM")}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {today && (
                      <span className="text-[10px] font-bold uppercase tracking-wider">Today</span>
                    )}
                    {fieldPrefs.dailyTotals && (
                      <span>
                        ${dayTotal.toFixed(2)}
                        {dayPersonal !== dayTotal && (
                          <span className={`ml-1 font-normal ${today ? "opacity-80" : ""}`}>
                            (${dayPersonal.toFixed(2)} yours)
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
                <div className="space-y-2">
                  {txs.map((tx) => {
                    const isSplit = Number(tx.personal_amount) !== Number(tx.amount);
                    const hasDifferentChargeDate = tx.expense_date && tx.expense_date !== tx.date;
                    return (
                      <div key={tx.id} className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setEditingTx(tx)}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm truncate min-w-0 flex-1 mr-2">
                            <span className="truncate">{tx.description || tx.category}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {attachmentIds?.has(tx.id) && (
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-label="Has attachments" />
                            )}
                            <span className="text-sm font-semibold">${Number(tx.amount).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{tx.category}</span>
                            <span>·</span>
                            <span className="capitalize">{tx.payment_mode.replace("_", " ")}</span>
                          </div>
                          {isSplit && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-muted-foreground">Yours: ${Number(tx.personal_amount).toFixed(2)}</span>
                          {tx.settled_up ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground">
                              <Check className="h-3 w-3" />
                              Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              Owed
                            </span>
                          )}
                            </div>
                          )}
                        </div>
                        {hasDifferentChargeDate && (
                          <p className="mt-1 text-[11px] text-muted-foreground italic">
                            Charged {format(parseISO(tx.date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
            })}
          </div>
        </CardContent>
      </Card>
      <EditTransactionDialog
        transaction={editingTx}
        open={!!editingTx}
        onOpenChange={(o) => !o && setEditingTx(null)}
        fieldPrefs={fieldPrefs}
        onDuplicate={(data) => setDuplicateData(data)}
      />
      <AddTransactionDialog
        fieldPrefs={fieldPrefs}
        initialDate={addTxDate ?? undefined}
        initialData={duplicateData}
        externalOpen={!!addTxDate || !!duplicateData}
        onExternalOpenChange={(o) => { if (!o) { setAddTxDate(null); setDuplicateData(undefined); } }}
        defaultType="expense"
      />
    </>
  );
}

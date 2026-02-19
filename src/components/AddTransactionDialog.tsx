import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { Plus, Settings } from "lucide-react";
import { useAddTransaction, useDescriptionSuggestions } from "@/hooks/useTransactions";
import { useAddIncome } from "@/hooks/useIncome";
import DescriptionAutocomplete from "@/components/DescriptionAutocomplete";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBudgetCategories } from "@/hooks/useBudgetCategories";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { usePaymentModes } from "@/hooks/usePaymentModes";
import { useToast } from "@/hooks/use-toast";
import type { TransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";
import { Link } from "react-router-dom";

interface Props {
  fieldPrefs: TransactionFieldPrefs;
  /** If provided, shows a plain trigger button styled for the dashboard */
  dashboardTrigger?: boolean;
  /** Force the dialog to open on a specific type */
  defaultType?: "expense" | "income";
}

export default function AddTransactionDialog({ fieldPrefs, dashboardTrigger, defaultType }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">(defaultType ?? "expense");

  // Expense fields
  const [amount, setAmount] = useState("");
  const [personalAmount, setPersonalAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("credit_card");
  const [creditCardId, setCreditCardId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("SGD");

  // Income-only fields
  const [incomeCategory, setIncomeCategory] = useState("");
  const [incomeSubCategory, setIncomeSubCategory] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeNotes, setIncomeNotes] = useState("");

  const [errors, setErrors] = useState<string[]>([]);

  const addTx = useAddTransaction();
  const addIncome = useAddIncome();
  const descriptionSuggestions = useDescriptionSuggestions();
  const { data: cards } = useCreditCards();
  const { data: categories } = useBudgetCategories();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: paymentModes = [] } = usePaymentModes();
  const { convertToSGD, currencies, loading: ratesLoading } = useCurrencyConversion();
  const { toast } = useToast();

  // Expense derived
  const hasSubs = fieldPrefs.subCategory && (categories?.some((c) => c.name === category && c.sub_category_name) ?? false);
  const amtNum = parseFloat(amount) || 0;
  const personalNum = personalAmount ? parseFloat(personalAmount) || 0 : amtNum;
  const activeCurrency = fieldPrefs.currency ? currency : "SGD";
  const sgdAmount = activeCurrency !== "SGD" ? convertToSGD(amtNum, activeCurrency) : amtNum;
  const sgdPersonal = activeCurrency !== "SGD" ? convertToSGD(personalNum, activeCurrency) : personalNum;

  // Income derived
  const incomeAmtNum = parseFloat(amount) || 0;
  const incomeSgdAmount = activeCurrency !== "SGD" ? convertToSGD(incomeAmtNum, activeCurrency) : incomeAmtNum;
  const incomeHasSubs = incomeCategories.some((c) => c.name === incomeCategory && c.sub_category_name);
  const incomeSubOptions = incomeCategories
    .filter((c) => c.name === incomeCategory && c.sub_category_name)
    .sort((a, b) => a.sub_category_name!.localeCompare(b.sub_category_name!))
    .map((c) => ({ value: c.sub_category_name!, label: c.sub_category_name! }));

  const resetAll = () => {
    setAmount(""); setPersonalAmount(""); setDescription(""); setCreditCardId(""); setNotes("");
    setCategory(""); setSubCategory(""); setCurrency("SGD");
    setIncomeCategory(""); setIncomeSubCategory(""); setIncomeDescription(""); setIncomeNotes("");
    setErrors([]);
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (!o) resetAll();
  };

  const handleSwitchType = (t: "expense" | "income") => {
    setType(t);
    setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (type === "expense") {
      if (amtNum <= 0) newErrors.push("Amount must be greater than 0.");
      if (!category) newErrors.push("Please select a category.");
      if (!description.trim()) newErrors.push("Please enter a description.");
      if (fieldPrefs.creditCard && paymentMode === "credit_card" && !creditCardId)
        newErrors.push("Please select a credit card.");
      if (newErrors.length > 0) { setErrors(newErrors); return; }
      setErrors([]);

      addTx.mutate(
        {
          amount: sgdAmount,
          personal_amount: sgdPersonal,
          date,
          category,
          payment_mode: paymentMode,
          credit_card_id: fieldPrefs.creditCard && paymentMode === "credit_card" && creditCardId ? creditCardId : null,
          description: description || null,
          notes: fieldPrefs.notes ? (notes || null) : null,
          sub_category: fieldPrefs.subCategory ? (subCategory || null) : null,
          original_currency: activeCurrency,
          original_amount: amtNum,
        },
        {
          onSuccess: () => {
            toast({ title: "Expense added" });
            setOpen(false);
            resetAll();
          },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      if (incomeAmtNum <= 0) newErrors.push("Amount must be greater than 0.");
      if (!incomeCategory.trim()) newErrors.push("Please select a category.");
      if (newErrors.length > 0) { setErrors(newErrors); return; }
      setErrors([]);

      addIncome.mutate(
        {
          amount: incomeSgdAmount,
          original_amount: incomeAmtNum,
          original_currency: activeCurrency,
          date,
          category: incomeCategory.trim(),
          sub_category: incomeSubCategory || null,
          description: incomeDescription.trim() || null,
          notes: incomeNotes.trim() || null,
        },
        {
          onSuccess: () => {
            toast({ title: "Income added" });
            setOpen(false);
            resetAll();
          },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    }
  };

  const isPending = addTx.isPending || addIncome.isPending;

  const trigger = dashboardTrigger ? (
    <Button><Plus className="mr-1.5 h-3.5 w-3.5" />Add Transaction</Button>
  ) : (
    <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>

        {/* Expense / Income toggle */}
        <div className="flex rounded-lg border p-1 gap-1">
          <button
            type="button"
            onClick={() => handleSwitchType("expense")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              type === "expense"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => handleSwitchType("income")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              type === "income"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Currency (shared) */}
          {fieldPrefs.currency && (
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount (shared) */}
          {type === "expense" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Amount {activeCurrency !== "SGD" ? `(${activeCurrency})` : ""}</Label>
                <Input type="number" step="0.01" min="0" placeholder="200.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Your Share {activeCurrency !== "SGD" ? `(${activeCurrency})` : ""}</Label>
                <Input type="number" step="0.01" min="0" placeholder="Same as total" value={personalAmount} onChange={(e) => setPersonalAmount(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Amount {activeCurrency !== "SGD" ? `(${activeCurrency})` : ""}</Label>
              <Input type="number" step="0.01" min="0" placeholder="5000.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          )}

          {activeCurrency !== "SGD" && amtNum > 0 && (
            <p className="text-xs text-muted-foreground">
              ≈ SGD {(type === "expense" ? sgdAmount : incomeSgdAmount).toFixed(2)}
              {type === "expense" && personalAmount ? ` (personal: SGD ${sgdPersonal.toFixed(2)})` : ""}
              {ratesLoading && " (loading rates...)"}
            </p>
          )}

          {/* Date (shared) */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {/* ── EXPENSE FIELDS ── */}
          {type === "expense" && (
            <>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {fieldPrefs.creditCard && paymentMode === "credit_card" && (
                <div className="space-y-1.5">
                  <Label>Credit Card</Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                    <SelectContent>
                      {cards?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <SearchableSelect
                  options={[...new Set(categories?.map((c) => c.name))].sort().map((name) => ({ value: name, label: name }))}
                  value={category}
                  onValueChange={(v) => { setCategory(v); setSubCategory(""); }}
                  placeholder="Select category"
                />
              </div>
              {hasSubs && (
                <div className="space-y-1.5">
                  <Label>Sub-category</Label>
                  <SearchableSelect
                    options={
                      categories
                        ?.filter((c) => c.name === category && c.sub_category_name)
                        .sort((a, b) => a.sub_category_name!.localeCompare(b.sub_category_name!))
                        .map((c) => ({ value: c.sub_category_name!, label: c.sub_category_name! })) ?? []
                    }
                    value={subCategory}
                    onValueChange={setSubCategory}
                    placeholder="Select sub-category"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Description</Label>
                <DescriptionAutocomplete
                  value={description}
                  onChange={setDescription}
                  suggestions={descriptionSuggestions}
                  placeholder="Dinner with friends"
                  required
                />
              </div>
              {fieldPrefs.notes && (
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" />
                </div>
              )}
            </>
          )}

          {/* ── INCOME FIELDS ── */}
          {type === "income" && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Category</Label>
                  <Link
                    to="/income-categories"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings className="h-3 w-3" />Manage
                  </Link>
                </div>
                <SearchableSelect
                  options={[...new Set(incomeCategories.map((c) => c.name))].sort().map((name) => ({ value: name, label: name }))}
                  value={incomeCategory}
                  onValueChange={(v) => { setIncomeCategory(v); setIncomeSubCategory(""); }}
                  placeholder="Select category"
                />
              </div>
              {incomeHasSubs && (
                <div className="space-y-1.5">
                  <Label>Sub-category (optional)</Label>
                  <SearchableSelect
                    options={incomeSubOptions}
                    value={incomeSubCategory}
                    onValueChange={setIncomeSubCategory}
                    placeholder="Select sub-category"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input value={incomeDescription} onChange={(e) => setIncomeDescription(e.target.value)} placeholder="Add a note" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input value={incomeNotes} onChange={(e) => setIncomeNotes(e.target.value)} placeholder="Additional details" />
              </div>
            </>
          )}

          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-destructive">{err}</p>
              ))}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Adding..." : type === "expense" ? "Add Expense" : "Add Income"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

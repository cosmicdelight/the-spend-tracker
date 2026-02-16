import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateTransaction, type Transaction } from "@/hooks/useTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBudgetCategories } from "@/hooks/useBudgetCategories";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_MODES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "paynow", label: "PayNow" },
  { value: "giro", label: "GIRO" },
];

interface Props {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTransactionDialog({ transaction, open, onOpenChange }: Props) {
  const [amount, setAmount] = useState("");
  const [personalAmount, setPersonalAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("credit_card");
  const [creditCardId, setCreditCardId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("SGD");

  const updateTx = useUpdateTransaction();
  const { data: cards } = useCreditCards();
  const { data: categories } = useBudgetCategories();
  const { convertToSGD, currencies, loading: ratesLoading } = useCurrencyConversion();
  const { toast } = useToast();

  useEffect(() => {
    if (transaction) {
      const cur = transaction.original_currency || "SGD";
      setCurrency(cur);
      if (cur !== "SGD" && transaction.original_amount > 0) {
        setAmount(String(transaction.original_amount));
        // Derive personal share ratio from SGD amounts
        const ratio = transaction.amount > 0 ? transaction.personal_amount / transaction.amount : 1;
        const origPersonal = transaction.original_amount * ratio;
        setPersonalAmount(ratio < 1 ? String(Math.round(origPersonal * 100) / 100) : "");
      } else {
        setAmount(String(transaction.amount));
        setPersonalAmount(String(transaction.personal_amount));
      }
      setDate(transaction.date);
      setCategory(transaction.category);
      setSubCategory(transaction.sub_category || "");
      setPaymentMode(transaction.payment_mode);
      setCreditCardId(transaction.credit_card_id || "");
      setDescription(transaction.description || "");
      setNotes(transaction.notes || "");
    }
  }, [transaction]);

  const hasSubs = categories?.some((c) => c.name === category && c.sub_category_name) ?? false;

  const amtNum = parseFloat(amount) || 0;
  const personalNum = personalAmount ? parseFloat(personalAmount) || 0 : amtNum;
  const sgdAmount = currency !== "SGD" ? convertToSGD(amtNum, currency) : amtNum;
  const sgdPersonal = currency !== "SGD" ? convertToSGD(personalNum, currency) : personalNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    if (amtNum <= 0 || !category || !description.trim()) return;
    if (paymentMode === "credit_card" && !creditCardId) return;

    updateTx.mutate(
      {
        id: transaction.id,
        amount: sgdAmount,
        personal_amount: sgdPersonal,
        date,
        category,
        payment_mode: paymentMode,
        credit_card_id: paymentMode === "credit_card" && creditCardId ? creditCardId : null,
        description: description || null,
        notes: notes || null,
        sub_category: subCategory || null,
        original_currency: currency,
        original_amount: amtNum,
      },
      {
        onSuccess: () => {
          toast({ title: "Transaction updated" });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total Amount {currency !== "SGD" ? `(${currency})` : ""}</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Your Share {currency !== "SGD" ? `(${currency})` : ""}</Label>
              <Input type="number" step="0.01" min="0" placeholder="Same as total" value={personalAmount} onChange={(e) => setPersonalAmount(e.target.value)} />
            </div>
          </div>
          {currency !== "SGD" && amtNum > 0 && (
            <p className="text-xs text-muted-foreground">
              ≈ SGD {sgdAmount.toFixed(2)}{personalAmount ? ` (personal: SGD ${sgdPersonal.toFixed(2)})` : ""}
              {ratesLoading && " (loading rates...)"}
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {paymentMode === "credit_card" && (
            <div className="space-y-1.5">
              <Label>Credit Card</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId} required>
                <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                <SelectContent>
                  {cards?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setSubCategory(""); }} required>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {[...new Set(categories?.map((c) => c.name))].map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasSubs && (
            <div className="space-y-1.5">
              <Label>Sub-category</Label>
              <Select value={subCategory} onValueChange={setSubCategory}>
                <SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                <SelectContent>
                  {categories
                    ?.filter((c) => c.name === category && c.sub_category_name)
                    .sort((a, b) => a.sub_category_name!.localeCompare(b.sub_category_name!))
                    .map((c) => <SelectItem key={c.id} value={c.sub_category_name!}>{c.sub_category_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner with friends" required />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" />
          </div>
          <Button type="submit" className="w-full" disabled={updateTx.isPending}>
            {updateTx.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

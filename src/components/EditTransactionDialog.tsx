import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { useUpdateTransaction, useDeleteTransaction, useDescriptionSuggestions, type Transaction } from "@/hooks/useTransactions";
import DescriptionAutocomplete from "@/components/DescriptionAutocomplete";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBudgetCategories } from "@/hooks/useBudgetCategories";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { usePaymentModes } from "@/hooks/usePaymentModes";
import { useToast } from "@/hooks/use-toast";
import type { TransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";

interface Props {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldPrefs?: TransactionFieldPrefs;
}

const defaultPrefs: TransactionFieldPrefs = { currency: true, creditCard: true, subCategory: true, notes: true };

export default function EditTransactionDialog({ transaction, open, onOpenChange, fieldPrefs = defaultPrefs }: Props) {
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
  const descriptionSuggestions = useDescriptionSuggestions();
  const deleteTx = useDeleteTransaction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: cards } = useCreditCards();
  const { data: categories } = useBudgetCategories();
  const { data: paymentModes = [] } = usePaymentModes();
  const { convertToSGD, currencies, loading: ratesLoading } = useCurrencyConversion();
  const { toast } = useToast();

  useEffect(() => {
    if (transaction) {
      setConfirmDelete(false);
      const cur = transaction.original_currency || "SGD";
      setCurrency(cur);
      if (cur !== "SGD" && transaction.original_amount > 0) {
        setAmount(String(transaction.original_amount));
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

  const hasSubs = fieldPrefs.subCategory && (categories?.some((c) => c.name === category && c.sub_category_name) ?? false);

  const amtNum = parseFloat(amount) || 0;
  const personalNum = personalAmount ? parseFloat(personalAmount) || 0 : amtNum;
  const activeCurrency = fieldPrefs.currency ? currency : "SGD";
  const sgdAmount = activeCurrency !== "SGD" ? convertToSGD(amtNum, activeCurrency) : amtNum;
  const sgdPersonal = activeCurrency !== "SGD" ? convertToSGD(personalNum, activeCurrency) : personalNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    if (amtNum <= 0 || !category || !description.trim()) return;
    if (fieldPrefs.creditCard && paymentMode === "credit_card" && !creditCardId) return;

    updateTx.mutate(
      {
        id: transaction.id,
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
          toast({ title: "Transaction updated" });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total Amount {activeCurrency !== "SGD" ? `(${activeCurrency})` : ""}</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Your Share {activeCurrency !== "SGD" ? `(${activeCurrency})` : ""}</Label>
              <Input type="number" step="0.01" min="0" placeholder="Same as total" value={personalAmount} onChange={(e) => setPersonalAmount(e.target.value)} />
            </div>
          </div>
          {activeCurrency !== "SGD" && amtNum > 0 && (
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
                {paymentModes.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {fieldPrefs.creditCard && paymentMode === "credit_card" && (
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
          <div className="flex gap-2">
            {!confirmDelete ? (
              <Button type="button" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={deleteTx.isPending}
                onClick={() => {
                  if (!transaction) return;
                  deleteTx.mutate(transaction.id, {
                    onSuccess: () => {
                      toast({ title: "Transaction deleted" });
                      setConfirmDelete(false);
                      onOpenChange(false);
                    },
                    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                  });
                }}
              >
                {deleteTx.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={updateTx.isPending}>
              {updateTx.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

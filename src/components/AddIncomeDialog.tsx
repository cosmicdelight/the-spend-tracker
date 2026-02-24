import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { Plus, Settings } from "lucide-react";
import { useAddIncome } from "@/hooks/useIncome";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";
import { Link } from "react-router-dom";

export default function AddIncomeDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SGD");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const addIncome = useAddIncome();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { convertToSGD, currencies, loading: ratesLoading } = useCurrencyConversion();
  const { toast } = useToast();

  const amtNum = parseFloat(amount) || 0;
  const sgdAmount = currency !== "SGD" ? convertToSGD(amtNum, currency) : amtNum;

  const categoryOptions = [...new Set(incomeCategories.map((c) => c.name))].sort()
    .map((name) => ({ value: name, label: name }));

  const hasSubs = incomeCategories.some((c) => c.name === category && c.sub_category_name);
  const subOptions = incomeCategories
    .filter((c) => c.name === category && c.sub_category_name)
    .sort((a, b) => a.sub_category_name!.localeCompare(b.sub_category_name!))
    .map((c) => ({ value: c.sub_category_name!, label: c.sub_category_name! }));

  const reset = () => {
    setAmount(""); setCurrency("SGD"); setDate(new Date().toISOString().split("T")[0]);
    setCategory(""); setSubCategory(""); setDescription(""); setNotes(""); setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];
    if (amtNum <= 0) newErrors.push("Amount must be greater than 0.");
    if (!category.trim()) newErrors.push("Please select a category.");
    if (newErrors.length > 0) { setErrors(newErrors); return; }
    setErrors([]);

    addIncome.mutate(
      {
        amount: sgdAmount,
        original_amount: amtNum,
        original_currency: currency,
        date,
        category: category.trim(),
        sub_category: subCategory || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Income added" });
          setOpen(false);
          reset();
        },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />Add Income
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Income Entry</DialogTitle></DialogHeader>
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
          <div className="space-y-1.5">
            <Label>Amount {currency !== "SGD" ? `(${currency})` : ""}</Label>
            <Input
              type="number" step="0.01" min="0" placeholder="5000.00"
              value={amount} onChange={(e) => setAmount(e.target.value)} required
            />
            {currency !== "SGD" && amtNum > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ SGD {sgdAmount.toFixed(2)}{ratesLoading ? " (loading rates...)" : ""}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
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
              options={categoryOptions}
              value={category}
              onValueChange={(v) => { setCategory(v); setSubCategory(""); }}
              placeholder="Select category"
            />
          </div>
          {hasSubs && (
            <div className="space-y-1.5">
              <Label>Sub-category (optional)</Label>
              <SearchableSelect
                options={subOptions}
                value={subCategory}
                onValueChange={setSubCategory}
                placeholder="Select sub-category"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a note" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details" />
          </div>
          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
              {errors.map((err, i) => <p key={i} className="text-sm text-destructive">{err}</p>)}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={addIncome.isPending}>
            {addIncome.isPending ? "Adding..." : "Add Income"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

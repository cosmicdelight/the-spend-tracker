import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useAddIncome } from "@/hooks/useIncome";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useToast } from "@/hooks/use-toast";

export default function AddIncomeDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SGD");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const addIncome = useAddIncome();
  const { convertToSGD, currencies, loading: ratesLoading } = useCurrencyConversion();
  const { toast } = useToast();

  const amtNum = parseFloat(amount) || 0;
  const sgdAmount = currency !== "SGD" ? convertToSGD(amtNum, currency) : amtNum;

  const reset = () => {
    setAmount(""); setCurrency("SGD"); setDate(new Date().toISOString().split("T")[0]);
    setSource(""); setDescription(""); setNotes(""); setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];
    if (amtNum <= 0) newErrors.push("Amount must be greater than 0.");
    if (!source.trim()) newErrors.push("Please enter a source.");
    if (newErrors.length > 0) { setErrors(newErrors); return; }
    setErrors([]);

    addIncome.mutate(
      {
        amount: sgdAmount,
        original_amount: amtNum,
        original_currency: currency,
        date,
        source: source.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Income added" });
          setOpen(false);
          reset();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
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
            <Label>Source</Label>
            <Input
              value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Salary, Freelance, Investment" required
            />
          </div>
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

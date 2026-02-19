import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DeleteConfirmButton from "@/components/DeleteConfirmButton";
import { useUpdateIncome, useDeleteIncome } from "@/hooks/useIncome";
import type { IncomeEntry } from "@/hooks/useIncome";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useToast } from "@/hooks/use-toast";

interface Props {
  entry: IncomeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditIncomeDialog({ entry, open, onOpenChange }: Props) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SGD");
  const [date, setDate] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();
  const { convertToSGD, currencies, loading: ratesLoading } = useCurrencyConversion();
  const { toast } = useToast();

  useEffect(() => {
    if (entry) {
      setAmount(String(entry.original_amount));
      setCurrency(entry.original_currency);
      setDate(entry.date);
      setSource(entry.source);
      setDescription(entry.description || "");
      setNotes(entry.notes || "");
      setErrors([]);
    }
  }, [entry]);

  const amtNum = parseFloat(amount) || 0;
  const sgdAmount = currency !== "SGD" ? convertToSGD(amtNum, currency) : amtNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    const newErrors: string[] = [];
    if (amtNum <= 0) newErrors.push("Amount must be greater than 0.");
    if (!source.trim()) newErrors.push("Please enter a source.");
    if (newErrors.length > 0) { setErrors(newErrors); return; }
    setErrors([]);

    updateIncome.mutate(
      {
        id: entry.id,
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
          toast({ title: "Income updated" });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!entry) return;
    deleteIncome.mutate(entry.id, {
      onSuccess: () => {
        toast({ title: "Income deleted" });
        onOpenChange(false);
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Edit Income</DialogTitle>
            <DeleteConfirmButton onConfirm={handleDelete} label="this income entry" />
          </div>
        </DialogHeader>
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
          <Button type="submit" className="w-full" disabled={updateIncome.isPending}>
            {updateIncome.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

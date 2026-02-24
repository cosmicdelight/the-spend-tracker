import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Repeat } from "lucide-react";
import { useAddRecurringTransaction } from "@/hooks/useRecurringTransactions";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AddRecurringIncomeDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split("T")[0]);

  const addRec = useAddRecurringTransaction();
  const { data: categories } = useIncomeCategories();
  const { toast } = useToast();

  const hasSubs = categories?.some((c) => c.name === category && c.sub_category_name) ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !category || !description.trim()) return;

    addRec.mutate(
      {
        transaction_type: "income",
        amount: amt,
        personal_amount: amt,
        category,
        sub_category: subCategory || null,
        payment_mode: "cash",
        credit_card_id: null,
        description: description || null,
        notes: notes || null,
        frequency,
        day_of_week: frequency === "weekly" ? parseInt(dayOfWeek) : null,
        day_of_month: frequency === "monthly" ? parseInt(dayOfMonth) : null,
        is_active: true,
        auto_generate: autoGenerate,
        next_due_date: nextDueDate,
      },
      {
        onSuccess: () => {
          toast({ title: "Recurring income added" });
          setOpen(false);
          setAmount(""); setDescription(""); setNotes(""); setCategory(""); setSubCategory("");
        },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Repeat className="mr-1 h-3 w-3" />Recurring</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Recurring Income</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" step="0.01" min="0" placeholder="5000.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              {frequency === "weekly" ? (
                <>
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Label>Day of Month</Label>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Next Due Date</Label>
            <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} required />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Auto-generate</Label>
              <p className="text-xs text-muted-foreground">Automatically create income on schedule</p>
            </div>
            <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
          </div>

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
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Monthly salary" required />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" />
          </div>
          <Button type="submit" className="w-full" disabled={addRec.isPending}>
            {addRec.isPending ? "Adding..." : "Add Recurring Income"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

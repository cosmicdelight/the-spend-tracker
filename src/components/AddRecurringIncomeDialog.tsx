import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repeat } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";
import { generateRecurringDates } from "@/lib/recurringDates";

export default function AddRecurringIncomeDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
  const [occurrences, setOccurrences] = useState("12");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: categories } = useIncomeCategories();
  const { toast } = useToast();

  const hasSubs = categories?.some((c) => c.name === category && c.sub_category_name) ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    const count = parseInt(occurrences);
    if (isNaN(amt) || amt < 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (!category) { toast({ title: "Please select a category", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Please enter a description", variant: "destructive" }); return; }
    if (isNaN(count) || count < 1 || count > 60) { toast({ title: "Occurrences must be between 1 and 60", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const dates = generateRecurringDates(startDate, frequency, count);
      const rows = dates.map((date) => ({
        user_id: user.id,
        amount: amt,
        original_amount: amt,
        original_currency: "SGD",
        category,
        sub_category: subCategory || null,
        description: description || null,
        notes: notes || null,
        date,
      }));
      const { error } = await supabase.from("income").insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["income"] });
      toast({ title: `Created ${count} income entries` });
      setOpen(false);
      setAmount(""); setDescription(""); setNotes(""); setCategory(""); setSubCategory(""); setOccurrences("12");
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
              <Select value={frequency} onValueChange={(v) => setFrequency(v as "weekly" | "monthly")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Occurrences</Label>
              <Input type="number" min="1" max="60" value={occurrences} onChange={(e) => setOccurrences(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <p className="text-xs text-muted-foreground">
              {(() => {
                const c = parseInt(occurrences);
                if (isNaN(c) || c < 1) return "All entries will be created up front.";
                const dates = generateRecurringDates(startDate, frequency, Math.min(c, 60));
                return `Creates ${c} income entries, ${frequency}, from ${dates[0]} to ${dates[dates.length - 1]}.`;
              })()}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <SearchableSelect
              options={[...new Set(categories?.map((c) => c.name))].map((name) => ({ value: name, label: name }))}
              value={category}
              onValueChange={(v) => { setCategory(v); setSubCategory(""); }}
              placeholder="Select category"
            />
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
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" className="min-h-[60px]" />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Income Entries"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

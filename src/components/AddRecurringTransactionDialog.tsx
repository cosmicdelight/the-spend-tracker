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
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBudgetCategories } from "@/hooks/useBudgetCategories";
import { usePaymentModes } from "@/hooks/usePaymentModes";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";
import { generateRecurringDates } from "@/lib/recurringDates";
import SearchableSelect from "@/components/SearchableSelect";

export default function AddRecurringTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [personalAmount, setPersonalAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("credit_card");
  const [creditCardId, setCreditCardId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
  const [occurrences, setOccurrences] = useState("12");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: cards } = useCreditCards();
  const { data: categories } = useBudgetCategories();
  const { data: paymentModes = [] } = usePaymentModes();
  const { toast } = useToast();

  const hasSubs = categories?.some((c) => c.name === category && c.sub_category_name) ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    const personal = personalAmount ? parseFloat(personalAmount) : amt;
    const count = parseInt(occurrences);
    if (isNaN(amt) || amt < 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (!category) { toast({ title: "Please select a category", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Please enter a description", variant: "destructive" }); return; }
    if (paymentMode === "credit_card" && !creditCardId) { toast({ title: "Please select a credit card", variant: "destructive" }); return; }
    if (isNaN(count) || count < 1 || count > 60) { toast({ title: "Occurrences must be between 1 and 60", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const dates = generateRecurringDates(startDate, frequency, count);
      const rows = dates.map((date) => ({
        user_id: user.id,
        amount: amt,
        personal_amount: personal,
        original_amount: amt,
        original_currency: "SGD",
        category,
        sub_category: subCategory || null,
        payment_mode: paymentMode,
        credit_card_id: paymentMode === "credit_card" && creditCardId ? creditCardId : null,
        description: description || null,
        notes: notes || null,
        date,
      }));
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: `Created ${count} transactions` });
      setOpen(false);
      setAmount(""); setPersonalAmount(""); setDescription(""); setCreditCardId("");
      setNotes(""); setCategory(""); setSubCategory(""); setOccurrences("12");
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Repeat className="mr-2 h-4 w-4" />Recurring</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Recurring Transaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="200.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Your Share</Label>
              <Input type="number" step="0.01" min="0" placeholder="Same as total" value={personalAmount} onChange={(e) => setPersonalAmount(e.target.value)} />
            </div>
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
                if (isNaN(c) || c < 1) return "All transactions will be created up front.";
                const dates = generateRecurringDates(startDate, frequency, Math.min(c, 60));
                return `Creates ${c} transactions, ${frequency}, from ${dates[0]} to ${dates[dates.length - 1]}.`;
              })()}
            </p>
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
              <SearchableSelect
                options={categories
                  ?.filter((c) => c.name === category && c.sub_category_name)
                  .sort((a, b) => a.sub_category_name!.localeCompare(b.sub_category_name!))
                  .map((c) => ({ value: c.sub_category_name!, label: c.sub_category_name! })) ?? []}
                value={subCategory}
                onValueChange={setSubCategory}
                placeholder="Select sub-category"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Netflix subscription" required />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" className="min-h-[60px]" />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Transactions"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

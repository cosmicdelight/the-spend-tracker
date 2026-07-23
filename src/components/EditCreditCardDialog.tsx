import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateCreditCard, type CreditCard } from "@/hooks/useCreditCards";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";

interface Props {
  card: CreditCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCreditCardDialog({ card, open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [cap, setCap] = useState("");
  const [months, setMonths] = useState("");
  const [startDate, setStartDate] = useState("");
  const update = useUpdateCreditCard();
  const { toast } = useToast();

  useEffect(() => {
    if (card) {
      setName(card.name);
      setTarget(String(card.spend_target));
      setCap(card.spend_cap == null ? "" : String(card.spend_cap));
      setMonths(String(card.time_period_months));
      setStartDate(card.start_date);
    }
  }, [card, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    const targetNum = target === "" ? 0 : parseFloat(target);
    const capNum = cap === "" ? null : parseFloat(cap);
    if (capNum !== null && targetNum > 0 && capNum < targetNum) {
      toast({ title: "Invalid cap", description: "Maximum spend cap must be greater than or equal to the minimum spend target.", variant: "destructive" });
      return;
    }
    update.mutate(
      { id: card.id, name, spend_target: targetNum, spend_cap: capNum, time_period_months: parseInt(months), start_date: startDate },
      {
        onSuccess: () => { toast({ title: "Card updated" }); onOpenChange(false); },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Credit Card</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Card Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Minimum Spend Target ($) <span className="text-muted-foreground font-normal">— optional</span></Label><Input type="number" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Maximum Spend Cap ($) <span className="text-muted-foreground font-normal">— optional</span></Label><Input type="number" step="0.01" min="0" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="e.g. 2000 bonus cap" /></div>
          <div className="space-y-1.5"><Label>Time Period (months)</Label><Input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save Changes"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

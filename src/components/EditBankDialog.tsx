import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateBank, type Bank } from "@/hooks/useBanks";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";

interface Props {
  bank: Bank | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditBankDialog({ bank, open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [cap, setCap] = useState("");
  const [months, setMonths] = useState("");
  const [startDate, setStartDate] = useState("");
  const update = useUpdateBank();
  const { toast } = useToast();

  useEffect(() => {
    if (bank) {
      setName(bank.name);
      setTarget(String(bank.spend_target));
      setCap(bank.spend_cap == null ? "" : String(bank.spend_cap));
      setMonths(String(bank.time_period_months));
      setStartDate(bank.start_date);
    }
  }, [bank, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank) return;
    const targetNum = target === "" ? 0 : parseFloat(target);
    const capNum = cap === "" ? null : parseFloat(cap);
    if (capNum !== null && targetNum > 0 && capNum < targetNum) {
      toast({ title: "Invalid cap", description: "Maximum spend cap must be greater than or equal to the minimum spend target.", variant: "destructive" });
      return;
    }
    update.mutate(
      { id: bank.id, name, spend_target: targetNum, spend_cap: capNum, time_period_months: parseInt(months), start_date: startDate },
      {
        onSuccess: () => { toast({ title: "Bank updated" }); onOpenChange(false); },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Bank</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Bank Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
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

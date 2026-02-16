import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useAddCreditCard } from "@/hooks/useCreditCards";
import { useToast } from "@/hooks/use-toast";

export default function AddCreditCardDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [months, setMonths] = useState("3");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const add = useAddCreditCard();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add.mutate(
      { name, spend_target: parseFloat(target), time_period_months: parseInt(months), start_date: startDate },
      {
        onSuccess: () => { toast({ title: "Card added" }); setOpen(false); setName(""); setTarget(""); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Add Card</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Credit Card</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Card Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Amex Gold" required /></div>
          <div className="space-y-1.5"><Label>Minimum Spend Target ($)</Label><Input type="number" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="4000" required /></div>
          <div className="space-y-1.5"><Label>Time Period (months)</Label><Input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={add.isPending}>{add.isPending ? "Adding..." : "Add Card"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

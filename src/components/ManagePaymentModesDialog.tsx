import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Trash2, Lock } from "lucide-react";
import { usePaymentModes, useAddPaymentMode, useDeletePaymentMode } from "@/hooks/usePaymentModes";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";

export default function ManagePaymentModesDialog() {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const { data: modes, isLoading } = usePaymentModes();
  const addMode = useAddPaymentMode();
  const deleteMode = useDeletePaymentMode();
  const { toast } = useToast();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, "_");

    if (modes?.some((m) => m.value === value)) {
      toast({ title: "Already exists", variant: "destructive" });
      return;
    }

    addMode.mutate(
      { value, label },
      {
        onSuccess: () => {
          toast({ title: "Payment mode added" });
          setNewLabel("");
        },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
      },
    );
  };

  const handleDelete = (mode: { id: string; label: string }) => {
    deleteMode.mutate(mode.id, {
      onSuccess: () => toast({ title: `"${mode.label}" removed` }),
      onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1 h-3 w-3" />Payment Modes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Payment Modes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-1">
              {modes?.map((mode) => (
                <div key={mode.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    {mode.is_system && <Lock className="h-3 w-3 text-muted-foreground" />}
                    <span className="font-medium">{mode.label}</span>
                  </div>
                  {!mode.is_system && (
                    <button
                      type="button"
                      onClick={() => handleDelete(mode)}
                      disabled={deleteMode.isPending}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="flex-1">
              <Label className="sr-only">New payment mode</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New payment mode name"
                className="h-8 text-sm"
              />
            </div>
            <Button type="submit" size="sm" disabled={addMode.isPending || !newLabel.trim()}>
              <Plus className="mr-1 h-3 w-3" />Add
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

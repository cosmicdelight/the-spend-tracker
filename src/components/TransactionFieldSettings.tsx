import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal } from "lucide-react";
import type { TransactionFieldPrefs } from "@/hooks/useTransactionFieldPrefs";

interface Props {
  prefs: TransactionFieldPrefs;
  onToggle: (field: keyof TransactionFieldPrefs) => void;
}

const fields: { key: keyof TransactionFieldPrefs; label: string; description: string }[] = [
  { key: "currency", label: "Currency", description: "Multi-currency support with conversion" },
  { key: "creditCard", label: "Credit Card", description: "Card selection for credit card payments" },
  { key: "subCategory", label: "Sub-category", description: "Sub-categories within categories" },
  { key: "notes", label: "Notes", description: "Additional notes field" },
];

export default function TransactionFieldSettings({ prefs, onToggle }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-1 h-3 w-3" />
          <span className="hidden sm:inline">Transaction Fields</span>
          <span className="sm:hidden">Txn Fields</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transaction Form Fields</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Toggle fields to show or hide in the Add/Edit Transaction forms.</p>
        <div className="space-y-4 mt-2">
          {fields.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => onToggle(key)} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

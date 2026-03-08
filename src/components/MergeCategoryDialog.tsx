import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMergeBudgetCategoryGroup, useMergeBudgetSubCategory } from "@/hooks/useBudgetCategories";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";

interface MergeCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "group" | "sub";
  sourceName: string;
  /** For sub mode: the parent category name */
  categoryName?: string;
  /** Available target names to merge into */
  targets: string[];
}

export default function MergeCategoryDialog({
  open,
  onOpenChange,
  mode,
  sourceName,
  categoryName,
  targets,
}: MergeCategoryDialogProps) {
  const [target, setTarget] = useState("");
  const mergeGroup = useMergeBudgetCategoryGroup();
  const mergeSub = useMergeBudgetSubCategory();
  const { toast } = useToast();

  const isPending = mergeGroup.isPending || mergeSub.isPending;

  const handleMerge = () => {
    if (!target) return;

    if (mode === "group") {
      mergeGroup.mutate(
        { sourceName, targetName: target },
        {
          onSuccess: () => {
            toast({ title: "Categories merged" });
            onOpenChange(false);
            setTarget("");
          },
          onError: (err) =>
            toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
        }
      );
    } else {
      if (!categoryName) return;
      mergeSub.mutate(
        { categoryName, sourceSubName: sourceName, targetSubName: target },
        {
          onSuccess: () => {
            toast({ title: "Sub-categories merged" });
            onOpenChange(false);
            setTarget("");
          },
          onError: (err) =>
            toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTarget(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Merge {mode === "group" ? "Category" : "Sub-category"}
          </DialogTitle>
          <DialogDescription>
            All transactions in <span className="font-medium text-foreground">"{sourceName}"</span> will
            be moved to the selected target. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-sm font-medium">
            Merge "{sourceName}" into:
          </label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Select target…" />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={!target || isPending}>
            {isPending ? "Merging…" : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useAddBudgetCategory } from "@/hooks/useBudgetCategories";
import { useToast } from "@/hooks/use-toast";

export default function AddBudgetCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const add = useAddBudgetCategory();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add.mutate(
      { name, sub_category_name: subCategoryName || null },
      {
        onSuccess: () => { toast({ title: "Category added" }); setOpen(false); setName(""); setSubCategoryName(""); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="mr-1 h-3 w-3" />Category</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Budget Category</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Category Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Food" required /></div>
          <div className="space-y-1.5"><Label>Sub-Category Name (optional)</Label><Input value={subCategoryName} onChange={(e) => setSubCategoryName(e.target.value)} placeholder="Fast Food" /></div>
          <Button type="submit" className="w-full" disabled={add.isPending}>{add.isPending ? "Adding..." : "Add Category"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useIncomeCategories,
  useDeleteIncomeCategory,
  useUpdateIncomeCategory,
  useAddIncomeCategory,
} from "@/hooks/useIncomeCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function IncomeCategories() {
  const { user, loading } = useAuth();
  const { data: categories = [] } = useIncomeCategories();
  const deleteCat = useDeleteIncomeCategory();
  const updateCat = useUpdateIncomeCategory();
  const addCat = useAddIncomeCategory();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSub, setEditSub] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubForGroup, setNewSubForGroup] = useState("");

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;

  // Group categories by name
  const grouped = categories.reduce<Record<string, typeof categories>>((acc, cat) => {
    if (!acc[cat.name]) acc[cat.name] = [];
    acc[cat.name].push(cat);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort();

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const startEdit = (cat: typeof categories[0]) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSub(cat.sub_category_name || "");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateCat.mutate(
      { id: editingId, name: editName.trim(), sub_category_name: editSub.trim() || null },
      {
        onSuccess: () => { toast({ title: "Updated" }); setEditingId(null); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCat.mutate(
      { name: newCatName.trim(), sub_category_name: newSubName.trim() || null },
      {
        onSuccess: () => { toast({ title: "Category added" }); setNewCatName(""); setNewSubName(""); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleAddSub = (groupName: string) => {
    if (!newSubForGroup.trim()) return;
    addCat.mutate(
      { name: groupName, sub_category_name: newSubForGroup.trim() },
      {
        onSuccess: () => { toast({ title: "Sub-category added" }); setNewSubForGroup(""); setAddingSubTo(null); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-heading font-bold">Manage Income Categories</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Add new category */}
        <Card>
          <CardHeader><CardTitle className="text-base">Add New Category</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Salary, Freelance, Investment"
                className="flex-1 min-w-[140px]"
                required
              />
              <Input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Sub-category (optional)"
                className="flex-1 min-w-[140px]"
              />
              <Button type="submit" size="sm" disabled={addCat.isPending}>
                <Plus className="mr-1 h-3 w-3" />Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Category groups */}
        <div className="space-y-2">
          {sortedGroups.map((groupName) => {
            const items = grouped[groupName];
            const hasSubs = items.some((i) => i.sub_category_name);
            const isExpanded = expandedGroups.has(groupName);
            const parentItem = items.find((i) => !i.sub_category_name) || items[0];
            const subItems = items.filter((i) => i.sub_category_name);

            return (
              <Card key={groupName}>
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-xl"
                  onClick={() => hasSubs && toggleGroup(groupName)}
                >
                  <div className="flex items-center gap-2">
                    {hasSubs ? (
                      isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <span className="w-4" />
                    )}
                    {editingId === parentItem.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 w-40"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="font-medium text-sm">{groupName}</span>
                    )}
                    {hasSubs && (
                      <span className="text-xs text-muted-foreground">
                        {subItems.length} sub-categor{subItems.length === 1 ? "y" : "ies"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {editingId === parentItem.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {!hasSubs && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => startEdit(parentItem)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => { setAddingSubTo(addingSubTo === groupName ? null : groupName); setNewSubForGroup(""); toggleGroup(groupName); }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        {!hasSubs && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteCat.mutate(parentItem.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-3">
                    {subItems.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-2 pl-6 text-sm">
                        {editingId === sub.id ? (
                          <div className="flex items-center gap-2">
                            <Input value={editSub} onChange={(e) => setEditSub(e.target.value)} className="h-7 w-36" />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-muted-foreground">{sub.sub_category_name}</span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => startEdit(sub)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteCat.mutate(sub.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {addingSubTo === groupName && (
                      <div className="flex items-center gap-2 pl-6 pt-1">
                        <Input
                          value={newSubForGroup}
                          onChange={(e) => setNewSubForGroup(e.target.value)}
                          placeholder="New sub-category"
                          className="h-7 flex-1"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleAddSub(groupName)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddSub(groupName)}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddingSubTo(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {categories.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No income categories yet. Add one above!<br />
            <span className="text-xs">Examples: Salary, Freelance, Investment, Bonus, Rental</span>
          </p>
        )}
      </main>
    </div>
  );
}

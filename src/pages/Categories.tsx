import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useBudgetCategories,
  useDeleteBudgetCategory,
  useDeleteBudgetCategoryGroup,
  useUpdateBudgetCategory,
  useRenameBudgetCategoryGroup,
  useAddBudgetCategory,
} from "@/hooks/useBudgetCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorUtils";
import DeleteConfirmButton from "@/components/DeleteConfirmButton";

export default function Categories() {
  const { user, loading } = useAuth();
  const { data: categories = [] } = useBudgetCategories();
  const deleteCat = useDeleteBudgetCategory();
  const deleteGroup = useDeleteBudgetCategoryGroup();
  const updateCat = useUpdateBudgetCategory();
  const renameGroup = useRenameBudgetCategoryGroup();
  const addCat = useAddBudgetCategory();
  const { toast } = useToast();

  // Sub-category inline edit
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubValue, setEditSubValue] = useState("");

  // Group (category) inline edit
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editGroupValue, setEditGroupValue] = useState("");

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubForGroup, setNewSubForGroup] = useState("");

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const grouped = categories.reduce<Record<string, typeof categories>>((acc, cat) => {
    if (!acc[cat.name]) acc[cat.name] = [];
    acc[cat.name].push(cat);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort();

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const startEditGroup = (groupName: string) => {
    setEditingGroupName(groupName);
    setEditGroupValue(groupName);
    setEditingSubId(null);
    if (!expandedGroups.has(groupName)) toggleGroup(groupName);
  };

  const saveGroupEdit = () => {
    if (!editingGroupName || !editGroupValue.trim()) return;
    if (editGroupValue.trim() === editingGroupName) { setEditingGroupName(null); return; }
    renameGroup.mutate(
      { oldName: editingGroupName, newName: editGroupValue.trim() },
      {
        onSuccess: () => { toast({ title: "Category renamed" }); setEditingGroupName(null); },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
      }
    );
  };

  const startEditSub = (cat: typeof categories[0]) => {
    setEditingSubId(cat.id);
    setEditSubValue(cat.sub_category_name || "");
    setEditingGroupName(null);
  };

  const saveSubEdit = (cat: typeof categories[0]) => {
    if (!editSubValue.trim()) return;
    updateCat.mutate(
      { id: cat.id, name: cat.name, sub_category_name: editSubValue.trim() },
      {
        onSuccess: () => { toast({ title: "Updated" }); setEditingSubId(null); },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
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
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
      }
    );
  };

  const handleAddSub = (groupName: string) => {
    if (!newSubForGroup.trim()) return;
    addCat.mutate(
      { name: groupName, sub_category_name: newSubForGroup.trim() },
      {
        onSuccess: () => { toast({ title: "Sub-category added" }); setNewSubForGroup(""); setAddingSubTo(null); },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
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
          <h1 className="text-lg font-heading font-bold">Manage Categories</h1>
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
                placeholder="Category name"
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
            const subItems = items.filter((i) => i.sub_category_name);
            const hasSubs = subItems.length > 0;
            const isExpanded = expandedGroups.has(groupName);
            const isEditingGroup = editingGroupName === groupName;

            return (
              <Card key={groupName}>
                {/* Group header row */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-xl"
                  onClick={() => {
                    if (!isEditingGroup && hasSubs) toggleGroup(groupName);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {hasSubs ? (
                      isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <span className="w-4" />
                    )}

                    {isEditingGroup ? (
                      <Input
                        value={editGroupValue}
                        onChange={(e) => setEditGroupValue(e.target.value)}
                        className="h-7 w-44"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === "Enter" && saveGroupEdit()}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-sm">{groupName}</span>
                    )}

                    {hasSubs && !isEditingGroup && (
                      <span className="text-xs text-muted-foreground">
                        {subItems.length} sub-categor{subItems.length === 1 ? "y" : "ies"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {isEditingGroup ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveGroupEdit}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGroupName(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => startEditGroup(groupName)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => {
                            setAddingSubTo(addingSubTo === groupName ? null : groupName);
                            setNewSubForGroup("");
                            if (!isExpanded) toggleGroup(groupName);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <DeleteConfirmButton
                          label={`"${groupName}"${hasSubs ? " and all its sub-categories" : ""}`}
                          onConfirm={() =>
                            deleteGroup.mutate(groupName, {
                              onSuccess: () => toast({ title: "Category deleted" }),
                              onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
                            })
                          }
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-categories */}
                {isExpanded && (
                  <div className="border-t px-4 pb-3">
                    {subItems.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-2 pl-6 text-sm">
                        {editingSubId === sub.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editSubValue}
                              onChange={(e) => setEditSubValue(e.target.value)}
                              className="h-7 w-36"
                              onKeyDown={(e) => e.key === "Enter" && saveSubEdit(sub)}
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveSubEdit(sub)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSubId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-muted-foreground">{sub.sub_category_name}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => startEditSub(sub)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <DeleteConfirmButton
                                label={`"${sub.sub_category_name}"`}
                                onConfirm={() =>
                                  deleteCat.mutate(sub.id, {
                                    onSuccess: () => toast({ title: "Sub-category deleted" }),
                                    onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }),
                                  })
                                }
                              />
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
          <p className="text-center text-sm text-muted-foreground py-8">No categories yet. Add one above!</p>
        )}
      </main>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { seedDefaultCategories } from "@/lib/seedDefaultCategories";

export interface BudgetCategory {
  id: string;
  name: string;
  sub_category_name: string | null;
  created_at: string;
}

export function useBudgetCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budget_categories", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User must be signed in");
      await seedDefaultCategories(user.id);
      const { data, error } = await supabase.from("budget_categories").select("*").order("name");
      if (error) throw error;
      return data as BudgetCategory[];
    },
    enabled: !!user,
  });
}

export function useAddBudgetCategory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (cat: { name: string; sub_category_name?: string | null }) => {
      if (!user) throw new Error("User must be signed in to add categories");
      const { error } = await supabase.from("budget_categories").insert({ ...cat, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_categories"] }),
  });
}

export function useDeleteBudgetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_categories"] }),
  });
}

export function useUpdateBudgetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, sub_category_name }: { id: string; name: string; sub_category_name: string | null }) => {
      const { error } = await supabase.from("budget_categories").update({ name, sub_category_name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_categories"] }),
  });
}

export function useDeleteBudgetCategoryGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (groupName: string) => {
      if (!user) throw new Error("User must be signed in");
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("user_id", user.id)
        .eq("name", groupName);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_categories"] }),
  });
}

export function useRenameBudgetCategoryGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (!user) throw new Error("User must be signed in");
      const { error } = await supabase
        .from("budget_categories")
        .update({ name: newName })
        .eq("user_id", user.id)
        .eq("name", oldName);
      if (error) throw error;
      const { error: txError } = await supabase
        .from("transactions")
        .update({ category: newName })
        .eq("user_id", user.id)
        .eq("category", oldName);
      if (txError) throw txError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useMergeBudgetCategoryGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ sourceName, targetName }: { sourceName: string; targetName: string }) => {
      if (!user) throw new Error("User must be signed in");

      // Update transactions, income, recurring_transactions category from source → target
      const { error: e1 } = await supabase.from("transactions").update({ category: targetName }).eq("user_id", user.id).eq("category", sourceName);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("income").update({ category: targetName }).eq("user_id", user.id).eq("category", sourceName);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from("recurring_transactions").update({ category: targetName }).eq("user_id", user.id).eq("category", sourceName);
      if (e3) throw e3;

      // Get source and target budget_categories rows
      const { data: sourceCats } = await supabase.from("budget_categories").select("*").eq("user_id", user.id).eq("name", sourceName);
      const { data: targetCats } = await supabase.from("budget_categories").select("*").eq("user_id", user.id).eq("name", targetName);
      const targetSubs = new Set((targetCats || []).map(c => c.sub_category_name));

      for (const sc of (sourceCats || [])) {
        if (!sc.sub_category_name || targetSubs.has(sc.sub_category_name)) {
          // Duplicate or no sub — delete
          await supabase.from("budget_categories").delete().eq("id", sc.id);
        } else {
          // Move sub to target group
          await supabase.from("budget_categories").update({ name: targetName }).eq("id", sc.id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["recurring_transactions"] });
    },
  });
}

export function useMergeBudgetSubCategory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ categoryName, sourceSubName, targetSubName }: { categoryName: string; sourceSubName: string; targetSubName: string }) => {
      if (!user) throw new Error("User must be signed in");

      // Update sub_category in transactions, income, recurring_transactions
      const { error: e1 } = await supabase.from("transactions").update({ sub_category: targetSubName }).eq("user_id", user.id).eq("category", categoryName).eq("sub_category", sourceSubName);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("income").update({ sub_category: targetSubName }).eq("user_id", user.id).eq("category", categoryName).eq("sub_category", sourceSubName);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from("recurring_transactions").update({ sub_category: targetSubName }).eq("user_id", user.id).eq("category", categoryName).eq("sub_category", sourceSubName);
      if (e3) throw e3;

      // Delete source budget_categories row
      const { error: e4 } = await supabase.from("budget_categories").delete().eq("user_id", user.id).eq("name", categoryName).eq("sub_category_name", sourceSubName);
      if (e4) throw e4;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["recurring_transactions"] });
    },
  });
}

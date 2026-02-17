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
      await seedDefaultCategories(user!.id);
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
      const { error } = await supabase.from("budget_categories").insert({ ...cat, user_id: user!.id });
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

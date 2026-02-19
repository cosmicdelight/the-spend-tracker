import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { seedDefaultIncomeCategories } from "@/lib/seedDefaultIncomeCategories";

export interface IncomeCategory {
  id: string;
  name: string;
  sub_category_name: string | null;
  created_at: string;
}

export function useIncomeCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income_categories", user?.id],
    queryFn: async () => {
      await seedDefaultIncomeCategories(user!.id);
      const { data, error } = await supabase
        .from("income_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as IncomeCategory[];
    },
    enabled: !!user,
  });
}

export function useAddIncomeCategory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (cat: { name: string; sub_category_name?: string | null }) => {
      const { error } = await supabase
        .from("income_categories")
        .insert({ ...cat, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income_categories"] }),
  });
}

export function useDeleteIncomeCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income_categories"] }),
  });
}

export function useUpdateIncomeCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, sub_category_name }: { id: string; name: string; sub_category_name: string | null }) => {
      const { error } = await supabase
        .from("income_categories")
        .update({ name, sub_category_name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income_categories"] }),
  });
}

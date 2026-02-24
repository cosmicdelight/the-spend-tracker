import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface IncomeEntry {
  id: string;
  user_id: string;
  amount: number;
  original_amount: number;
  original_currency: string;
  date: string;
  category: string;
  sub_category: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export function useIncome() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as IncomeEntry[];
    },
    enabled: !!user,
  });
}

export function useAddIncome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: Omit<IncomeEntry, "id" | "created_at" | "user_id">) => {
      if (!user) throw new Error("User must be signed in to add income");
      const { error } = await supabase.from("income").insert({ ...entry, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income"] }),
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<IncomeEntry> & { id: string }) => {
      const { error } = await supabase.from("income").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income"] }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income"] }),
  });
}

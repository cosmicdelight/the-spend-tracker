import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Bank {
  id: string;
  name: string;
  spend_target: number;
  spend_cap: number | null;
  time_period_months: number;
  start_date: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useBanks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["banks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("banks").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Bank[];
    },
    enabled: !!user,
  });
}

export function useAddBank() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (bank: { name: string; spend_target: number; spend_cap: number | null; time_period_months: number; start_date: string }) => {
      if (!user) throw new Error("User must be signed in to add banks");
      const { data: existing } = await supabase.from("banks").select("sort_order").eq("user_id", user.id).order("sort_order", { ascending: false }).limit(1);
      const nextOrder = (existing && existing.length > 0 ? existing[0].sort_order : 0) + 1;
      const { error } = await supabase.from("banks").insert({ ...bank, user_id: user.id, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banks"] }),
  });
}

export function useDeleteBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      // Cards referencing this bank have had bank_id cleared by the FK.
      qc.invalidateQueries({ queryKey: ["credit_cards"] });
    },
  });
}

export function useUpdateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Bank> & { id: string }) => {
      const { error } = await supabase.from("banks").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banks"] }),
  });
}

export function useReorderBanks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase.from("banks").update({ sort_order: u.sort_order }).eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banks"] }),
  });
}

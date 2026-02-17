import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CreditCard {
  id: string;
  name: string;
  spend_target: number;
  time_period_months: number;
  start_date: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useCreditCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit_cards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_cards").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });
}

export function useAddCreditCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (card: { name: string; spend_target: number; time_period_months: number; start_date: string }) => {
      // Get max sort_order for this user
      const { data: existing } = await supabase.from("credit_cards").select("sort_order").eq("user_id", user!.id).order("sort_order", { ascending: false }).limit(1);
      const nextOrder = (existing && existing.length > 0 ? existing[0].sort_order : 0) + 1;
      const { error } = await supabase.from("credit_cards").insert({ ...card, user_id: user!.id, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit_cards"] }),
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("credit_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit_cards"] }),
  });
}

export function useUpdateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<CreditCard> & { id: string }) => {
      const { error } = await supabase.from("credit_cards").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit_cards"] }),
  });
}

export function useReorderCreditCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase.from("credit_cards").update({ sort_order: u.sort_order }).eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit_cards"] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RecurringTransaction {
  id: string;
  amount: number;
  personal_amount: number;
  category: string;
  sub_category: string | null;
  payment_mode: string;
  credit_card_id: string | null;
  description: string | null;
  notes: string | null;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  is_active: boolean;
  auto_generate: boolean;
  last_generated_at: string | null;
  next_due_date: string;
  created_at: string;
  updated_at: string;
}

export function useRecurringTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recurring_transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!user,
  });
}

export function useAddRecurringTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tx: Omit<RecurringTransaction, "id" | "created_at" | "updated_at" | "last_generated_at">) => {
      const { error } = await supabase.from("recurring_transactions").insert({ ...tx, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_transactions"] }),
  });
}

export function useDeleteRecurringTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_transactions"] }),
  });
}

export function useCreateFromRecurring() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rec: RecurringTransaction) => {
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        amount: rec.amount,
        personal_amount: rec.personal_amount,
        category: rec.category,
        sub_category: rec.sub_category,
        payment_mode: rec.payment_mode,
        credit_card_id: rec.credit_card_id,
        description: rec.description,
        notes: rec.notes,
        date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

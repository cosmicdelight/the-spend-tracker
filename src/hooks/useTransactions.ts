import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Transaction {
  id: string;
  credit_card_id: string | null;
  amount: number;
  personal_amount: number;
  date: string;
  category: string;
  payment_mode: string;
  description: string | null;
  notes: string | null;
  sub_category: string | null;
  original_currency: string;
  original_amount: number;
  created_at: string;
}

export function useTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tx: Omit<Transaction, "id" | "created_at">) => {
      const { error } = await supabase.from("transactions").insert({ ...tx, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Transaction> & { id: string }) => {
      const { error } = await supabase.from("transactions").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDescriptionSuggestions(): string[] {
  const { data: transactions } = useTransactions();
  return useMemo(() => {
    if (!transactions) return [];
    const seen = new Map<string, string>(); // lowerKey -> most recent date
    for (const tx of transactions) {
      if (!tx.description) continue;
      const key = tx.description.toLowerCase();
      if (!seen.has(key) || tx.date > seen.get(key)!) {
        seen.set(key, tx.date);
      }
    }
    const unique = [...new Map(
      transactions
        .filter((tx) => !!tx.description)
        .map((tx) => [tx.description!.toLowerCase(), tx])
    ).values()].sort((a, b) => b.date.localeCompare(a.date));
    return unique.map((tx) => tx.description!);
  }, [transactions]);
}
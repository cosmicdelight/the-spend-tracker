import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
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
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
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
      if (!user) throw new Error("User must be signed in to add transactions");
      const { error } = await supabase.from("transactions").insert({ ...tx, user_id: user.id });
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

/**
 * Returns a function that, given a description, returns the category/sub_category from the
 * most recent matching past transaction. Used to auto-populate Category when user enters a
 * description but leaves Category empty.
 * Match: exact (case-insensitive), or input contained in desc, or desc contained in input.
 */
export function useCategoryFromDescription(): (
  description: string
) => { category: string; sub_category: string | null } | null {
  const { data: transactions } = useTransactions();
  return useCallback(
    (description: string) => {
      const input = description.trim().toLowerCase();
      if (!input || !transactions) return null;
      let bestMatch: Transaction | null = null;
      let bestScore = -1;

      for (const tx of transactions) {
        if (!tx.description) continue;
        const desc = tx.description.toLowerCase();

        let score = -1;
        if (desc === input) {
          score = 100; // strongest signal
        } else if (input.length >= 3 && desc.includes(input)) {
          score = 60;
        } else if (input.length >= 4 && desc.length >= 4 && input.includes(desc)) {
          // Keep reverse-contains, but only for longer phrases to reduce false positives.
          score = 40;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = tx;
          if (score === 100) break;
        }
      }

      return bestMatch && bestMatch.category
        ? { category: bestMatch.category, sub_category: bestMatch.sub_category }
        : null;
    },
    [transactions]
  );
}
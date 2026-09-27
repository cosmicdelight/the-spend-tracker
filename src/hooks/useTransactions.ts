import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { removeAttachmentFiles } from "@/lib/attachmentStorage";
import { fetchAllRows } from "@/lib/fetchAllRows";

export interface Transaction {
  id: string;
  credit_card_id: string | null;
  amount: number;
  personal_amount: number;
  date: string;
  expense_date: string;
  category: string;
  payment_mode: string;
  description: string | null;
  notes: string | null;
  sub_category: string | null;
  original_currency: string;
  original_amount: number;
  settled_up: boolean;
  created_at: string;
}

export function useTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id],
    // Paged, because PostgREST caps a single response at 1000 rows and says nothing when
    // it does. Unbounded, this returned the 1000 most recent by date and silently hid
    // everything older — 4,288 rows on the account that surfaced it, going back to 2021.
    //
    // The trailing sort on `id` is load-bearing, not tidiness. `date` and `created_at` do
    // not uniquely order these rows (a CSV import gives every row it writes the same
    // created_at), and Postgres makes no promise about how tied rows fall between two
    // separate queries. Without a unique tiebreaker a row can be served in both pages or
    // neither, so paging would reintroduce the data loss it is here to fix.
    queryFn: () =>
      fetchAllRows<Transaction>((from, to) =>
        supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      ),
    enabled: !!user,
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tx: Omit<Transaction, "id" | "created_at">) => {
      if (!user) throw new Error("User must be signed in to add transactions");
      const { data, error } = await supabase.from("transactions").insert({ ...tx, user_id: user.id }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Read the file paths first. transaction_attachments has
      // REFERENCES transactions(id) ON DELETE CASCADE, so the delete below takes the
      // rows with it — and with them the only record of where the files live. Reading
      // afterwards returns nothing and the receipts are stranded in the bucket forever.
      const { data: attachments, error: listErr } = await supabase
        .from("transaction_attachments")
        .select("file_path")
        .eq("transaction_id", id);
      if (listErr) throw listErr;

      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;

      // Storage last, and deliberately not fatal. Removing files before the row would
      // destroy the receipts of a transaction that still exists if the delete then
      // failed; this order can only ever leave an orphan, which is the pre-existing
      // behaviour rather than a loss. The caller asked to delete the transaction and
      // that succeeded, so a storage fault must not surface as a failed delete.
      const paths = (attachments ?? []).map((a) => a.file_path);
      const removal = await removeAttachmentFiles(paths);
      if (removal.removed < removal.requested) {
        console.warn(
          `Transaction ${id} was deleted but ${removal.requested - removal.removed} of ` +
            `${removal.requested} attachment file(s) remain in storage:`,
          { paths, error: removal.error },
        );
      }
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
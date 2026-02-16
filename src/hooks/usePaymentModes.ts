import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PaymentMode {
  id: string;
  value: string;
  label: string;
  is_system: boolean;
}

const DEFAULT_MODES = [
  { value: "credit_card", label: "Credit Card", is_system: true },
  { value: "cash", label: "Cash", is_system: false },
  { value: "paynow", label: "PayNow", is_system: false },
  { value: "giro", label: "GIRO", is_system: false },
];

export function usePaymentModes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["payment_modes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_modes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Seed defaults if empty
      if (data.length === 0 && user) {
        const seed = DEFAULT_MODES.map((m) => ({ ...m, user_id: user.id }));
        const { data: seeded, error: seedErr } = await supabase
          .from("payment_modes")
          .insert(seed)
          .select();
        if (seedErr) throw seedErr;
        return seeded as PaymentMode[];
      }

      return data as PaymentMode[];
    },
    enabled: !!user,
  });

  return query;
}

export function useAddPaymentMode() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ value, label }: { value: string; label: string }) => {
      const { error } = await supabase
        .from("payment_modes")
        .insert({ value, label, user_id: user!.id, is_system: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_modes"] }),
  });
}

export function useDeletePaymentMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_modes")
        .delete()
        .eq("id", id)
        .eq("is_system", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_modes"] }),
  });
}

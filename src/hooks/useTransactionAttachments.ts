import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TransactionAttachment {
  id: string;
  transaction_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useTransactionAttachments(transactionId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transaction-attachments", transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      const { data, error } = await supabase
        .from("transaction_attachments")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TransactionAttachment[];
    },
    enabled: !!user && !!transactionId,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ transactionId, file }: { transactionId: string; file: File }) => {
      if (!user) throw new Error("Must be signed in");
      if (!ACCEPTED_TYPES.includes(file.type)) throw new Error("Only PDF, JPG, and PNG files are allowed");
      if (file.size > MAX_FILE_SIZE) throw new Error("File must be under 10MB");

      // Check existing count
      const { count, error: countErr } = await supabase
        .from("transaction_attachments")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", transactionId);
      if (countErr) throw countErr;
      if ((count ?? 0) >= MAX_FILES) throw new Error("Maximum 5 attachments per transaction");

      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${user.id}/${transactionId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("transaction-attachments")
        .upload(filePath, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("transaction_attachments").insert({
        transaction_id: transactionId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: (_, { transactionId }) => {
      qc.invalidateQueries({ queryKey: ["transaction-attachments", transactionId] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachment }: { attachment: TransactionAttachment }) => {
      await supabase.storage.from("transaction-attachments").remove([attachment.file_path]);
      const { error } = await supabase.from("transaction_attachments").delete().eq("id", attachment.id);
      if (error) throw error;
    },
    onSuccess: (_, { attachment }) => {
      qc.invalidateQueries({ queryKey: ["transaction-attachments", attachment.transaction_id] });
    },
  });
}

export function getAttachmentUrl(filePath: string): string {
  const { data } = supabase.storage.from("transaction-attachments").getPublicUrl(filePath);
  return data.publicUrl;
}

export function getSignedAttachmentUrl(filePath: string): Promise<string> {
  return supabase.storage
    .from("transaction-attachments")
    .createSignedUrl(filePath, 3600)
    .then(({ data, error }) => {
      if (error) throw error;
      return data.signedUrl;
    });
}

export { ACCEPTED_TYPES, MAX_FILES };

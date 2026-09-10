import { supabase } from "@/integrations/supabase/client";

/** The storage bucket holding receipt files. */
export const ATTACHMENTS_BUCKET = "transaction-attachments";

export interface AttachmentRemovalResult {
  requested: number;
  removed: number;
  error: unknown;
}

/**
 * Delete receipt files, reporting how many actually went.
 *
 * `storage.remove()` resolves `{ data, error }` where `data` lists the objects it
 * removed. A partial failure — one object missing, one rejected — comes back with
 * `error` null and a short `data`, so checking `error` alone reports success while
 * leaving orphans behind. Counting is deliberate rather than diffing paths against
 * `data[].name`, whose exact form is a supabase-js detail this does not need to bet on.
 *
 * Advisory by design: every caller deletes its database row first, so by the time this
 * runs the row is already gone and a storage fault must not fail their mutation.
 */
export async function removeAttachmentFiles(paths: string[]): Promise<AttachmentRemovalResult> {
  if (paths.length === 0) return { requested: 0, removed: 0, error: null };

  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths);
  return {
    requested: paths.length,
    removed: error ? 0 : (data ?? []).length,
    error: error ?? null,
  };
}

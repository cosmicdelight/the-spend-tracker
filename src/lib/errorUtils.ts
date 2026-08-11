/**
 * Safely extracts a user-facing message from an unknown error.
 * Use in onError handlers instead of casting err directly.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  // Supabase/PostgREST errors are plain objects, not Error instances, so their
  // message would otherwise be lost behind the generic fallback.
  if (err && typeof err === "object" && "message" in err) {
    const { message } = err as { message?: unknown };
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "An unexpected error occurred";
}

/**
 * Safely extracts a user-facing message from an unknown error.
 * Use in onError handlers instead of casting err directly.
 */
export function getErrorMessage(err: unknown): string {
  // Raw text is "new row violates row-level security policy for table ...", which tells
  // a visitor nothing. Every table policy here scopes to auth.uid() = user_id, so a
  // signed-in user cannot trip one on their own rows — in practice the only source is
  // the demo account's read-only restriction.
  if (isRowLevelSecurityDenial(err)) {
    return "The demo account is read-only. Sign up to save your own data.";
  }
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

/**
 * True when an error is Postgres refusing a write under row-level security.
 *
 * PostgREST reports these as SQLSTATE 42501. The message is matched as well because
 * some paths (storage, RPC) surface the text without the code.
 */
export function isRowLevelSecurityDenial(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  if (code === "42501") return true;
  return typeof message === "string" && /row-level security/i.test(message);
}

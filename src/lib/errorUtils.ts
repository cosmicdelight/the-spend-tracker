/**
 * Safely extracts a user-facing message from an unknown error.
 * Use in onError handlers instead of casting err directly.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}

/**
 * Run a function with the process timezone pinned, then restore it.
 *
 * Node re-reads process.env.TZ on assignment, so Dates constructed inside the callback
 * observe the pinned zone. Needed because CI runs in UTC, where local and UTC dates are
 * identical — every timezone bug in this codebase is invisible there by construction,
 * so a test that does not pin the zone cannot catch one.
 */
export function withTZ<T>(timeZone: string, fn: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = timeZone;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

/**
 * Service worker caches that may hold responses belonging to a signed-in user.
 *
 * An earlier build cached every *.supabase.co response under "supabase-api", keyed by
 * URL only — the account is carried in the Authorization header, which is not part of
 * the cache key. That rule is gone, but installs created by those builds still have the
 * cache on disk, and Workbox's cleanupOutdatedCaches only prunes precaches. So the name
 * has to be purged explicitly: on boot, to clean up upgrades, and on sign-out.
 */
const USER_DATA_CACHES = ["supabase-api"];

export async function purgeUserDataCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await Promise.all(USER_DATA_CACHES.map((name) => caches.delete(name)));
  } catch {
    // The Cache API throws in some private-browsing modes. Nothing here is
    // load-bearing — failing to purge must never block sign-out or app start.
  }
}

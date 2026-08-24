/**
 * Browser storage that may hold responses belonging to a signed-in user.
 *
 * An earlier build cached every *.supabase.co response under "supabase-api", keyed by
 * URL only — the account is carried in the Authorization header, which is not part of
 * the cache key. That rule is gone, but installs created by those builds still have the
 * data on disk, and Workbox's cleanupOutdatedCaches only prunes precaches. So it has to
 * be purged explicitly: on boot, to clean up upgrades, and again on sign-out.
 */
const USER_DATA_CACHES = ["supabase-api"];

/**
 * Workbox's ExpirationPlugin — which the removed rule used — keeps its per-entry
 * bookkeeping (cache name, URL, timestamp) in this IndexedDB database rather than in
 * Cache Storage. caches.delete() does not touch it, so dropping it separately is what
 * stops authenticated request URLs outliving the purge.
 */
const WORKBOX_EXPIRATION_DB = "workbox-expiration";

async function deleteCaches(names: string[]): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await Promise.all(names.map((name) => caches.delete(name)));
  } catch {
    // The Cache API throws in some private-browsing modes. Nothing here is
    // load-bearing — failing to purge must never block sign-out or app start.
  }
}

function deleteExpirationMetadata(): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(WORKBOX_EXPIRATION_DB);
      // `blocked` fires when another tab still holds the database open. Resolve on it
      // too rather than hanging sign-out on a tab the user may never close.
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Remove everything an older build may have stored for a signed-in user. */
export async function purgeUserDataCaches(): Promise<void> {
  await Promise.all([deleteCaches(USER_DATA_CACHES), deleteExpirationMetadata()]);
}

/**
 * Remove every cache. Used by the update path, which wants a clean slate rather than a
 * targeted purge.
 */
export async function purgeAllCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await deleteCaches(await caches.keys());
  } catch {
    // caches.keys() can throw for the same reasons as caches.delete().
  }
}

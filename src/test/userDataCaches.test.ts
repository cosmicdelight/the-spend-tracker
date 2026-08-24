import { describe, it, expect, vi, afterEach } from "vitest";
import { purgeUserDataCaches, purgeAllCaches } from "@/lib/userDataCaches";

/** Minimal IDBFactory stub whose deleteDatabase fires the named handler. */
function stubIndexedDB(fire: "onsuccess" | "onerror" | "onblocked" = "onsuccess") {
  const deleteDatabase = vi.fn(() => {
    const request: Record<string, (() => void) | undefined> = {};
    // Handlers are assigned after deleteDatabase returns, so defer firing.
    queueMicrotask(() => request[fire]?.());
    return request;
  });
  vi.stubGlobal("indexedDB", { deleteDatabase });
  return deleteDatabase;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("purgeUserDataCaches", () => {
  it("deletes the cache an older build left user data in", async () => {
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: del });
    stubIndexedDB();

    await purgeUserDataCaches();

    expect(del).toHaveBeenCalledWith("supabase-api");
  });

  it("also drops the Workbox expiration metadata, which caches.delete leaves behind", async () => {
    vi.stubGlobal("caches", { delete: vi.fn().mockResolvedValue(true) });
    const deleteDatabase = stubIndexedDB();

    await purgeUserDataCaches();

    expect(deleteDatabase).toHaveBeenCalledWith("workbox-expiration");
  });

  it("resolves when the Cache API is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    stubIndexedDB();
    await expect(purgeUserDataCaches()).resolves.toBeUndefined();
  });

  it("resolves when IndexedDB is unavailable", async () => {
    vi.stubGlobal("caches", { delete: vi.fn().mockResolvedValue(true) });
    vi.stubGlobal("indexedDB", undefined);
    await expect(purgeUserDataCaches()).resolves.toBeUndefined();
  });

  it("swallows Cache API errors so sign-out is never blocked", async () => {
    vi.stubGlobal("caches", {
      delete: vi.fn().mockRejectedValue(new Error("denied in private browsing")),
    });
    stubIndexedDB();
    await expect(purgeUserDataCaches()).resolves.toBeUndefined();
  });

  it("resolves when deleting the database errors", async () => {
    vi.stubGlobal("caches", { delete: vi.fn().mockResolvedValue(true) });
    stubIndexedDB("onerror");
    await expect(purgeUserDataCaches()).resolves.toBeUndefined();
  });

  it("resolves when another tab holds the database open", async () => {
    vi.stubGlobal("caches", { delete: vi.fn().mockResolvedValue(true) });
    stubIndexedDB("onblocked");
    await expect(purgeUserDataCaches()).resolves.toBeUndefined();
  });
});

describe("purgeAllCaches", () => {
  it("deletes every cache the origin holds", async () => {
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["workbox-precache-v2", "supabase-api"]),
      delete: del,
    });

    await purgeAllCaches();

    expect(del).toHaveBeenCalledWith("workbox-precache-v2");
    expect(del).toHaveBeenCalledWith("supabase-api");
  });

  it("resolves when the Cache API is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(purgeAllCaches()).resolves.toBeUndefined();
  });
});

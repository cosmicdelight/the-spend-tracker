import { describe, it, expect, vi, afterEach } from "vitest";
import { purgeUserDataCaches } from "@/lib/userDataCaches";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("purgeUserDataCaches", () => {
  it("deletes the cache an older build left user data in", async () => {
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: del });

    await purgeUserDataCaches();

    expect(del).toHaveBeenCalledWith("supabase-api");
  });

  it("resolves when the Cache API is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(purgeUserDataCaches()).resolves.toBeUndefined();
  });

  it("swallows Cache API errors so sign-out is never blocked", async () => {
    vi.stubGlobal("caches", {
      delete: vi.fn().mockRejectedValue(new Error("denied in private browsing")),
    });
    await expect(purgeUserDataCaches()).resolves.toBeUndefined();
  });
});

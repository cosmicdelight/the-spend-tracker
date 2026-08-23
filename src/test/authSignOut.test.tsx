import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// vi.mock factories are hoisted above module scope, so the doubles they close over
// have to be created by vi.hoisted rather than declared as ordinary consts.
const mocks = vi.hoisted(() => ({
  supabaseSignOut: vi.fn(),
  unsubscribe: vi.fn(),
  purge: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: () => mocks.supabaseSignOut(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: mocks.unsubscribe } },
      }),
    },
  },
}));

vi.mock("@/lib/userDataCaches", () => ({
  purgeUserDataCaches: () => mocks.purge(),
  purgeAllCaches: vi.fn().mockResolvedValue(undefined),
}));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

function renderAuth() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const clear = vi.spyOn(queryClient, "clear");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useAuth(), { wrapper }), clear };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabaseSignOut.mockResolvedValue({ error: null });
  mocks.purge.mockResolvedValue(undefined);
});

describe("signOut", () => {
  it("clears the query cache and purges stored user data", async () => {
    const { result, clear } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(clear).toHaveBeenCalled();
    expect(mocks.purge).toHaveBeenCalled();
  });

  it("still purges when revocation throws, and reports the error", async () => {
    // supabase-js re-throws anything that is not an AuthError. Cleanup must not be
    // skipped in exactly the case where the user believes they signed out.
    const boom = new Error("network down");
    mocks.supabaseSignOut.mockRejectedValue(boom);

    const { result, clear } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { error: unknown } | undefined;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(clear).toHaveBeenCalled();
    expect(mocks.purge).toHaveBeenCalled();
    expect(outcome?.error).toBe(boom);
  });

  it("reports an error returned rather than thrown", async () => {
    const error = { name: "AuthApiError", message: "already signed out" };
    mocks.supabaseSignOut.mockResolvedValue({ error });

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { error: unknown } | undefined;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(outcome?.error).toBe(error);
    expect(mocks.purge).toHaveBeenCalled();
  });
});

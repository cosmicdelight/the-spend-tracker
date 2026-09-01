import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getErrorMessage, isRowLevelSecurityDenial } from "@/lib/errorUtils";

// vi.mock factories are hoisted above module scope, so the doubles they close over
// have to be created by vi.hoisted rather than declared as ordinary consts.
const mocks = vi.hoisted(() => ({
  selectResult: { data: [] as unknown[], error: null as unknown },
  insertResult: { data: null as unknown, error: null as unknown },
  insertSpy: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve(mocks.selectResult),
      }),
      insert: (rows: unknown) => {
        mocks.insertSpy(rows);
        return { select: () => Promise.resolve(mocks.insertResult) };
      },
    }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "demo-user-id", email: "demo@spendtracker.app" } }),
}));

import { usePaymentModes } from "@/hooks/usePaymentModes";

/** What PostgREST returns when a RESTRICTIVE policy refuses the write. */
const RLS_DENIAL = {
  code: "42501",
  message: 'new row violates row-level security policy for table "payment_modes"',
};

function renderPaymentModes() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePaymentModes(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectResult = { data: [], error: null };
  mocks.insertResult = { data: null, error: null };
});

describe("isRowLevelSecurityDenial", () => {
  it("recognises the SQLSTATE code", () => {
    expect(isRowLevelSecurityDenial(RLS_DENIAL)).toBe(true);
  });

  it("recognises the message when no code is attached", () => {
    expect(
      isRowLevelSecurityDenial({ message: "violates row-level security policy" }),
    ).toBe(true);
  });

  it("does not fire on ordinary errors", () => {
    expect(isRowLevelSecurityDenial(new Error("network down"))).toBe(false);
    expect(isRowLevelSecurityDenial({ code: "23502", message: "null value" })).toBe(false);
    expect(isRowLevelSecurityDenial(null)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("translates an RLS refusal into something a visitor can act on", () => {
    // The raw text is 'new row violates row-level security policy for table "..."',
    // which tells a demo visitor nothing about what to do next.
    expect(getErrorMessage(RLS_DENIAL)).toBe(
      "The demo account is read-only. Sign up to save your own data.",
    );
  });

  it("leaves unrelated errors alone", () => {
    expect(getErrorMessage(new Error("network down"))).toBe("network down");
    expect(getErrorMessage({ message: "duplicate key" })).toBe("duplicate key");
  });
});

describe("usePaymentModes under a read-only account", () => {
  it("still resolves when seeding defaults is refused", async () => {
    // The demo account reads an empty table, tries to seed defaults, and is denied.
    // Throwing there would fail the whole query and take the transaction form with it.
    mocks.insertResult = { data: null, error: RLS_DENIAL };

    const { result } = renderPaymentModes();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mocks.insertSpy).toHaveBeenCalled();
  });

  it("returns the seeded rows when the write is allowed", async () => {
    const seeded = [{ id: "1", value: "cash", label: "Cash", is_system: false }];
    mocks.insertResult = { data: seeded, error: null };

    const { result } = renderPaymentModes();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(seeded);
  });

  it("does not attempt to seed when rows already exist", async () => {
    const existing = [{ id: "1", value: "credit_card", label: "Credit Card", is_system: true }];
    mocks.selectResult = { data: existing, error: null };

    const { result } = renderPaymentModes();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(existing);
    expect(mocks.insertSpy).not.toHaveBeenCalled();
  });
});

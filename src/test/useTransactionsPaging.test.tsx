import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// vi.mock factories are hoisted above module scope, so the doubles they close over have
// to be created by vi.hoisted rather than declared as ordinary consts.
const mocks = vi.hoisted(() => ({
  rows: [] as { id: string }[],
  orderedBy: [] as string[],
  ranges: [] as [number, number][],
  selectOptions: [] as unknown[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder = {
    select: (_columns: string, options?: unknown) => {
      mocks.selectOptions.push(options);
      return builder;
    },
    order: (column: string) => {
      mocks.orderedBy.push(column);
      return builder;
    },
    range: (from: number, to: number) => {
      mocks.ranges.push([from, to]);
      return Promise.resolve({
        data: mocks.rows.slice(from, to + 1),
        error: null,
        count: mocks.rows.length,
      });
    },
  };
  return { supabase: { from: () => builder } };
});

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/attachmentStorage", () => ({
  removeAttachmentFiles: vi.fn(),
  ATTACHMENT_BUCKET: "transaction-attachments",
}));

import { useTransactions } from "@/hooks/useTransactions";

function renderTransactions() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useTransactions(), { wrapper });
}

beforeEach(() => {
  mocks.orderedBy = [];
  mocks.ranges = [];
  mocks.selectOptions = [];
});

describe("useTransactions", () => {
  it("loads every row rather than the first page", async () => {
    // Regression: the query ran unbounded, and PostgREST silently capped the response at
    // 1000. On the account that surfaced it, 4,288 of 5,288 transactions were invisible —
    // missing from search, from the stats tab, and from every month before the cutoff.
    mocks.rows = Array.from({ length: 2500 }, (_, i) => ({ id: `t${i}` }));

    const { result } = renderTransactions();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2500);
    expect(mocks.ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("orders by a unique column last so pages cannot overlap", async () => {
    // date and created_at do not uniquely order these rows — a CSV import stamps every
    // row it writes with the same created_at — and Postgres makes no promise about how
    // tied rows fall across two separate queries. Without a unique tiebreaker a row can
    // be served twice or not at all, which would reintroduce the loss being fixed.
    mocks.rows = [{ id: "t1" }];

    const { result } = renderTransactions();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.orderedBy).toEqual(["date", "created_at", "id"]);
  });

  it("asks for a row count, which is what makes the paging safe", async () => {
    // Without it the helper cannot tell the end of the table from the server's own cap,
    // and it refuses to run rather than guess.
    mocks.rows = [{ id: "t1" }];

    const { result } = renderTransactions();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.selectOptions[0]).toEqual({ count: "exact" });
  });

  it("still works for an account under one page", async () => {
    mocks.rows = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}` }));

    const { result } = renderTransactions();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(12);
    expect(mocks.ranges).toEqual([[0, 999]]);
  });
});

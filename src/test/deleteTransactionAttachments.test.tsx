import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// vi.mock factories are hoisted above module scope, so the doubles they close over
// have to be created by vi.hoisted rather than declared as ordinary consts.
const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  attachments: { data: [] as { file_path: string }[], error: null as unknown },
  deleteResult: { error: null as unknown },
  removeResult: { error: null as unknown },
  removedPaths: [] as string[][],
  removedBuckets: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          mocks.calls.push(`select:${table}`);
          return Promise.resolve(mocks.attachments);
        },
      }),
      delete: () => ({
        eq: () => {
          mocks.calls.push(`delete:${table}`);
          return Promise.resolve(mocks.deleteResult);
        },
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          mocks.calls.push("storage:remove");
          mocks.removedBuckets.push(bucket);
          mocks.removedPaths.push(paths);
          return Promise.resolve(mocks.removeResult);
        },
      }),
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

import { useDeleteTransaction } from "@/hooks/useTransactions";

function renderDelete() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useDeleteTransaction(), { wrapper });
}

beforeEach(() => {
  mocks.calls = [];
  mocks.attachments = { data: [], error: null };
  mocks.deleteResult = { error: null };
  mocks.removeResult = { error: null };
  mocks.removedPaths = [];
  mocks.removedBuckets = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDeleteTransaction cleans up attachment files", () => {
  it("removes every attached file from the bucket", async () => {
    mocks.attachments = {
      data: [{ file_path: "user-1/tx-1/a.jpg" }, { file_path: "user-1/tx-1/b.pdf" }],
      error: null,
    };
    const { result } = renderDelete();

    await act(async () => {
      await result.current.mutateAsync("tx-1");
    });

    expect(mocks.removedPaths).toEqual([["user-1/tx-1/a.jpg", "user-1/tx-1/b.pdf"]]);
    expect(mocks.removedBuckets).toEqual(["transaction-attachments"]);
  });

  it("reads the paths before deleting the row, not after", async () => {
    // transaction_attachments cascades on the transaction delete. Reading afterwards
    // returns nothing, so the files could never be found again — the ordering is the
    // whole fix, not an incidental detail.
    mocks.attachments = { data: [{ file_path: "user-1/tx-1/a.jpg" }], error: null };
    const { result } = renderDelete();

    await act(async () => {
      await result.current.mutateAsync("tx-1");
    });

    expect(mocks.calls).toEqual([
      "select:transaction_attachments",
      "delete:transactions",
      "storage:remove",
    ]);
  });

  it("touches storage at all only when there is something attached", async () => {
    mocks.attachments = { data: [], error: null };
    const { result } = renderDelete();

    await act(async () => {
      await result.current.mutateAsync("tx-1");
    });

    expect(mocks.removedPaths).toEqual([]);
    expect(mocks.calls).toEqual(["select:transaction_attachments", "delete:transactions"]);
  });

  it("leaves the files alone when the row delete fails", async () => {
    // The opposite order would destroy the receipts of a transaction that still exists.
    mocks.attachments = { data: [{ file_path: "user-1/tx-1/a.jpg" }], error: null };
    mocks.deleteResult = { error: { message: "delete failed" } };
    const { result } = renderDelete();

    await act(async () => {
      await expect(result.current.mutateAsync("tx-1")).rejects.toMatchObject({
        message: "delete failed",
      });
    });

    expect(mocks.removedPaths).toEqual([]);
  });

  it("still reports success when only the file removal fails", async () => {
    // The caller asked to delete the transaction and that happened. Failing here would
    // report an error for an operation that succeeded, and leave the UI out of step.
    mocks.attachments = { data: [{ file_path: "user-1/tx-1/a.jpg" }], error: null };
    mocks.removeResult = { error: { message: "storage unavailable" } };
    const { result } = renderDelete();

    await act(async () => {
      await expect(result.current.mutateAsync("tx-1")).resolves.toBeUndefined();
    });

    expect(mocks.calls).toContain("delete:transactions");
    expect(console.warn).toHaveBeenCalled();
  });
});

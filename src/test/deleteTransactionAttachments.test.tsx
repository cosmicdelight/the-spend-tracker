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
  // null means "remove everything asked for", which is what the real API does on
  // success: it echoes back one object per removed path.
  removeOverride: null as null | { data: unknown; error: unknown },
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
          return Promise.resolve(
            mocks.removeOverride ?? { data: paths.map((p) => ({ name: p })), error: null },
          );
        },
      }),
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

import { useDeleteTransaction } from "@/hooks/useTransactions";
import { useDeleteAttachment, type TransactionAttachment } from "@/hooks/useTransactionAttachments";

function renderWith<T>(hook: () => T) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
}

const attachment: TransactionAttachment = {
  id: "att-1",
  transaction_id: "tx-1",
  user_id: "user-1",
  file_name: "receipt.jpg",
  file_path: "user-1/tx-1/a.jpg",
  file_size: 1234,
  content_type: "image/jpeg",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  mocks.calls = [];
  mocks.attachments = { data: [], error: null };
  mocks.deleteResult = { error: null };
  mocks.removeOverride = null;
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
    const { result } = renderWith(useDeleteTransaction);

    await act(async () => {
      await result.current.mutateAsync("tx-1");
    });

    expect(mocks.removedPaths).toEqual([["user-1/tx-1/a.jpg", "user-1/tx-1/b.pdf"]]);
    expect(mocks.removedBuckets).toEqual(["transaction-attachments"]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("reads the paths before deleting the row, not after", async () => {
    // transaction_attachments cascades on the transaction delete. Reading afterwards
    // returns nothing, so the files could never be found again — the ordering is the
    // whole fix, not an incidental detail.
    mocks.attachments = { data: [{ file_path: "user-1/tx-1/a.jpg" }], error: null };
    const { result } = renderWith(useDeleteTransaction);

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
    const { result } = renderWith(useDeleteTransaction);

    await act(async () => {
      await result.current.mutateAsync("tx-1");
    });

    expect(mocks.removedPaths).toEqual([]);
    expect(mocks.calls).toEqual(["select:transaction_attachments", "delete:transactions"]);
  });

  it("notices when only some of the files were removed", async () => {
    // remove() reports a partial failure as error:null with a short data array, so
    // checking error alone would call this a clean success and leave an orphan.
    mocks.attachments = {
      data: [{ file_path: "user-1/tx-1/a.jpg" }, { file_path: "user-1/tx-1/b.pdf" }],
      error: null,
    };
    mocks.removeOverride = { data: [{ name: "user-1/tx-1/a.jpg" }], error: null };
    const { result } = renderWith(useDeleteTransaction);

    await act(async () => {
      await result.current.mutateAsync("tx-1");
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("1 of 2 attachment file(s) remain"),
      expect.anything(),
    );
  });

  it("leaves the files alone when the row delete fails", async () => {
    // The opposite order would destroy the receipts of a transaction that still exists.
    mocks.attachments = { data: [{ file_path: "user-1/tx-1/a.jpg" }], error: null };
    mocks.deleteResult = { error: { message: "delete failed" } };
    const { result } = renderWith(useDeleteTransaction);

    await act(async () => {
      await expect(result.current.mutateAsync("tx-1")).rejects.toMatchObject({
        message: "delete failed",
      });
    });

    expect(mocks.removedPaths).toEqual([]);
  });

  it("still reports success when only the file removal fails", async () => {
    mocks.attachments = { data: [{ file_path: "user-1/tx-1/a.jpg" }], error: null };
    mocks.removeOverride = { data: null, error: { message: "storage unavailable" } };
    const { result } = renderWith(useDeleteTransaction);

    await act(async () => {
      await expect(result.current.mutateAsync("tx-1")).resolves.toBeUndefined();
    });

    expect(mocks.calls).toContain("delete:transactions");
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("useDeleteAttachment matches that ordering", () => {
  it("deletes the row before removing the file", async () => {
    // It used to be the other way round. A failed row delete then left the attachment
    // pointing at a file that no longer existed — visible in the UI, impossible to
    // open, impossible to clear.
    const { result } = renderWith(useDeleteAttachment);

    await act(async () => {
      await result.current.mutateAsync({ attachment });
    });

    expect(mocks.calls).toEqual(["delete:transaction_attachments", "storage:remove"]);
    expect(mocks.removedPaths).toEqual([["user-1/tx-1/a.jpg"]]);
  });

  it("leaves the file alone when the row delete fails", async () => {
    mocks.deleteResult = { error: { message: "delete failed" } };
    const { result } = renderWith(useDeleteAttachment);

    await act(async () => {
      await expect(result.current.mutateAsync({ attachment })).rejects.toMatchObject({
        message: "delete failed",
      });
    });

    expect(mocks.removedPaths).toEqual([]);
  });

  it("reports a storage failure instead of discarding it", async () => {
    // This result was previously not captured at all, so an orphan left here was
    // completely silent.
    mocks.removeOverride = { data: null, error: { message: "storage unavailable" } };
    const { result } = renderWith(useDeleteAttachment);

    await act(async () => {
      await expect(result.current.mutateAsync({ attachment })).resolves.toBeUndefined();
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("att-1"),
      expect.anything(),
    );
  });
});

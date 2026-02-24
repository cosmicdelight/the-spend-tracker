import { Skeleton } from "@/components/ui/skeleton";

export default function IndexPageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl w-full flex-1 space-y-6 px-4 py-6 pb-20">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <Skeleton className="mx-auto mb-2 h-3 w-20" />
              <Skeleton className="mx-auto h-6 w-24" />
            </div>
          ))}
        </div>

        {/* Quick add buttons */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Content area */}
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </main>

      {/* Bottom tab bar skeleton */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="flex-1 h-14 m-1 rounded" />
          ))}
        </div>
      </nav>
    </div>
  );
}

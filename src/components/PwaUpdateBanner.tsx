import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { APP_BUILD_ID } from "@/lib/appVersion";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { purgeAllCaches } from "@/lib/userDataCaches";

const PwaUpdateBanner = () => {
  const { toast } = useToast();
  const [hasVersionMismatch, setHasVersionMismatch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      toast({
        title: "Update check failed",
        description: "We couldn't check for app updates right now. Please try again shortly.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const checkLatestVersion = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { buildId?: string };
        setHasVersionMismatch(Boolean(payload.buildId && payload.buildId !== APP_BUILD_ID));
      } catch {
        // Silent fallback: service-worker detection still handles normal update prompts.
      }
    };

    void checkLatestVersion();
    const checkIfVisible = () => {
      if (document.visibilityState === "visible") {
        void checkLatestVersion();
      }
    };

    const timer = window.setInterval(() => {
      void checkLatestVersion();
    }, 60000);
    document.addEventListener("visibilitychange", checkIfVisible);
    window.addEventListener("focus", checkIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkIfVisible);
      window.removeEventListener("focus", checkIfVisible);
    };
  }, []);

  // A version mismatch with no waiting worker means the page is being served by a stale
  // service worker. A plain reload goes through that same worker and returns the cached
  // build, so the banner would reappear forever; drop the worker and its caches first.
  const handleRefresh = async () => {
    setIsRefreshing(true);

    if (needRefresh) {
      void updateServiceWorker(true);
      return;
    }

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      await purgeAllCaches();
    } catch {
      // Reload anyway: a plain reload is still better than leaving the user stuck.
    }

    window.location.reload();
  };

  const shouldShowRefresh = useMemo(() => needRefresh || hasVersionMismatch, [needRefresh, hasVersionMismatch]);

  if (!shouldShowRefresh) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[110] flex justify-center px-4">
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Update available</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            A new version of SpendTracker is ready. Refresh to get the latest fixes and improvements.
          </p>
          <Button
            className="gap-2 sm:shrink-0"
            disabled={isRefreshing}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PwaUpdateBanner;

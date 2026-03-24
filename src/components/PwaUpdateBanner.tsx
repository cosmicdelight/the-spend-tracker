import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { APP_BUILD_TIME } from "@/lib/appVersion";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const PwaUpdateBanner = () => {
  const { toast } = useToast();
  const [hasVersionMismatch, setHasVersionMismatch] = useState(false);
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
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { buildTime?: string };
        if (payload.buildTime && payload.buildTime !== APP_BUILD_TIME) {
          setHasVersionMismatch(true);
        }
      } catch {
        // Silent fallback: service-worker detection still handles normal update prompts.
      }
    };

    void checkLatestVersion();
    const timer = window.setInterval(() => {
      void checkLatestVersion();
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

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
            onClick={() => {
              void updateServiceWorker(true);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PwaUpdateBanner;

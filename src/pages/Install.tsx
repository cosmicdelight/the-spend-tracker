import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Share, PlusSquare, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/pwa-icon-192.png" alt="SpendTracker" className="w-20 h-20 mx-auto rounded-2xl mb-4" />
          <CardTitle className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Install SpendTracker
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Add SpendTracker to your home screen for quick access and offline support.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">Already installed!</p>
              <p className="text-sm text-muted-foreground">SpendTracker is on your home screen.</p>
              <Button variant="outline" onClick={() => navigate("/")} className="mt-2">
                Go to App
              </Button>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="w-5 h-5" />
              Install App
            </Button>
          ) : isIOS ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">To install on iOS:</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Share className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">1. Tap the Share button</p>
                    <p className="text-xs text-muted-foreground">In Safari's toolbar at the bottom</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <PlusSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">2. Tap "Add to Home Screen"</p>
                    <p className="text-xs text-muted-foreground">Scroll down in the share menu</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <Smartphone className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Open this page in Chrome or Edge on your phone to install the app.
              </p>
            </div>
          )}

          <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground">
            Back to App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;

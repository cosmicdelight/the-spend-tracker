import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "dashboard" | "transactions" | "income" | "budget";

interface Step {
  target: string;
  tab: Tab;
  title: string;
  message: string;
}

const STEPS: Step[] = [
  {
    target: "dashboard-tab",
    tab: "dashboard",
    title: "Welcome to SpendTracker 👋",
    message:
      "Your Dashboard shows this month's spending summary and credit card progress at a glance.",
  },
  {
    target: "quick-add-button",
    tab: "dashboard",
    title: "Log an expense",
    message:
      "Tap here to log a new expense in seconds. Fill in the amount, category, and date.",
  },
  {
    target: "import-csv-button",
    tab: "dashboard",
    title: "Import from CSV",
    message:
      "Already have transaction history? Import it in bulk using a CSV file — supports both expenses and income.",
  },
  {
    target: "expenses-tab",
    tab: "transactions",
    title: "Expenses tab",
    message:
      "The Expenses tab shows all your transactions. You can filter, edit, and manage them here.",
  },
  {
    target: "income-tab",
    tab: "income",
    title: "Income tab",
    message:
      "Track your income here — salary, freelance, investments, and more.",
  },
  {
    target: "stats-tab",
    tab: "budget",
    title: "Stats tab",
    message:
      "The Stats tab shows budget breakdowns, income vs spending trends, and net savings over time.",
  },
];

const STORAGE_KEY = "onboarding-tour-seen";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourProps {
  onSetTab: (tab: Tab) => void;
}

export default function OnboardingTour({ onSetTab }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }, []);

  // Measure the target element, retrying if not found yet
  const measure = useCallback((target: string) => {
    let attempts = 0;
    const tryMeasure = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryMeasure, 80);
      }
    };
    tryMeasure();
  }, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const current = STEPS[step];
    onSetTab(current.tab);
    // Wait a tick for the tab content to render before measuring
    setTimeout(() => measure(current.target), 120);
  }, [step, visible, onSetTab, measure]);

  // Re-measure on resize
  useEffect(() => {
    if (!visible) return;
    const handler = () => measure(STEPS[step].target);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [step, visible, measure]);

  if (!visible || !rect) return null;

  const isLast = step === STEPS.length - 1;
  const padding = 6;

  // Tooltip positioning: prefer below, fall back to above
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const tooltipHeight = 160;
  const tooltipWidth = Math.min(300, window.innerWidth - 32);
  let tooltipTop =
    spaceBelow > tooltipHeight + 12
      ? rect.top + rect.height + padding + 6
      : rect.top - tooltipHeight - padding - 6;
  let tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
  tooltipLeft = Math.max(12, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 12));
  tooltipTop = Math.max(12, tooltipTop);

  return (
    <>
      {/* Dim overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div
          style={{
            position: "fixed",
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.58)",
          }}
        />
      </div>

      {/* Clickable backdrop to skip */}
      <div
        className="fixed inset-0 z-[101] cursor-default"
        onClick={dismiss}
        aria-label="Skip tour"
      />

      {/* Tooltip card */}
      <div
        className="fixed z-[102] pointer-events-auto"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-xl border bg-card shadow-2xl p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground leading-snug">
              {STEPS[step].title}
            </p>
            <button
              onClick={dismiss}
              className="shrink-0 rounded-md p-0.5 hover:bg-muted text-muted-foreground"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Message */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {STEPS[step].message}
          </p>

          {/* Step dots + actions */}
          <div className="flex items-center justify-between pt-1">
            {/* Dots */}
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                    i === step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={dismiss}
                className="text-xs text-muted-foreground hover:underline underline-offset-2"
              >
                Skip tour
              </button>
              <Button
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => {
                  if (isLast) {
                    dismiss();
                  } else {
                    setStep((s) => s + 1);
                  }
                }}
              >
                {isLast ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { STORAGE_KEY as TOUR_STORAGE_KEY };

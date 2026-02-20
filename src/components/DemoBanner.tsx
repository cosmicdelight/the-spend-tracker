import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-400/60 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-900 dark:border-yellow-700/50 dark:bg-yellow-950/30 dark:text-yellow-300">
      <span>
        👀 You're in <strong>demo mode</strong> — data is read-only.{" "}
        <Link to="/auth" className="font-semibold underline underline-offset-2 hover:opacity-80">
          Sign up
        </Link>{" "}
        to save your own data.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-0.5 hover:bg-yellow-200 dark:hover:bg-yellow-900"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

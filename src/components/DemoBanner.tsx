import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/** Single source for the signup destination — the link target and the post-sign-out
 *  navigation have to agree, and previously each spelled the route out separately. */
export const SIGNUP_PATH = "/auth?mode=signup";

/**
 * Banner shown to the shared demo account.
 *
 * This used to say "data is read-only", which was not true: `isDemo` gates only this
 * banner and the onboarding tour, and the demo user is an ordinary authenticated user
 * with full CRUD on its own rows via RLS. Anyone in the demo can write, and the demo
 * session token works against the API directly — so the copy is worded to warn rather
 * than to reassure. Don't claim read-only again without an RLS policy restricting the
 * demo user_id to SELECT; a client-side guard would not make the claim true.
 */
export default function DemoBanner() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.MouseEvent) => {
    // Let the browser keep modifier-clicks: Cmd/Ctrl-click means "open in a new tab",
    // and swallowing it here would silently destroy the session instead. Link's own
    // handler makes the same check, and skips itself once we preventDefault below.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    // signOut resolves with { error } and never throws, so an ignored return value
    // means a failed sign-out looks identical to a successful one. Navigating anyway
    // would leave the visitor authenticated, and Auth bounces authenticated users
    // straight back to "/" — the click would appear to do nothing at all.
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Could not sign out",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
      return;
    }

    navigate(SIGNUP_PATH);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-yellow-400/60 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-900 dark:border-yellow-700/50 dark:bg-yellow-950/30 dark:text-yellow-300">
      <span>
        👀 You're in <strong>demo mode</strong> — this is a shared sample account, so anything you
        enter here is visible to everyone else trying the demo.{" "}
        <Link to={SIGNUP_PATH} onClick={handleSignUp} className="font-semibold underline underline-offset-2 hover:opacity-80">
          Sign up
        </Link>{" "}
        to save your own data.
      </span>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut();
    navigate("/auth?mode=signup");
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-yellow-400/60 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-900 dark:border-yellow-700/50 dark:bg-yellow-950/30 dark:text-yellow-300">
      <span>
        👀 You're in <strong>demo mode</strong> — this is a shared sample account, so anything you
        enter here is visible to everyone else trying the demo.{" "}
        <a href="/auth?mode=signup" onClick={handleSignUp} className="font-semibold underline underline-offset-2 hover:opacity-80">
          Sign up
        </a>{" "}
        to save your own data.
      </span>
    </div>
  );
}

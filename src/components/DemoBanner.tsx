import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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
        👀 You're in <strong>demo mode</strong> — data is read-only.{" "}
        <a href="/auth?mode=signup" onClick={handleSignUp} className="font-semibold underline underline-offset-2 hover:opacity-80">
          Sign up
        </a>{" "}
        to save your own data.
      </span>
    </div>
  );
}

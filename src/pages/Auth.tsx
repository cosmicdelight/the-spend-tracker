import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PasswordInput from "@/components/PasswordInput";
import PasswordRequirements from "@/components/PasswordRequirements";
import { isPasswordValid } from "@/lib/passwordValidation";
import { TOUR_STORAGE_KEY } from "@/components/OnboardingTour";

export default function Auth() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  if (user) return <Navigate to="/" replace />;

  const handleTryDemo = async () => {
    setSubmitting(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/demo-login`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.error ?? "Demo unavailable");
      }
      // Pre-set tour as seen so demo users skip the onboarding tour
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    } catch (err: any) {
      toast({ title: "Demo unavailable", description: "Could not load the demo account. Please try again later.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We sent you a password reset link." });
        setMode("signin");
      }
      return;
    }

    if (mode === "signup") {
      if (!isPasswordValid(password)) {
        toast({ title: "Password doesn't meet requirements", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", variant: "destructive" });
        setSubmitting(false);
        return;
      }
    }

    const { error } = mode === "signup" ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (mode === "signup") {
      toast({ title: "Check your email", description: "We sent you a confirmation link to verify your account." });
    }
  };

  const title = mode === "signup" ? "Create Account" : mode === "forgot" ? "Forgot Password" : "Welcome Back";
  const description = mode === "signup" ? "Start tracking your spending" : mode === "forgot" ? "Enter your email to receive a reset link" : "Sign in to your finance tracker";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <CreditCard className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-heading">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {mode !== "forgot" && (
              <PasswordInput placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            )}
            {mode === "signup" && (
              <>
                <PasswordRequirements password={password} />
                <PasswordInput placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait..." : mode === "signup" ? "Sign Up" : mode === "forgot" ? "Send Reset Link" : "Sign In"}
            </Button>
          </form>
          {mode === "signin" && (
            <p className="mt-2 text-center">
              <button onClick={() => setMode("forgot")} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Forgot password?
              </button>
            </p>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <button onClick={() => setMode("signin")} className="font-medium text-primary underline-offset-4 hover:underline">
                Back to Sign In
              </button>
            ) : (
              <>
                {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setConfirmPassword(""); }} className="font-medium text-primary underline-offset-4 hover:underline">
                  {mode === "signup" ? "Sign In" : "Sign Up"}
                </button>
              </>
            )}
          </p>
          {mode === "signin" && (
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t" />
            </div>
          )}
          {mode === "signin" && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full gap-2"
              onClick={handleTryDemo}
              disabled={submitting}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Try Demo
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

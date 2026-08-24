import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { purgeUserDataCaches } from "@/lib/userDataCaches";
import type { User, Session, AuthError } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Must be rendered inside a QueryClientProvider — sign-out clears the query cache. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      // Prevent permanent loading state if session bootstrap stalls.
      setLoading(false);
    }, 10000);

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      window.clearTimeout(timeoutId);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    const bootstrapSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        applySession(data.session);
      } catch {
        applySession(null);
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    let error: AuthError | null = null;
    try {
      ({ error } = await supabase.auth.signOut());
    } catch (caught) {
      // supabase-js returns { error } for AuthErrors but re-throws anything else, a
      // network fault included.
      error = caught as AuthError;
    } finally {
      // Runs even when revocation failed: a network error must not leave the previous
      // account's rows readable. Memory first — clear() is synchronous — then the disk
      // caches, so nothing is served from memory while the delete is in flight.
      queryClient.clear();
      await purgeUserDataCaches();
    }
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

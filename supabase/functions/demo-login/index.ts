import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DEMO_PASSWORD = Deno.env.get("DEMO_PASSWORD");
  const DEMO_EMAIL = "demo@spendtracker.app";

  if (!DEMO_PASSWORD) {
    return new Response(JSON.stringify({ error: "Demo not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error || !data.session) {
    return new Response(JSON.stringify({ error: error?.message ?? "Login failed" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // Fetch all active auto-generate recurring transactions due today or earlier
    const { data: recurring, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("is_active", true)
      .eq("auto_generate", true)
      .lte("next_due_date", today);

    if (fetchError) throw fetchError;
    if (!recurring || recurring.length === 0) {
      return new Response(JSON.stringify({ message: "No due recurring transactions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;

    for (const rec of recurring) {
      // Insert the transaction
      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: rec.user_id,
        amount: rec.amount,
        personal_amount: rec.personal_amount,
        category: rec.category,
        sub_category: rec.sub_category,
        payment_mode: rec.payment_mode,
        credit_card_id: rec.credit_card_id,
        description: rec.description,
        notes: rec.notes,
        date: rec.next_due_date,
      });

      if (insertError) {
        console.error(`Failed to create transaction for recurring ${rec.id}:`, insertError);
        continue;
      }

      // Calculate next due date
      const nextDate = new Date(rec.next_due_date);
      if (rec.frequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      await supabase
        .from("recurring_transactions")
        .update({
          last_generated_at: new Date().toISOString(),
          next_due_date: nextDate.toISOString().split("T")[0],
        })
        .eq("id", rec.id);

      created++;
    }

    return new Response(JSON.stringify({ message: `Created ${created} transactions` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing recurring transactions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

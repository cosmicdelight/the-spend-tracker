// seed-demo-account — one-time setup edge function
//
// Call once after deployment:
//   curl -X POST https://<project>.supabase.co/functions/v1/seed-demo-account \
//     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
//
// This will create the demo user and seed
// realistic mock data. Safe to call multiple times — it wipes existing demo data first.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@spendtracker.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DEMO_PASSWORD = Deno.env.get("DEMO_PASSWORD");
  if (!DEMO_PASSWORD) {
    return new Response(JSON.stringify({ error: "DEMO_PASSWORD secret is not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Allow: service role key OR a special no-auth "sync password only" mode
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const demoPassword = Deno.env.get("DEMO_PASSWORD");
  const seedHeader = req.headers.get("x-seed-admin");
  const isServiceRole = serviceRoleKey && token === serviceRoleKey;
  const isSeedRequest = demoPassword && seedHeader === demoPassword;
  const syncOnlySecret = Deno.env.get("SYNC_ONLY_SECRET");
  const isSyncOnly = syncOnlySecret && req.headers.get("x-sync-only") === syncOnlySecret && req.method === "POST";
  if (!isServiceRole && !isSeedRequest && !isSyncOnly) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const actualServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, actualServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Find or create demo user
  const { data: listData, error: listError } =
    await admin.auth.admin.listUsers();
  if (listError) {
    return new Response(JSON.stringify({ error: listError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let userId: string;
  const existing = listData.users.find((u) => u.email === DEMO_EMAIL);

  if (existing) {
    userId = existing.id;
    // Update password in case it changed
    await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
  } else {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
    if (createError || !created.user) {
      return new Response(
        JSON.stringify({ error: createError?.message ?? "Failed to create user" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    userId = created.user.id;
  }

  // If sync-only mode, just update the password and return
  if (isSyncOnly) {
    return new Response(JSON.stringify({ success: true, userId, mode: "password-sync" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Wipe existing demo data
  await Promise.all([
    admin.from("transactions").delete().eq("user_id", userId),
    admin.from("income").delete().eq("user_id", userId),
    admin.from("recurring_transactions").delete().eq("user_id", userId),
    admin.from("credit_cards").delete().eq("user_id", userId),
    admin.from("budget_categories").delete().eq("user_id", userId),
    admin.from("income_categories").delete().eq("user_id", userId),
    admin.from("payment_modes").delete().eq("user_id", userId).eq("is_system", false),
  ]);

  // 3. Seed categories
  const budgetCategories = [
    { name: "Groceries", sub_category_name: null },
    { name: "Dining", sub_category_name: null },
    { name: "Dining", sub_category_name: "Restaurants" },
    { name: "Dining", sub_category_name: "Fast Food" },
    { name: "Dining", sub_category_name: "Cafes" },
    { name: "Transport", sub_category_name: null },
    { name: "Transport", sub_category_name: "Gas" },
    { name: "Transport", sub_category_name: "Rideshare" },
    { name: "Entertainment", sub_category_name: null },
    { name: "Entertainment", sub_category_name: "Streaming" },
    { name: "Entertainment", sub_category_name: "Activities" },
    { name: "Health", sub_category_name: null },
    { name: "Health", sub_category_name: "Gym" },
    { name: "Health", sub_category_name: "Medical" },
    { name: "Health", sub_category_name: "Pharmacy" },
    { name: "Shopping", sub_category_name: null },
    { name: "Shopping", sub_category_name: "Electronics" },
    { name: "Shopping", sub_category_name: "Clothing" },
    { name: "Shopping", sub_category_name: "Home" },
    { name: "Travel", sub_category_name: null },
    { name: "Travel", sub_category_name: "Flights" },
    { name: "Travel", sub_category_name: "Accommodation" },
    { name: "Utilities", sub_category_name: null },
    { name: "Utilities", sub_category_name: "Internet" },
    { name: "Utilities", sub_category_name: "Electric" },
  ].map((c) => ({ ...c, user_id: userId }));

  const incomeCategories = [
    { name: "Salary & Employment", sub_category_name: "Base" },
    { name: "Salary & Employment", sub_category_name: "Bonus" },
    { name: "Investments", sub_category_name: "Dividends" },
    { name: "Rental Income", sub_category_name: null },
  ].map((c) => ({ ...c, user_id: userId }));

  await Promise.all([
    admin.from("budget_categories").insert(budgetCategories),
    admin.from("income_categories").insert(incomeCategories),
  ]);

  // 4. Build seed data inline (mirrors seedDemoData.ts logic)
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const date = (monthOffset: number, day: number) => {
    const dt = new Date(y, mo + monthOffset, day);
    return dt.toISOString().split("T")[0];
  };

  const cc1 = "cc000001-0000-0000-0000-000000000001";
  const cc2 = "cc000002-0000-0000-0000-000000000002";

  const cards = [
    { id: cc1, user_id: userId, name: "Chase Sapphire", spend_target: 4000, start_date: date(-2, 1), time_period_months: 3, sort_order: 0 },
    { id: cc2, user_id: userId, name: "Amex Gold",      spend_target: 3000, start_date: date(-1, 1), time_period_months: 3, sort_order: 1 },
  ];

  const rawTx = [
    // This month
    { date: date(0, 2),  description: "Whole Foods",   category: "Groceries",     sub_category: null,            amount: 87.34,  personal_amount: 87.34,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 3),  description: "Netflix",        category: "Entertainment", sub_category: "Streaming",     amount: 15.99,  personal_amount: 15.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 4),  description: "Shell Gas",      category: "Transport",     sub_category: "Gas",           amount: 62.00,  personal_amount: 62.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 5),  description: "Chipotle",       category: "Dining",        sub_category: "Fast Food",     amount: 18.75,  personal_amount: 18.75,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(0, 6),  description: "Amazon",         category: "Shopping",      sub_category: "Electronics",   amount: 134.99, personal_amount: 134.99, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(0, 7),  description: "Uber",           category: "Transport",     sub_category: "Rideshare",     amount: 22.50,  personal_amount: 11.25,  payment_mode: "credit_card", credit_card_id: cc1, notes: "Split with Alex" },
    { date: date(0, 8),  description: "Spotify",        category: "Entertainment", sub_category: "Streaming",     amount: 9.99,   personal_amount: 9.99,   payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 9),  description: "CVS Pharmacy",   category: "Health",        sub_category: "Pharmacy",      amount: 31.20,  personal_amount: 31.20,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(0, 10), description: "Trader Joe's",   category: "Groceries",     sub_category: null,            amount: 72.48,  personal_amount: 72.48,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 11), description: "Dinner out",     category: "Dining",        sub_category: "Restaurants",   amount: 95.00,  personal_amount: 47.50,  payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with Jamie" },
    { date: date(0, 12), description: "Planet Fitness", category: "Health",        sub_category: "Gym",           amount: 24.99,  personal_amount: 24.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 14), description: "Airbnb",         category: "Travel",        sub_category: "Accommodation", amount: 320.00, personal_amount: 160.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split weekend trip" },
    { date: date(0, 15), description: "Apple Store",    category: "Shopping",      sub_category: "Electronics",   amount: 89.00,  personal_amount: 89.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    // Last month
    { date: date(-1, 3),  description: "Whole Foods",   category: "Groceries",     sub_category: null,            amount: 91.22,  personal_amount: 91.22,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 5),  description: "Electricity",   category: "Utilities",     sub_category: "Electric",      amount: 78.00,  personal_amount: 78.00,  payment_mode: "bank_transfer" },
    { date: date(-1, 7),  description: "Delta Airlines",category: "Travel",        sub_category: "Flights",       amount: 450.00, personal_amount: 225.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with partner" },
    { date: date(-1, 9),  description: "Starbucks",     category: "Dining",        sub_category: "Cafes",         amount: 6.75,   personal_amount: 6.75,   payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 11), description: "Comcast",       category: "Utilities",     sub_category: "Internet",      amount: 89.99,  personal_amount: 89.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 13), description: "Target",        category: "Shopping",      sub_category: "Home",          amount: 112.44, personal_amount: 112.44, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-1, 15), description: "Massage Envy",  category: "Health",        sub_category: "Medical",       amount: 79.00,  personal_amount: 79.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 17), description: "Shell Gas",     category: "Transport",     sub_category: "Gas",           amount: 58.30,  personal_amount: 58.30,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 19), description: "Sushi dinner",  category: "Dining",        sub_category: "Restaurants",   amount: 140.00, personal_amount: 70.00,  payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with friend" },
    { date: date(-1, 21), description: "Costco",        category: "Groceries",     sub_category: null,            amount: 187.55, personal_amount: 187.55, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-1, 23), description: "Lyft",          category: "Transport",     sub_category: "Rideshare",     amount: 17.80,  personal_amount: 17.80,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 25), description: "IKEA",          category: "Shopping",      sub_category: "Home",          amount: 245.00, personal_amount: 245.00, payment_mode: "credit_card", credit_card_id: cc2 },
    // Two months ago
    { date: date(-2, 4),  description: "Whole Foods",   category: "Groceries",     sub_category: null,            amount: 83.10,  personal_amount: 83.10,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 6),  description: "Hulu",          category: "Entertainment", sub_category: "Streaming",     amount: 17.99,  personal_amount: 17.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 8),  description: "Shell Gas",     category: "Transport",     sub_category: "Gas",           amount: 55.40,  personal_amount: 55.40,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 10), description: "Dentist",       category: "Health",        sub_category: "Medical",       amount: 200.00, personal_amount: 200.00, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-2, 12), description: "Chipotle",      category: "Dining",        sub_category: "Fast Food",     amount: 14.50,  personal_amount: 14.50,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 14), description: "Internet",      category: "Utilities",     sub_category: "Internet",      amount: 59.99,  personal_amount: 59.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 16), description: "Amazon",        category: "Shopping",      sub_category: "Electronics",   amount: 67.20,  personal_amount: 67.20,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-2, 18), description: "Weekend trip",  category: "Travel",        sub_category: "Accommodation", amount: 280.00, personal_amount: 140.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with group" },
    { date: date(-2, 20), description: "Trader Joe's",  category: "Groceries",     sub_category: null,            amount: 68.90,  personal_amount: 68.90,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 22), description: "Bowling",       category: "Entertainment", sub_category: "Activities",    amount: 45.00,  personal_amount: 22.50,  payment_mode: "cash",        notes: "Split with friends" },
    { date: date(-2, 24), description: "Pharmacy",      category: "Health",        sub_category: "Pharmacy",      amount: 28.60,  personal_amount: 28.60,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 26), description: "Uber Eats",     category: "Dining",        sub_category: "Fast Food",     amount: 38.99,  personal_amount: 38.99,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-2, 28), description: "Zara",          category: "Shopping",      sub_category: "Clothing",      amount: 119.00, personal_amount: 119.00, payment_mode: "credit_card", credit_card_id: cc2 },
  ];

  const transactions = rawTx.map((t) => ({
    user_id: userId,
    original_amount: t.amount,
    original_currency: "USD",
    sub_category: null,
    notes: null,
    credit_card_id: null,
    ...t,
  }));

  const income = [
    { date: date(-2, 1),  description: "Monthly salary",       category: "Salary & Employment", sub_category: "Base",     amount: 5800,   original_amount: 5800 },
    { date: date(-1, 1),  description: "Monthly salary",       category: "Salary & Employment", sub_category: "Base",     amount: 5800,   original_amount: 5800 },
    { date: date(0, 1),   description: "Monthly salary",       category: "Salary & Employment", sub_category: "Base",     amount: 5800,   original_amount: 5800 },
    { date: date(-1, 15), description: "Q4 performance bonus", category: "Salary & Employment", sub_category: "Bonus",    amount: 1500,   original_amount: 1500 },
    { date: date(-2, 20), description: "VOOG dividends",       category: "Investments",         sub_category: "Dividends",amount: 142.30, original_amount: 142.30 },
    { date: date(-1, 20), description: "VOOG dividends",       category: "Investments",         sub_category: "Dividends",amount: 148.75, original_amount: 148.75 },
  ].map((inc) => ({
    user_id: userId,
    original_currency: "USD",
    notes: null,
    ...inc,
  }));

  const recurring = [
    {
      user_id: userId,
      description: "Netflix",
      category: "Entertainment",
      sub_category: "Streaming",
      amount: 15.99,
      personal_amount: 15.99,
      payment_mode: "credit_card",
      credit_card_id: cc1,
      frequency: "monthly",
      day_of_month: 3,
      day_of_week: null,
      next_due_date: date(0, 3),
      is_active: true,
      auto_generate: true,
      transaction_type: "expense",
      notes: null,
    },
    {
      user_id: userId,
      description: "Planet Fitness",
      category: "Health",
      sub_category: "Gym",
      amount: 24.99,
      personal_amount: 24.99,
      payment_mode: "credit_card",
      credit_card_id: cc1,
      frequency: "monthly",
      day_of_month: 12,
      day_of_week: null,
      next_due_date: date(0, 12),
      is_active: true,
      auto_generate: true,
      transaction_type: "expense",
      notes: null,
    },
    {
      user_id: userId,
      description: "Comcast Internet",
      category: "Utilities",
      sub_category: "Internet",
      amount: 89.99,
      personal_amount: 89.99,
      payment_mode: "credit_card",
      credit_card_id: cc1,
      frequency: "monthly",
      day_of_month: 11,
      day_of_week: null,
      next_due_date: date(0, 11),
      is_active: true,
      auto_generate: false,
      transaction_type: "expense",
      notes: null,
    },
  ];

  // 5. Insert everything (cards first due to FK constraints)
  const cardsRes = await admin.from("credit_cards").insert(cards);
  if (cardsRes.error) {
    return new Response(JSON.stringify({ error: [cardsRes.error.message] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [txRes, incRes, recRes] = await Promise.all([
    admin.from("transactions").insert(transactions),
    admin.from("income").insert(income),
    admin.from("recurring_transactions").insert(recurring),
  ]);

  const errors = [cardsRes.error, txRes.error, incRes.error, recRes.error].filter(Boolean);
  if (errors.length) {
    return new Response(JSON.stringify({ error: errors.map((e) => e!.message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      userId,
      seeded: {
        cards: cards.length,
        transactions: transactions.length,
        income: income.length,
        recurring: recurring.length,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

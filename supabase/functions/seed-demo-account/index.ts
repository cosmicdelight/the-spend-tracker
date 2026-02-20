// seed-demo-account — one-time setup edge function
//
// Call once after deployment:
//   curl -X POST https://<project>.supabase.co/functions/v1/seed-demo-account \
//     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
//
// This will create the demo user (demo@spendtracker.app / DemoPass123!) and seed
// realistic mock data. Safe to call multiple times — it wipes existing demo data first.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@spendtracker.app";
const DEMO_PASSWORD = "DemoPass123!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow requests with the service role key
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
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
    "Groceries","Dining","Transport","Entertainment","Health",
    "Shopping","Travel","Utilities",
  ].map((name) => ({ user_id: userId, name, sub_category_name: null }));

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
    { date: date(0, 2),  description: "Whole Foods",   category: "Groceries",     amount: 87.34,  personal_amount: 87.34,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 3),  description: "Netflix",        category: "Entertainment", amount: 15.99,  personal_amount: 15.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 4),  description: "Shell Gas",      category: "Transport",     amount: 62.00,  personal_amount: 62.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 5),  description: "Chipotle",       category: "Dining",        amount: 18.75,  personal_amount: 18.75,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(0, 6),  description: "Amazon",         category: "Shopping",      amount: 134.99, personal_amount: 134.99, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(0, 7),  description: "Uber",           category: "Transport",     amount: 22.50,  personal_amount: 11.25,  payment_mode: "credit_card", credit_card_id: cc1, notes: "Split with Alex" },
    { date: date(0, 8),  description: "Spotify",        category: "Entertainment", amount: 9.99,   personal_amount: 9.99,   payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 9),  description: "CVS Pharmacy",   category: "Health",        amount: 31.20,  personal_amount: 31.20,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(0, 10), description: "Trader Joe's",   category: "Groceries",     amount: 72.48,  personal_amount: 72.48,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 11), description: "Dinner out",     category: "Dining",        amount: 95.00,  personal_amount: 47.50,  payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with Jamie" },
    { date: date(0, 12), description: "Planet Fitness", category: "Health",        amount: 24.99,  personal_amount: 24.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(0, 14), description: "Airbnb",         category: "Travel",        amount: 320.00, personal_amount: 160.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split weekend trip" },
    { date: date(0, 15), description: "Apple Store",    category: "Shopping",      amount: 89.00,  personal_amount: 89.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 3),  description: "Whole Foods",   category: "Groceries",     amount: 91.22,  personal_amount: 91.22,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 5),  description: "Electricity",   category: "Utilities",     amount: 78.00,  personal_amount: 78.00,  payment_mode: "bank_transfer" },
    { date: date(-1, 7),  description: "Delta Airlines",category: "Travel",        amount: 450.00, personal_amount: 225.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with partner" },
    { date: date(-1, 9),  description: "Starbucks",     category: "Dining",        amount: 6.75,   personal_amount: 6.75,   payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 11), description: "Comcast",       category: "Utilities",     amount: 89.99,  personal_amount: 89.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 13), description: "Target",        category: "Shopping",      amount: 112.44, personal_amount: 112.44, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-1, 15), description: "Massage Envy",  category: "Health",        amount: 79.00,  personal_amount: 79.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 17), description: "Shell Gas",     category: "Transport",     amount: 58.30,  personal_amount: 58.30,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 19), description: "Sushi dinner",  category: "Dining",        amount: 140.00, personal_amount: 70.00,  payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with friend" },
    { date: date(-1, 21), description: "Costco",        category: "Groceries",     amount: 187.55, personal_amount: 187.55, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-1, 23), description: "Lyft",          category: "Transport",     amount: 17.80,  personal_amount: 17.80,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-1, 25), description: "IKEA",          category: "Shopping",      amount: 245.00, personal_amount: 245.00, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-2, 4),  description: "Whole Foods",   category: "Groceries",     amount: 83.10,  personal_amount: 83.10,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 6),  description: "Hulu",          category: "Entertainment", amount: 17.99,  personal_amount: 17.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 8),  description: "Shell Gas",     category: "Transport",     amount: 55.40,  personal_amount: 55.40,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 10), description: "Dentist",       category: "Health",        amount: 200.00, personal_amount: 200.00, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-2, 12), description: "Chipotle",      category: "Dining",        amount: 14.50,  personal_amount: 14.50,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 14), description: "Internet",      category: "Utilities",     amount: 59.99,  personal_amount: 59.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 16), description: "Amazon",        category: "Shopping",      amount: 67.20,  personal_amount: 67.20,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-2, 18), description: "Weekend trip",  category: "Travel",        amount: 280.00, personal_amount: 140.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with group" },
    { date: date(-2, 20), description: "Trader Joe's",  category: "Groceries",     amount: 68.90,  personal_amount: 68.90,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 22), description: "Bowling",       category: "Entertainment", amount: 45.00,  personal_amount: 22.50,  payment_mode: "cash",        notes: "Split with friends" },
    { date: date(-2, 24), description: "Pharmacy",      category: "Health",        amount: 28.60,  personal_amount: 28.60,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: date(-2, 26), description: "Uber Eats",     category: "Dining",        amount: 38.99,  personal_amount: 38.99,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: date(-2, 28), description: "Zara",          category: "Shopping",      amount: 119.00, personal_amount: 119.00, payment_mode: "credit_card", credit_card_id: cc2 },
  ];

  const transactions = rawTx.map((t, i) => ({
    id: `tx${String(i + 1).padStart(6, "0")}-0000-0000-0000-000000000000`,
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
  ].map((inc, i) => ({
    id: `inc${String(i + 1).padStart(5, "0")}-0000-0000-0000-000000000000`,
    user_id: userId,
    original_currency: "USD",
    notes: null,
    ...inc,
  }));

  const recurring = [
    {
      id: "rec00001-0000-0000-0000-000000000001",
      user_id: userId,
      description: "Netflix",
      category: "Entertainment",
      sub_category: null,
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
      id: "rec00002-0000-0000-0000-000000000002",
      user_id: userId,
      description: "Planet Fitness",
      category: "Health",
      sub_category: null,
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
      id: "rec00003-0000-0000-0000-000000000003",
      user_id: userId,
      description: "Comcast Internet",
      category: "Utilities",
      sub_category: null,
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

  // 5. Insert everything
  const [cardsRes, txRes, incRes, recRes] = await Promise.all([
    admin.from("credit_cards").insert(cards),
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

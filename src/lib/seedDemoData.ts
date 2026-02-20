export const DEMO_EMAIL = "demo@spendtracker.app";
export const DEMO_PASSWORD = "DemoPass123!";

// Called from the seed-demo-account edge function
export function buildDemoSeedPayload(userId: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  // Helper: date string N months ago, on a given day
  const d = (monthOffset: number, day: number) => {
    const dt = new Date(y, m + monthOffset, day);
    return dt.toISOString().split("T")[0];
  };

  const cards = [
    {
      id: "cc000001-0000-0000-0000-000000000001",
      user_id: userId,
      name: "Chase Sapphire",
      spend_target: 4000,
      start_date: d(-2, 1),
      time_period_months: 3,
      sort_order: 0,
    },
    {
      id: "cc000002-0000-0000-0000-000000000002",
      user_id: userId,
      name: "Amex Gold",
      spend_target: 3000,
      start_date: d(-1, 1),
      time_period_months: 3,
      sort_order: 1,
    },
  ];

  const cc1 = cards[0].id;
  const cc2 = cards[1].id;

  const transactions = [
    // This month
    { date: d(0, 2),  description: "Whole Foods", category: "Groceries", amount: 87.34,  personal_amount: 87.34,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(0, 3),  description: "Netflix",     category: "Entertainment", amount: 15.99, personal_amount: 15.99, payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(0, 4),  description: "Shell Gas",   category: "Transport",  amount: 62.00,  personal_amount: 62.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(0, 5),  description: "Chipotle",    category: "Dining",     amount: 18.75,  personal_amount: 18.75,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(0, 6),  description: "Amazon",      category: "Shopping",   amount: 134.99, personal_amount: 134.99, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(0, 7),  description: "Uber",        category: "Transport",  amount: 22.50,  personal_amount: 11.25,  payment_mode: "credit_card", credit_card_id: cc1, notes: "Split with Alex" },
    { date: d(0, 8),  description: "Spotify",     category: "Entertainment", amount: 9.99, personal_amount: 9.99, payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(0, 9),  description: "CVS Pharmacy",category: "Health",    amount: 31.20,  personal_amount: 31.20,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(0, 10), description: "Trader Joe's",category: "Groceries", amount: 72.48,  personal_amount: 72.48,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(0, 11), description: "Dinner out",  category: "Dining",    amount: 95.00,  personal_amount: 47.50,  payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with Jamie" },
    { date: d(0, 12), description: "Planet Fitness", category: "Health", amount: 24.99, personal_amount: 24.99, payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(0, 14), description: "Airbnb",      category: "Travel",    amount: 320.00, personal_amount: 160.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split weekend trip" },
    { date: d(0, 15), description: "Apple Store", category: "Shopping",  amount: 89.00,  personal_amount: 89.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    // Last month
    { date: d(-1, 3),  description: "Whole Foods",  category: "Groceries",    amount: 91.22,  personal_amount: 91.22,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-1, 5),  description: "Electricity",  category: "Utilities",     amount: 78.00,  personal_amount: 78.00,  payment_mode: "bank_transfer" },
    { date: d(-1, 7),  description: "Delta Airlines",category: "Travel",       amount: 450.00, personal_amount: 225.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with partner" },
    { date: d(-1, 9),  description: "Starbucks",    category: "Dining",        amount: 6.75,   personal_amount: 6.75,   payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-1, 11), description: "Comcast",      category: "Utilities",     amount: 89.99,  personal_amount: 89.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-1, 13), description: "Target",       category: "Shopping",      amount: 112.44, personal_amount: 112.44, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(-1, 15), description: "Massage Envy", category: "Health",        amount: 79.00,  personal_amount: 79.00,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-1, 17), description: "Shell Gas",    category: "Transport",     amount: 58.30,  personal_amount: 58.30,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-1, 19), description: "Sushi dinner", category: "Dining",        amount: 140.00, personal_amount: 70.00,  payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with friend" },
    { date: d(-1, 21), description: "Costco",       category: "Groceries",     amount: 187.55, personal_amount: 187.55, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(-1, 23), description: "Lyft",         category: "Transport",     amount: 17.80,  personal_amount: 17.80,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-1, 25), description: "IKEA",         category: "Shopping",      amount: 245.00, personal_amount: 245.00, payment_mode: "credit_card", credit_card_id: cc2 },
    // Two months ago
    { date: d(-2, 4),  description: "Whole Foods",  category: "Groceries",    amount: 83.10,  personal_amount: 83.10,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-2, 6),  description: "Hulu",         category: "Entertainment", amount: 17.99,  personal_amount: 17.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-2, 8),  description: "Shell Gas",    category: "Transport",     amount: 55.40,  personal_amount: 55.40,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-2, 10), description: "Dentist",      category: "Health",        amount: 200.00, personal_amount: 200.00, payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(-2, 12), description: "Chipotle",     category: "Dining",        amount: 14.50,  personal_amount: 14.50,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-2, 14), description: "Internet",     category: "Utilities",     amount: 59.99,  personal_amount: 59.99,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-2, 16), description: "Amazon",       category: "Shopping",      amount: 67.20,  personal_amount: 67.20,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(-2, 18), description: "Weekend trip", category: "Travel",        amount: 280.00, personal_amount: 140.00, payment_mode: "credit_card", credit_card_id: cc2, notes: "Split with group" },
    { date: d(-2, 20), description: "Trader Joe's", category: "Groceries",    amount: 68.90,  personal_amount: 68.90,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-2, 22), description: "Bowling",      category: "Entertainment", amount: 45.00,  personal_amount: 22.50,  payment_mode: "cash",        notes: "Split with friends" },
    { date: d(-2, 24), description: "Pharmacy",     category: "Health",        amount: 28.60,  personal_amount: 28.60,  payment_mode: "credit_card", credit_card_id: cc1 },
    { date: d(-2, 26), description: "Uber Eats",    category: "Dining",        amount: 38.99,  personal_amount: 38.99,  payment_mode: "credit_card", credit_card_id: cc2 },
    { date: d(-2, 28), description: "Zara",         category: "Shopping",      amount: 119.00, personal_amount: 119.00, payment_mode: "credit_card", credit_card_id: cc2 },
  ].map((t, i) => ({
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
    { date: d(-2, 1),  description: "Monthly salary",   category: "Salary & Employment", sub_category: "Base",     amount: 5800, original_amount: 5800, original_currency: "USD" },
    { date: d(-1, 1),  description: "Monthly salary",   category: "Salary & Employment", sub_category: "Base",     amount: 5800, original_amount: 5800, original_currency: "USD" },
    { date: d(0, 1),   description: "Monthly salary",   category: "Salary & Employment", sub_category: "Base",     amount: 5800, original_amount: 5800, original_currency: "USD" },
    { date: d(-1, 15), description: "Q4 performance bonus", category: "Salary & Employment", sub_category: "Bonus", amount: 1500, original_amount: 1500, original_currency: "USD" },
    { date: d(-2, 20), description: "VOOG dividends",   category: "Investments",         sub_category: "Dividends", amount: 142.30, original_amount: 142.30, original_currency: "USD" },
    { date: d(-1, 20), description: "VOOG dividends",   category: "Investments",         sub_category: "Dividends", amount: 148.75, original_amount: 148.75, original_currency: "USD" },
  ].map((inc, i) => ({
    id: `inc${String(i + 1).padStart(5, "0")}-0000-0000-0000-000000000000`,
    user_id: userId,
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
      next_due_date: d(0, 3),
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
      next_due_date: d(0, 12),
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
      next_due_date: d(0, 11),
      is_active: true,
      auto_generate: false,
      transaction_type: "expense",
      notes: null,
    },
  ];

  return { cards, transactions, income, recurring };
}

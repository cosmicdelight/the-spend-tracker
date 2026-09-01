import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Get from environment
const DEMO_EMAIL = 'demo@spendtracker.app';
// The demo account is read-only in the database (see the demo_account_read_only
// migration), so e2e cannot use it for anything that writes. This second account is an
// ordinary user with the same seeded data, and it is what the write tests drive.
const E2E_EMAIL = 'e2e@spendtracker.app';
// Must match the DEMO_PASSWORD the demo-login edge function is served with, or
// "Try Demo" fails to authenticate.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'password123';

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Export it from `supabase status -o env`.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Find or create an account, syncing its password either way. On a fresh local stack
 *  neither exists yet, so creating them here is what makes e2e able to sign in. */
async function ensureUser(users, email) {
  const existing = users.find((u) => u.email === email);
  if (existing) {
    console.log(`${email} found, syncing password...`);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
    if (error) throw error;
    return existing.id;
  }
  console.log(`${email} not found, creating it...`);
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return created.user.id;
}

async function seedForUser(userId, label) {
  console.log(`\n--- seeding ${label} ---`);

  // Clear existing data
  console.log('Cleaning up old data...');
  await supabase.from('transactions').delete().eq('user_id', userId);
  await supabase.from('income').delete().eq('user_id', userId);
  await supabase.from('recurring_transactions').delete().eq('user_id', userId);
  await supabase.from('credit_cards').delete().eq('user_id', userId);
  await supabase.from('banks').delete().eq('user_id', userId);
  await supabase.from('budget_categories').delete().eq('user_id', userId);

  // Categories
  console.log('Seeding categories...');
  const cats = ['Groceries', 'Dining', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Travel', 'Utilities']
    .map(name => ({ user_id: userId, name }));
  const { error: catError } = await supabase.from('budget_categories').insert(cats);
  if (catError) throw catError;

  // A bank, then the cards assigned to it.
  //    Several cards with realistic names is deliberate, not decoration: the dashboard
  //    lists a bank's cards on one line, and the length of that line is what used to
  //    push the bank card past the viewport on mobile. A bank with one short-named card
  //    would leave that regression untestable.
  console.log('Seeding bank...');
  const today = new Date().toISOString().split('T')[0];
  const { data: bank, error: bankError } = await supabase.from('banks').insert({
    user_id: userId,
    name: 'UOB',
    spend_target: 500,
    spend_cap: 2000,
    time_period_months: 1,
    start_date: today,
    sort_order: 0,
  }).select().single();
  if (bankError) throw bankError;

  console.log('Seeding credit cards...');
  const { data: cards, error: cardError } = await supabase.from('credit_cards').insert([
    { user_id: userId, name: 'UOB Preferred Visa', bank_id: bank.id, spend_target: 600, start_date: today },
    { user_id: userId, name: "UOB Lady's Solitaire", bank_id: bank.id, spend_target: 800, start_date: today },
    { user_id: userId, name: 'UOB PRVI Miles', bank_id: bank.id, spend_target: 1000, start_date: today },
    { user_id: userId, name: 'UOB Visa Signature', bank_id: bank.id, spend_target: 4000, start_date: today },
  ]).select();
  if (cardError) throw cardError;

  const cc1 = cards[0].id;

  // Transactions
  console.log('Seeding transactions...');
  const { error: txError } = await supabase.from('transactions').insert([
    { user_id: userId, description: 'Whole Foods', category: 'Groceries', amount: 85.50, personal_amount: 85.50, date: today, expense_date: today, payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 85.50, original_currency: 'SGD' , settled_up: false },
    { user_id: userId, description: 'Netflix', category: 'Entertainment', amount: 15.99, personal_amount: 15.99, date: today, expense_date: today, payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 15.99, original_currency: 'SGD' , settled_up: false },
    { user_id: userId, description: 'Uber Trip', category: 'Transport', amount: 25.00, personal_amount: 12.50, date: today, expense_date: today, payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 25.00, original_currency: 'SGD', notes: 'Split with friend' , settled_up: false },
    // Zero share, already settled: you paid, they owed all of it, they paid you back.
    // Covers the settled-up round trip in the edit dialog.
    { user_id: userId, description: 'Group dinner', category: 'Dining', amount: 120, personal_amount: 0, date: today, expense_date: today, payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 120, original_currency: 'SGD', settled_up: true }
  ]);
  if (txError) throw txError;

  // Payment modes. usePaymentModes auto-seeds these from the client when the table
  // reads back empty — which the read-only demo account is no longer allowed to do.
  console.log('Seeding payment modes...');
  await supabase.from('payment_modes').delete().eq('user_id', userId);
  const { error: pmError } = await supabase.from('payment_modes').insert([
    { user_id: userId, value: 'credit_card', label: 'Credit Card', is_system: true },
    { user_id: userId, value: 'cash', label: 'Cash', is_system: false },
    { user_id: userId, value: 'bank_transfer', label: 'Bank Transfer', is_system: false },
    { user_id: userId, value: 'paynow', label: 'PayNow', is_system: false },
    { user_id: userId, value: 'giro', label: 'GIRO', is_system: false },
  ]);
  if (pmError) throw pmError;
}

async function seed() {
  console.log('Seeding local database...');

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const demoId = await ensureUser(users, DEMO_EMAIL);
  const e2eId = await ensureUser(users, E2E_EMAIL);

  // Both get identical data so a test reads the same fixtures whichever it signs in as.
  await seedForUser(demoId, `${DEMO_EMAIL} (read-only)`);
  await seedForUser(e2eId, `${E2E_EMAIL} (writable)`);

  console.log(`\nSeeding complete. Demo: ${DEMO_EMAIL} (read-only) · e2e: ${E2E_EMAIL}`);
}

seed().catch((err) => {
  // Previously this only logged, so a failed seed still exited 0 and CI carried on
  // against an empty database.
  console.error(err);
  process.exit(1);
});

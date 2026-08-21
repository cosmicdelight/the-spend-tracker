
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Get from environment
const DEMO_EMAIL = 'demo@spendtracker.app';
// Must match the DEMO_PASSWORD the demo-login edge function is served with, or
// "Try Demo" fails to authenticate.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'password123';

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Export it from `supabase status -o env`.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seed() {
  console.log('Seeding local database...');

  // 1. Find or create the demo user. On a fresh local stack it never exists yet,
  //    so creating it here is what makes "Try Demo" work in e2e runs.
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  let user = users.find(u => u.email === DEMO_EMAIL);
  if (user) {
    console.log('Demo user found, syncing password...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password: DEMO_PASSWORD });
    if (updateError) throw updateError;
  } else {
    console.log('Demo user not found, creating it...');
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (createError) throw createError;
    user = created.user;
  }
  const userId = user.id;

  // 2. Clear existing data
  console.log('Cleaning up old data...');
  await supabase.from('transactions').delete().eq('user_id', userId);
  await supabase.from('income').delete().eq('user_id', userId);
  await supabase.from('recurring_transactions').delete().eq('user_id', userId);
  await supabase.from('credit_cards').delete().eq('user_id', userId);
  await supabase.from('budget_categories').delete().eq('user_id', userId);

  // 3. Seed Categories
  console.log('Seeding categories...');
  const cats = ['Groceries', 'Dining', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Travel', 'Utilities']
    .map(name => ({ user_id: userId, name }));
  const { error: catError } = await supabase.from('budget_categories').insert(cats);
  if (catError) throw catError;

  // 4. Seed Credit Cards
  console.log('Seeding credit cards...');
  const today = new Date().toISOString().split('T')[0];
  const { data: cards, error: cardError } = await supabase.from('credit_cards').insert([
    { user_id: userId, name: 'Chase Sapphire', spend_target: 4000, start_date: today },
    { user_id: userId, name: 'Amex Gold', spend_target: 3000, start_date: today }
  ]).select();
  if (cardError) throw cardError;

  const cc1 = cards[0].id;

  // 5. Seed Transactions
  console.log('Seeding transactions...');
  const { error: txError } = await supabase.from('transactions').insert([
    { user_id: userId, description: 'Whole Foods', category: 'Groceries', amount: 85.50, personal_amount: 85.50, date: today, payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 85.50, original_currency: 'SGD' },
    { user_id: userId, description: 'Netflix', category: 'Entertainment', amount: 15.99, personal_amount: 15.99, date: today, payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 15.99, original_currency: 'SGD' },
    { user_id: userId, description: 'Uber Trip', category: 'Transport', amount: 25.00, personal_amount: 12.50, date: today, payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 25.00, original_currency: 'SGD', notes: 'Split with friend' }
  ]);
  if (txError) throw txError;

  console.log(`Seeding complete! You can now log in with ${DEMO_EMAIL}`);
}

seed().catch((err) => {
  // Previously this only logged, so a failed seed still exited 0 and CI carried on
  // against an empty database.
  console.error(err);
  process.exit(1);
});

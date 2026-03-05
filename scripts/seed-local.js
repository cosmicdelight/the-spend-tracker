
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Get from environment
const DEMO_EMAIL = 'demo@spendtracker.app';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seed() {
  console.log('Seeding local database...');

  // 1. Get the demo user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const user = users.find(u => u.email === DEMO_EMAIL);
  if (!user) {
    console.error('Demo user not found. Please sign up first.');
    return;
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
  await supabase.from('budget_categories').insert(cats);

  // 4. Seed Credit Cards
  console.log('Seeding credit cards...');
  const { data: cards, error: cardError } = await supabase.from('credit_cards').insert([
    { user_id: userId, name: 'Chase Sapphire', spend_target: 4000, start_date: new Date().toISOString() },
    { user_id: userId, name: 'Amex Gold', spend_target: 3000, start_date: new Date().toISOString() }
  ]).select();
  if (cardError) throw cardError;

  const cc1 = cards[0].id;

  // 5. Seed Transactions
  console.log('Seeding transactions...');
  await supabase.from('transactions').insert([
    { user_id: userId, description: 'Whole Foods', category: 'Groceries', amount: 85.50, personal_amount: 85.50, date: new Date().toISOString().split('T')[0], payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 85.50, original_currency: 'SGD' },
    { user_id: userId, description: 'Netflix', category: 'Entertainment', amount: 15.99, personal_amount: 15.99, date: new Date().toISOString().split('T')[0], payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 15.99, original_currency: 'SGD' },
    { user_id: userId, description: 'Uber Trip', category: 'Transport', amount: 25.00, personal_amount: 12.50, date: new Date().toISOString().split('T')[0], payment_mode: 'credit_card', credit_card_id: cc1, original_amount: 25.00, original_currency: 'SGD', notes: 'Split with friend' }
  ]);

  console.log('Seeding complete! You can now log in with demo@spendtracker.app / password123');
}

seed().catch(console.error);

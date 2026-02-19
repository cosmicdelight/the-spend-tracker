ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'expense';
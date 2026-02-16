
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  personal_amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  sub_category TEXT,
  payment_mode TEXT NOT NULL DEFAULT 'credit_card',
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  description TEXT,
  notes TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- 'weekly' or 'monthly'
  day_of_week INTEGER, -- 0-6 for weekly (0=Sunday)
  day_of_month INTEGER, -- 1-31 for monthly
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_generate BOOLEAN NOT NULL DEFAULT false,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  next_due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring transactions"
  ON public.recurring_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

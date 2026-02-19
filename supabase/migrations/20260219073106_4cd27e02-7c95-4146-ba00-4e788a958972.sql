
CREATE TABLE public.income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  original_amount numeric NOT NULL DEFAULT 0,
  original_currency text NOT NULL DEFAULT 'SGD',
  date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT '',
  description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own income"
  ON public.income
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

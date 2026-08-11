-- Banks: group credit cards so spend can be tracked per bank as well as per card.
CREATE TABLE IF NOT EXISTS public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  spend_target numeric NOT NULL DEFAULT 0,
  spend_cap numeric,
  time_period_months integer NOT NULL DEFAULT 1,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own banks" ON public.banks;
CREATE POLICY "Users manage own banks"
  ON public.banks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_banks_updated_at ON public.banks;
CREATE TRIGGER update_banks_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Deleting a bank unassigns its cards rather than deleting them.
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS bank_id uuid REFERENCES public.banks(id) ON DELETE SET NULL;

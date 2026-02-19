-- Add sub_category column to income table
ALTER TABLE public.income ADD COLUMN category text NOT NULL DEFAULT '';
ALTER TABLE public.income ADD COLUMN sub_category text;

-- Migrate existing source values to category and drop source
UPDATE public.income SET category = source WHERE category = '';
ALTER TABLE public.income DROP COLUMN source;

-- Create income_categories table (mirrors budget_categories)
CREATE TABLE public.income_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sub_category_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own income categories"
  ON public.income_categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

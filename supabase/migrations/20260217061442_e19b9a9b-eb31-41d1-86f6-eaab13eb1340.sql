
ALTER TABLE public.credit_cards ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial sort_order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
  FROM public.credit_cards
)
UPDATE public.credit_cards SET sort_order = ordered.rn
FROM ordered WHERE credit_cards.id = ordered.id;

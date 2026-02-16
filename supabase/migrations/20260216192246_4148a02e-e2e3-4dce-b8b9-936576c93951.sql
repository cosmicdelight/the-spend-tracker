
CREATE TABLE public.payment_modes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, value)
);

ALTER TABLE public.payment_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payment modes"
  ON public.payment_modes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

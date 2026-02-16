
ALTER TABLE public.transactions
ADD COLUMN original_currency text NOT NULL DEFAULT 'SGD',
ADD COLUMN original_amount numeric NOT NULL DEFAULT 0;

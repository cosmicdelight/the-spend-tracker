ALTER TABLE public.transactions ADD COLUMN expense_date date;
UPDATE public.transactions SET expense_date = date WHERE expense_date IS NULL;
ALTER TABLE public.transactions ALTER COLUMN expense_date SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN expense_date SET DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_transactions_user_expense_date ON public.transactions (user_id, expense_date);
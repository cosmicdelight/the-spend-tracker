
-- Restrict RLS policies to authenticated role on sensitive tables
DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions" ON public.transactions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own income" ON public.income;
CREATE POLICY "Users manage own income" ON public.income
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users manage own recurring transactions" ON public.recurring_transactions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own budget categories" ON public.budget_categories;
CREATE POLICY "Users manage own budget categories" ON public.budget_categories
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own credit cards" ON public.credit_cards;
CREATE POLICY "Users manage own credit cards" ON public.credit_cards
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own income categories" ON public.income_categories;
CREATE POLICY "Users manage own income categories" ON public.income_categories
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own payment modes" ON public.payment_modes;
CREATE POLICY "Users manage own payment modes" ON public.payment_modes
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add explicit UPDATE policy for transaction-attachments storage bucket
CREATE POLICY "Users can update own attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

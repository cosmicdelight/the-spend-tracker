-- Make the shared demo account genuinely read-only.
--
-- The banner claimed "data is read-only" long before anything enforced it. The demo
-- user is an ordinary authenticated user, every table policy is
-- FOR ALL USING (auth.uid() = user_id), and the demo session token reaches PostgREST
-- directly — so any visitor could add, edit, or delete rows in the one account every
-- other visitor sees. Enforcement belongs here rather than in the client, because a
-- client-side guard cannot bind a raw API call made with that token.
--
-- SELECT is deliberately left alone: the demo has to stay readable to be a demo.
--
-- Re-runnable: every statement drops before it creates.

-- Identified by the same email the app uses (src/lib/seedDemoData.ts), rather than a
-- hardcoded uid, because the demo user has a different id in local, CI, and production.
-- STABLE so the planner folds it to a single evaluation per query instead of per row.
create or replace function public.is_demo_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = 'demo@spendtracker.app'
  );
$$;

comment on function public.is_demo_user() is
  'True when the current session is the shared demo account. Backs the RESTRICTIVE write policies below.';

revoke all on function public.is_demo_user() from public;
grant execute on function public.is_demo_user() to anon, authenticated, service_role;

-- RESTRICTIVE policies are AND-ed with the existing permissive ones, so these subtract
-- write access without touching the "users manage own rows" policies. Scoped TO
-- authenticated, which leaves service_role alone — the seed-demo-account edge function
-- provisions the demo with the service key and must keep working.
do $$
declare
  t text;
begin
  foreach t in array array[
    'banks', 'budget_categories', 'credit_cards', 'income', 'income_categories',
    'payment_modes', 'recurring_transactions', 'transaction_attachments', 'transactions'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'Demo account cannot insert', t);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated '
      'with check (not public.is_demo_user())',
      'Demo account cannot insert', t);

    execute format('drop policy if exists %I on public.%I', 'Demo account cannot update', t);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated '
      'using (not public.is_demo_user()) with check (not public.is_demo_user())',
      'Demo account cannot update', t);

    execute format('drop policy if exists %I on public.%I', 'Demo account cannot delete', t);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated '
      'using (not public.is_demo_user())',
      'Demo account cannot delete', t);
  end loop;
end
$$;

-- Storage gets the same treatment: without it the demo could still upload receipts into
-- the shared bucket. Not scoped to a single bucket on purpose, so a bucket added later
-- is covered by default rather than silently unprotected.
drop policy if exists "Demo account cannot upload files" on storage.objects;
create policy "Demo account cannot upload files"
  on storage.objects as restrictive for insert to authenticated
  with check (not public.is_demo_user());

drop policy if exists "Demo account cannot update files" on storage.objects;
create policy "Demo account cannot update files"
  on storage.objects as restrictive for update to authenticated
  using (not public.is_demo_user())
  with check (not public.is_demo_user());

drop policy if exists "Demo account cannot delete files" on storage.objects;
create policy "Demo account cannot delete files"
  on storage.objects as restrictive for delete to authenticated
  using (not public.is_demo_user());

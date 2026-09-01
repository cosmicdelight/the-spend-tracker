-- Proves the demo read-only policies actually hold, against a real database.
--
-- Unit tests cannot cover any of this: the policies are enforced by Postgres, not by
-- application code, so the only way to know they work is to impersonate a session and
-- watch the write get refused.
--
-- Run against a stack that has had scripts/seed-local.js applied:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f scripts/verify-demo-readonly.sql

\set ON_ERROR_STOP on

do $$
declare
  demo_id     uuid;
  other_id    uuid := gen_random_uuid();
  demo_blocked  boolean := false;
  other_wrote   boolean := false;
  readable    integer;
  unprotected integer;
begin
  select id into demo_id from auth.users where lower(email) = 'demo@spendtracker.app';
  if demo_id is null then
    raise exception 'demo user not found — run scripts/seed-local.js first';
  end if;

  -- 1. Every table in public must carry the write blocks. Counting policies would pass
  --    while a newly added table sat unprotected, so this asks the opposite question:
  --    which tables are missing one?
  select count(*) into unprotected
  from pg_tables t
  where t.schemaname = 'public'
    and not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.tablename
        and p.policyname = 'Demo account cannot insert'
    );
  if unprotected > 0 then
    raise exception
      '% table(s) in public have no demo write block — add them to the migration',
      unprotected;
  end if;

  -- 2. The demo account must be refused a write.
  perform set_config('request.jwt.claims',
    json_build_object('sub', demo_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.payment_modes (user_id, value, label, is_system)
    values (demo_id, 'rls_probe_demo', 'RLS probe', false);
  exception when insufficient_privilege then
    demo_blocked := true;
  end;

  -- 3. ...while still being able to read, or it stops being a demo.
  select count(*) into readable from public.transactions;

  reset role;

  -- 4. A normal account must be entirely unaffected. This is the assertion that
  --    matters most: a policy that returned NULL instead of false here would lock
  --    every real user out of their own data, and would otherwise look like success.
  perform set_config('request.jwt.claims',
    json_build_object('sub', other_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.payment_modes (user_id, value, label, is_system)
    values (other_id, 'rls_probe_other', 'RLS probe', false);
    other_wrote := true;
  exception when insufficient_privilege then
    other_wrote := false;
  end;

  reset role;

  delete from public.payment_modes where value in ('rls_probe_demo', 'rls_probe_other');

  if not demo_blocked then
    raise exception 'demo account was allowed to INSERT — the read-only policy is not in effect';
  end if;
  if readable = 0 then
    raise exception 'demo account cannot read its own transactions — the policy over-reached';
  end if;
  if not other_wrote then
    raise exception 'a non-demo account was blocked from writing — the policy over-reached';
  end if;

  raise notice 'demo read-only verified: writes refused, % transactions still readable, normal accounts unaffected', readable;
end
$$;

# Fix the banks build errors (missing GRANTs on public.banks)

## Correction to my first read

I initially said the banks migration had never been applied. That was wrong, and I'm flagging it because it changes the fix. My first check used `information_schema.tables`, which only lists tables the querying role has privileges on — so an ungranted table looks identical to a table that doesn't exist.

Checking `pg_class` directly instead:

- `public.banks` **exists**.
- `public.credit_cards.bank_id` **exists**.

So the migration `20260804140000_add_banks.sql` did run. The schema is there.

## What's actually wrong

`public.banks` has **zero** table privileges. Querying `information_schema.role_table_grants` for it returns an empty set — no `authenticated`, no `service_role`, no `anon`.

The migration creates the table, enables RLS, and adds the "Users manage own banks" policy, but it never issues any `GRANT`. On Supabase, RLS alone is not enough: the Data API does not grant default privileges on the `public` schema, so an ungranted table is invisible to the API layer.

That single omission produces every symptom:

- The table isn't exposed through the Data API, so the generated `src/integrations/supabase/types.ts` contains no `banks` entry and no `bank_id` column.
- `from("banks")` → `Argument of type '"banks"' is not assignable to parameter of type 'never'`, because `banks` isn't in the union of known table names.
- `Property 'sort_order' does not exist on type 'SelectQueryError<...>'` — a knock-on effect; TypeScript falls back to error types and guesses against other tables.
- `useCreditCards.ts(26,14)`: `Property 'bank_id' is missing` — the `CreditCard` interface declares `bank_id`, but the generated row type has no such column.

It also explains the four "Build unsuccessful" GitHub commits while my in-Lovable edits passed: the production build runs `tsc`, which reads the generated types; my preview edits only ran the dev server, which doesn't typecheck. Your local runs pass because a local Supabase stack applies the migration files from disk and generates types from that database, where the missing grants don't gate type generation the same way.

## The fix

1. Run a migration that adds the grants the original migration omitted:

   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
   GRANT ALL ON public.banks TO service_role;
   ```

   No `anon` grant — the only policy on the table scopes to `auth.uid() = user_id`.

   Nothing else changes: the table, RLS, policy, trigger, and `credit_cards.bank_id` are all already in place.

2. Let `src/integrations/supabase/types.ts` regenerate once `banks` is reachable through the Data API.

3. Verify: typecheck should reach zero errors and the test suite should stay green.

## Notes

- No application code needs editing. `useBanks.ts` and `useCreditCards.ts` are correct as written.
- No data is touched — this is a privilege grant only.
- Worth noting for later: without this, bank queries would also have failed at runtime with a permission error, not just at build time.
- Root cause worth remembering: migration SQL authored outside the platform skipped the mandatory GRANT block for a new `public` table. Any future table added the same way needs those grants in the same migration.

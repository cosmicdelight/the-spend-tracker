# Fix the banks build errors (apply the missing migration)

## What's actually wrong

The code for bank-level spend tracking is in the repo, but the database it depends on was never changed.

Verified just now:

- `supabase/migrations/20260804140000_add_banks.sql` exists in the repo. It creates `public.banks` and adds `credit_cards.bank_id`.
- Querying the live database: `banks` **does not exist**, and `credit_cards.bank_id` **does not exist**. Only `credit_cards` is there.
- `src/integrations/supabase/types.ts` contains **no** reference to `banks` or `bank_id`. That file is generated from the live database, so it matches the database, not the repo.

Every reported error follows from that single gap:

- `from("banks")` → `Argument of type '"banks"' is not assignable to parameter of type 'never'` — there is no `banks` table in the generated types, so the set of valid table names doesn't include it.
- `Property 'sort_order' does not exist on type 'SelectQueryError<...>'` — a downstream effect of the same failure; TypeScript falls back to error types and guesses at other tables.
- `useCreditCards.ts(26,14)`: `Property 'bank_id' is missing` — the `CreditCard` interface declares `bank_id`, but the generated row type has no such column.

This also explains the four "Build unsuccessful" GitHub commits. Migration files pushed through GitHub sync are not executed against Lovable Cloud; they only run when applied through the platform's migration path. So the pushed SQL sat unapplied, types stayed stale, and `tsc` failed in the production build. Your machine passes because your local Supabase (`supabase start` in CI, or a local stack) runs the migration files from disk and generates types that do include `banks`.

## The fix

1. Apply the banks migration to the cloud database through the platform migration path, using the same SQL that's already in `20260804140000_add_banks.sql`, plus the `GRANT` statements it is missing:
   - `CREATE TABLE public.banks` with the existing columns.
   - `GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;` and `GRANT ALL ON public.banks TO service_role;` (no `anon` grant — the policy is `auth.uid() = user_id`).
   - Enable RLS and recreate the "Users manage own banks" policy.
   - `updated_at` trigger.
   - `ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS bank_id uuid REFERENCES public.banks(id) ON DELETE SET NULL;`

   The SQL is already written to be re-runnable (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`), so applying it is safe even though the file is in the repo.

2. Let the generated `src/integrations/supabase/types.ts` refresh from the updated database. Once `banks` and `bank_id` are present there, all eight errors resolve with no change to `useBanks.ts` or `useCreditCards.ts`.

3. Verify with a typecheck and the test suite.

## Notes

- No application code needs editing. The hooks are correct; they were written against a schema that hadn't landed.
- No data is at risk: this only adds a table and a nullable column.
- Going forward, schema changes need to be applied through the platform rather than only committed as migration files via GitHub, or the same stale-types build failure will recur.

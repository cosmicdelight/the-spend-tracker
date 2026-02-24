# Implementation Plan: Code Quality Improvements

Prioritised incremental changes for [the-spend-tracker](https://github.com/cosmicdelight/the-spend-tracker).

---

## Phase 1: Quick wins (low risk, high signal)
**Effort: ~30 min | Risk: Low**

| # | Change | Rationale |
|---|--------|-----------|
| 1.1 | Remove duplicate toaster (keep Radix `Toaster`, remove Sonner) | All toast calls use `useToast`; Sonner is unused |
| 1.2 | Fix package name in `package.json` | `vite_react_shadcn_ts` → `the-spend-tracker` |
| 1.3 | Re-enable ESLint `@typescript-eslint/no-unused-vars` | Set to `warn`, fix any issues |
| 1.4 | Fix `user!` non-null assertion in `useAddTransaction` | Add guard; throw clear error or return early if no user |

---

## Phase 2: Type safety
**Effort: ~1–2 hrs | Risk: Low**

| # | Change | Rationale |
|---|--------|-----------|
| 2.1 | Replace `any` in error handlers | Use `unknown` and type guard, or `Error` |
| 2.2 | Fix `useAuth` return type | Use `AuthError | null` from `@supabase/supabase-js` |
| 2.3 | Add types for Recharts tooltip props | Use Recharts types or explicit interfaces |

---

## Phase 3: Error handling & guards
**Effort: ~30 min | Risk: Low**

| # | Change | Rationale |
|---|--------|-----------|
| 3.1 | Add user check in mutation hooks that use `user!.id` | Fail safely before Supabase call |
| 3.2 | Centralise error message extraction | Helper: `(err: unknown) => err instanceof Error ? err.message : 'Unknown error'` |

---

## Phase 4: UX – loading states
**Effort: ~45 min | Risk: Low**

| # | Change | Rationale |
|---|--------|-----------|
| 4.1 | Replace "Loading..." with skeleton components | Use shadcn Skeleton for dashboard cards, lists |

---

## Phase 5: Component refactors
**Effort: ~2–3 hrs | Risk: Medium**

| # | Change | Rationale |
|---|--------|-----------|
| 5.1 | Extract `useDashboardStats` from Index | Move monthly totals/filtering logic into hook |
| 5.2 | Split Index tab content into subcomponents | `DashboardTab`, `TransactionsTab`, `IncomeTab`, `BudgetTab` |
| 5.3 | Refactor AddTransactionDialog | Extract expense/income sections or split into two dialogs |

---

## Phase 6: Testing
**Effort: ~2 hrs | Risk: Low**

| # | Change | Rationale |
|---|--------|-----------|
| 6.1 | Unit tests for `parseCSVLines`, `parseExpenseCSV` | ImportTransactionsDialog logic is critical |
| 6.2 | Unit tests for `useDescriptionSuggestions` | Core UX logic |
| 6.3 | Test Zod validation schemas (if extracted) | Form validation coverage |

---

## Phase 7: Optional / later
**Effort: varies | Risk: Low**

| # | Change | Rationale |
|---|--------|-----------|
| 7.1 | Restrict CORS in demo-login Edge Function | Production hardening |
| 7.2 | Add integration tests | E2E for critical flows |


## New User Onboarding: Demo Account + In-App Tour (with CSV Import Step)

### Status: COMPLETE ✅

### What was built

**Part 1 — Demo Account**
- `src/pages/Auth.tsx` — "Try Demo" button (using `DEMO_EMAIL`/`DEMO_PASSWORD` from seedDemoData.ts). Sets `localStorage["onboarding-tour-seen"]` so demo users skip the tour.
- `src/components/DemoBanner.tsx` — Dismissible amber banner shown when `user.email === DEMO_EMAIL`.
- `src/lib/seedDemoData.ts` — Exports `DEMO_EMAIL = "demo@spendtracker.app"` and `DEMO_PASSWORD = "DemoPass123!"`.
- `supabase/functions/seed-demo-account/index.ts` — Edge function for re-seeding. Protected by service role key.
- Demo user seeded directly in DB: `demo@spendtracker.app` / `DemoPass123!` with 38 transactions, 6 income entries, 3 recurring, 2 credit cards, categories.

**Part 2 — In-App Onboarding Tour**
- `src/components/OnboardingTour.tsx` — 6-step spotlight tour with spotlight cutout, tooltip positioning, tab navigation via `onSetTab` prop, `localStorage["onboarding-tour-seen"]` persistence.

**Tour steps:**
1. `dashboard-tab` — Dashboard overview
2. `quick-add-button` — Log expense
3. `import-csv-button` — Import CSV
4. `expenses-tab` — Expenses tab
5. `income-tab` — Income tab
6. `stats-tab` — Stats tab

- `src/pages/Index.tsx` — Added `data-tour` attributes, renders `<DemoBanner>` for demo users, renders `<OnboardingTour>` for real users only.

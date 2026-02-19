
## New User Onboarding: Demo Account + In-App Tour (with CSV Import Step)

### Context

None of the onboarding files exist yet — this is a full build from scratch. The user's addition is to include a dedicated tour step for the **Import CSV** workflow, which lives in `ImportTransactionsDialog` on the Dashboard tab.

---

### What will be built

**Part 1 — Demo Account**

A shared demo user is pre-loaded with realistic data. Anyone can click "Try Demo" on the sign-in screen to explore the app without signing up.

- `src/pages/Auth.tsx` — Add a "Try Demo" button (below the sign-in form) that calls `signIn(DEMO_EMAIL, DEMO_PASSWORD)`.
- `src/components/DemoBanner.tsx` — A dismissible amber banner shown at the top of the main content area when the demo user is active: *"You're in demo mode — sign up to save your own data."* with a "Sign Up" link.
- `src/pages/Index.tsx` — Render `<DemoBanner>` when `user.email === DEMO_EMAIL`. Demo users skip the onboarding tour.
- `src/lib/seedDemoData.ts` — Exports `DEMO_EMAIL` constant and a `seedDemoData(userId, supabaseAdmin)` function with all mock rows (~40 transactions, 6 income entries, 3 recurring, 2 credit cards).
- `supabase/functions/seed-demo-account/index.ts` — Edge function that creates the demo user via the admin API and calls the seed logic. Called once at setup via `curl`. Uses the service role key (automatically available in edge functions).
- **Secrets needed**: `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD` (Vite env vars used by Auth.tsx for the auto-login button).

**Part 2 — In-App Onboarding Tour**

A custom, lightweight spotlight tour. Triggers only for real new users (not demo users) on their first visit. Stored in `localStorage["onboarding-tour-seen"]`.

- `src/components/OnboardingTour.tsx` — Self-contained component that:
  - Reads/writes `localStorage`.
  - Uses `data-tour` attribute values to anchor each step tooltip via `document.querySelector('[data-tour="..."]').getBoundingClientRect()`.
  - Renders a fixed full-screen backdrop with a cut-out spotlight (`box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)`) over the target element's rect.
  - Shows a floating tooltip card near the target with step text, a "Next →" button, and a "Skip tour" link.
  - Has a "Finish" button on the last step.
  - Navigates the tab state (via a callback prop `onSetTab`) where needed so the targeted element is visible before positioning.

**Tour steps (6 total, including the new CSV Import step):**

| # | Target `data-tour` | Tab shown | Message |
|---|---|---|---|
| 1 | `dashboard-tab` | Dashboard | "Welcome! Your Dashboard shows this month's spending summary and credit card progress at a glance." |
| 2 | `quick-add-button` | Dashboard | "Tap here to log a new expense in seconds. Fill in the amount, category, and date." |
| 3 | `import-csv-button` | Dashboard | "Already have transaction history? Import it in bulk using a CSV file — supports both expenses and income." |
| 4 | `expenses-tab` | Expenses | "The Expenses tab shows all your transactions. You can filter, edit, and manage them here." |
| 5 | `income-tab` | Income | "Track your income here — salary, freelance, investments, and more." |
| 6 | `stats-tab` | Stats | "The Stats tab shows budget breakdowns, income vs spending trends, and net savings over time." |

Steps 3 (import button) and 2 (quick-add) are both on the Dashboard tab so no tab navigation is needed between them. Steps 4–6 each trigger a tab switch so the target element becomes visible.

**`data-tour` attributes added to `src/pages/Index.tsx`:**

| Element | Attribute |
|---|---|
| Dashboard nav button | `data-tour="dashboard-tab"` |
| Expenses nav button | `data-tour="expenses-tab"` |
| Income nav button | `data-tour="income-tab"` |
| Stats nav button | `data-tour="stats-tab"` |
| `<AddTransactionDialog dashboardTrigger>` wrapper div | `data-tour="quick-add-button"` |
| `<ImportTransactionsDialog />` wrapper div | `data-tour="import-csv-button"` |

---

### Files to create / modify

| File | Action |
|---|---|
| `src/lib/seedDemoData.ts` | Create — mock data rows + `DEMO_EMAIL` constant |
| `supabase/functions/seed-demo-account/index.ts` | Create — edge function to create demo user and seed data |
| `src/components/DemoBanner.tsx` | Create — dismissible banner for demo mode |
| `src/components/OnboardingTour.tsx` | Create — 6-step spotlight tour component |
| `src/pages/Auth.tsx` | Modify — add "Try Demo" button |
| `src/pages/Index.tsx` | Modify — add `data-tour` attributes, render `<DemoBanner>` and `<OnboardingTour>` |

No database schema changes. No new hooks. No new npm packages.

---

### Technical notes

**Spotlight positioning** (pure CSS, no library):

```text
<div fixed inset-0 z-[100] pointer-events-none>
  <div
    style={{ position: "fixed", top, left, width, height,
             boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
  />                                     ↑ creates the dim backdrop with a rect cutout
</div>
<div fixed z-[101]  ← tooltip card, positioned near the spotlight rect
  pointer-events-auto
/>
```

**Tab navigation during tour**: `OnboardingTour` receives `onSetTab` as a prop from `Index.tsx`. Before rendering each step, the component calls `onSetTab("dashboard" | "transactions" | "income" | "budget")` so the correct tab panel is shown and `getBoundingClientRect()` returns a non-zero rect.

**Demo user detection**: `DEMO_EMAIL` is exported from `src/lib/seedDemoData.ts` and compared against `user?.email` in `Index.tsx`. Demo users see the banner but the tour is suppressed (localStorage key is pre-set to `"true"` when a demo user signs in).

**Edge function setup**: After deployment, the seed function can be invoked once via curl with the service role key to create and populate the demo account. Instructions will be provided as a comment in the edge function file.

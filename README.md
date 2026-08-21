# SpendTracker

A budget and finance tracker that separates your **actual spending** from **credit card spending** so you can stay on track toward your monthly minimum spend goals — and know what counts as your own expenditure vs. split expenses (e.g., when you pay for the table and friends pay you back).

[Live demo](https://the-spend-tracker.netlify.app/) · [GitHub](https://github.com/cosmicdelight/the-spend-tracker)

---

## What it does

- **Track actual + credit card spending** — Add both in a single expense dialog: the full amount on your card and your personal share (e.g., when you split with others)
- **Monitor minimum spend** — See if you're on track to hit your credit card minimum for the month
- **Handle split expenses** — Separate personal amount from total (e.g., group dinners, shared trips)
- **Income tracking** — Log salary, bonuses, dividends
- **Recurring transactions** — Auto-generate monthly subscriptions and bills
- **CSV import** — Bulk import transactions from bank exports
- **Duplicate transaction** — Copy an existing expense from the Edit dialog (uses today's date)
- **Auto-populate category** — Enter a description first; if Category is empty, it fills from past matching transactions on blur
- **Try Demo** — Instant access to a pre-seeded demo account
- **PWA** — Install as an app on your device

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI, Recharts |
| Forms | React Hook Form, Zod |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Tools | TanStack Query, date-fns, Lucide icons |
| Built with | [Lovable](https://lovable.dev/) (AI-powered app builder) |

---

## Live demo

**[the-spend-tracker.netlify.app](https://the-spend-tracker.netlify.app/)**

The old Lovable origin (`the-spend-tracker.lovable.app`) is being retired — see [Deployment](#deployment).

Use **Try Demo** on the login screen to explore without signing up.

---

## Getting started

1. **Clone the repo**
   ```sh
   git clone https://github.com/cosmicdelight/the-spend-tracker.git
   cd the-spend-tracker
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase project URL, anon key, and demo password (see `.env.example` for details)
   - For Edge Functions (`demo-login`, `seed-demo-account`), set `DEMO_PASSWORD` in Supabase secrets

3. **Install and run**
   ```sh
   npm install
   npm run dev
   ```

4. **(Optional) Seed the demo account**
   - Call the `seed-demo-account` Edge Function with your service role key to create the demo user and sample data

---

## Deployment

Hosted on **Netlify**, built from this repo. Publishing no longer goes through Lovable.

- Config lives in [`netlify.toml`](netlify.toml): `npm run build` → `dist`, Node 20, and the SPA
  fallback (`/*` → `/index.html`, status 200) that client-side routes such as `/cards` and
  `/install` need in order to survive a hard refresh.
- `public/_headers` is already in Netlify's format and is applied as-is — `index.html` and
  `sw.js` revalidate, `/assets/*` is cached immutably.
- `BUILD_ID=$COMMIT_REF` is passed to the build so `public/version.json` keys the update
  prompt off the commit rather than a timestamp.

**Required site environment variables** (Site settings → Environment variables):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your Supabase anon key |

Set both explicitly. `vite.config.ts` carries hardcoded fallbacks so a build will succeed
without them, which means a missing variable fails silently rather than loudly.

**Deploy trigger.** Choose deliberately — the Lovable GitHub sync still has write access to
`main`, so auto-deploying from `main` would let Lovable ship to production on its own. Deploying
from a `production` branch that you merge into keeps release control on your side.

**Supabase auth.** Any new origin must be added under Auth → URL Configuration before signup
confirmation or password reset will work there. Signup sends the bare origin; password reset
sends `<origin>/reset-password` — these are two separate entries in the Redirect URLs list.

---

## Project structure

- `src/pages/` — Auth, dashboard (Index), Categories, Cards, Income categories
- `src/components/` — Transaction list, charts, dialogs, CSV import, onboarding tour
- `src/hooks/` — Auth, transactions, income, budget categories, credit cards
- `supabase/functions/` — `demo-login`, `seed-demo-account`, `process-recurring-transactions`

---

## App updates and caching

- SpendTracker uses a service worker when `VITE_ENABLE_PWA=true`.
- When a new deployment is available, the service worker updates automatically and reloads the app (`registerType: "autoUpdate"`), so users always get the latest version without manual action.
- The app also checks `version.json` periodically as a host-agnostic fallback, showing an update prompt if host cache headers are not fully configurable.
- Static hashed assets are cached long-term, while `index.html` and the service worker are configured for revalidation via `public/_headers` on hosts that support it.

### Release checklist

- Deploy and load the currently installed app on a device/browser where the PWA was already used.
- Publish a second change and verify that the in-app "Update available" prompt appears.
- Tap refresh and confirm the latest build label is shown on `/install`.

### Fallback guidance

- If a user reports stale content after deployment, ask them to open `/install` and compare the build label.
- If labels do not match after tapping refresh, use one-time site data clear as a recovery step.

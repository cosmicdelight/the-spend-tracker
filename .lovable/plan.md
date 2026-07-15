## Goal
Extend credit card tracking to support an optional **maximum spend cap** (bonus cap) alongside the existing minimum spend target. Each card can have either, both, or just one.

## Database
Add one nullable column to `credit_cards`:
- `spend_cap numeric NULL` — when set, the card has an upper bonus cap for the same rolling period as `spend_target`.

`spend_target` stays as-is (still non-null, still allowed to be 0 for cap-only cards).

## Types & hooks
- `CreditCard` interface gets `spend_cap: number | null`.
- `useAddCreditCard` / `useUpdateCreditCard` accept `spend_cap`.

## Add/Edit dialogs (`AddCreditCardDialog`, `EditCreditCardDialog`)
- Add a new optional field **"Maximum Spend Cap ($)"** (leave blank = no cap).
- Relabel min field to make optionality clear (e.g. "Minimum Spend Target ($) — optional").
- On submit, send `null` when the cap input is blank; otherwise a positive number. Basic validation: if both set, cap ≥ target.

## Progress UI (`CreditCardProgress` on dashboard + card row on `Cards` page)
Behavior driven by which of `spend_target` / `spend_cap` are set:

1. **Min only** (today's behavior): unchanged.
2. **Cap only**: 
   - Denominator is the cap. Bar shows charged / cap.
   - Under cap → default color, subtitle shows remaining headroom (`$X under cap`).
   - Over cap → bar fills to 100% in **destructive** color, subtitle shows `$Y over cap` in destructive text, warning icon next to card name.
3. **Both min + cap**:
   - Bar denominator = cap. Progress fill uses:
     - warning color while below min (behind pace still applies against min),
     - success/primary color between min and cap,
     - destructive once over cap.
   - Render a **target marker** (small vertical tick) on the bar at `min/cap` position so both thresholds are visible.
   - Footer line shows both: `Min $target · Cap $cap` and status text (`On pace` / `Behind` / `Over cap by $Y`).

Over-cap treatment everywhere:
- Progress bar in destructive color, capped visually at 100%.
- Explicit "Over cap by $Y" label in destructive text.
- Small `AlertTriangle` icon in the card header.

`daysLeft` / on-pace math continues to key off `spend_target` when present; when there is no min, pace indicator is hidden (same as current `target <= 0` branch).

## Progress component detail
`Progress` from shadcn only supports a single value. For the "both" case, wrap it in a relative container and absolutely-position a 2px tick at `left: (target/cap)*100%` to mark the min threshold. Fill color is applied via a variant/className on `Progress` (extend `progress.tsx` minimally to accept an `indicatorClassName` if it doesn't already, or wrap it).

## Files to touch
- `supabase` migration: add `spend_cap` column.
- `src/hooks/useCreditCards.ts` — type + mutations.
- `src/components/AddCreditCardDialog.tsx`, `src/components/EditCreditCardDialog.tsx` — new field + validation.
- `src/components/CreditCardProgress.tsx` — new render logic.
- `src/pages/Cards.tsx` — mirror the same progress rendering (shares logic; extract a small helper if it stays clean).
- `src/components/ui/progress.tsx` — allow `indicatorClassName` prop if needed.

## Out of scope
- No changes to transactions, recurring transactions, or period math in `creditCardPeriod.ts`.
- No notifications/alerts when nearing/exceeding the cap (visual only).

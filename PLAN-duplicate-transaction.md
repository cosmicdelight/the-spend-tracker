# Feature Implementation Plan: Duplicate Transaction

**Overall Progress:** `100%`

## TLDR

Add a "Duplicate" action so users can quickly create a copy of an existing transaction (e.g. recurring grocery run, similar expense). The duplicate uses today's date and all other fields from the source. Implemented in the Edit Transaction dialog.

## Critical Decisions

- **Placement: Edit dialog** — Duplicate lives in `EditTransactionDialog` next to Delete/Save. User flow: click transaction → Edit opens → Duplicate creates a copy. No new UI surfaces.
- **Date handling: duplicate uses today** — The new transaction gets today's date so it appears in the current month. Matches the common case of logging a similar expense for today.
- **No new hook** — Reuse `useAddTransaction`; build the insert payload from the source transaction by omitting `id`/`created_at` and overriding `date`.

## Tasks

- [x] 🟩 **Step 1: Add Duplicate button in EditTransactionDialog**
  - [x] 🟩 Import `Copy` (or `CopyPlus`) icon from lucide-react
  - [x] 🟩 Add "Duplicate" button in the action row (between Delete and Save)
  - [x] 🟩 Style as outline/secondary to distinguish from primary Save

- [x] 🟩 **Step 2: Implement duplicate handler**
  - [x] 🟩 Use existing `useAddTransaction` hook
  - [x] 🟩 Build payload: copy all fields from `transaction` except `id` and `created_at`
  - [x] 🟩 Override `date` to `new Date().toISOString().split("T")[0]`
  - [x] 🟩 Call `addTx.mutate()` with payload
  - [x] 🟩 On success: toast "Transaction duplicated", close dialog
  - [x] 🟩 On error: toast with error message
  - [x] 🟩 Prevent double-submit: disable button while `addTx.isPending`

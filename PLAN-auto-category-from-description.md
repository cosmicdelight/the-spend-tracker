# Feature Implementation Plan: Auto-populate Category from Description

**Overall Progress:** `100%`

## TLDR

When the user enters a description in the Add Transaction dialog but leaves Category empty, auto-fill Category (and Sub-category if applicable) based on past transactions that match the description. Uses the most recent matching transaction's category as the "best choice."

## Critical Decisions

- **Trigger: on blur** — Auto-populate when the user leaves the Description field (onBlur). Avoids noisy updates on every keystroke.
- **Only when category is empty** — Do not override if the user has already selected a category.
- **Scope: expense only** — Feature applies to the expense form. Income has a different flow and is out of scope.
- **Matching: exact + contains** — Match transactions where (a) description equals input (case-insensitive), or (b) input is contained in description or vice versa. Pick the most recent match.

## Tasks

- [x] 🟩 **Step 1: Add `useCategoryFromDescription` hook**
  - [x] 🟩 In `useTransactions.ts`, add hook that returns `(description: string) => { category: string; sub_category: string | null } | null`
  - [x] 🟩 Use `useTransactions()` data; useCallback for the lookup function
  - [x] 🟩 Match logic: for given input, find tx where `tx.description` matches: exact (case-insensitive), or input contained in desc, or desc contained in input
  - [x] 🟩 Return category + sub_category from the most recent matching transaction (transactions already ordered by date desc)
  - [x] 🟩 Return `null` if no match or input is empty/whitespace

- [x] 🟩 **Step 2: Add onBlur to DescriptionAutocomplete**
  - [x] 🟩 Add optional `onBlur?: () => void` prop; forward to the Input's `onBlur`

- [x] 🟩 **Step 3: Wire auto-populate in AddTransactionDialog**
  - [x] 🟩 Call `useCategoryFromDescription()`
  - [x] 🟩 Pass `onBlur` to DescriptionAutocomplete: on blur, if `!category` and `description.trim()` and match exists, call `setCategory` and `setSubCategory`

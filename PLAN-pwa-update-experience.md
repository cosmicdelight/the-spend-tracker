# Feature Implementation Plan

**Overall Progress:** `95%`

## TLDR
Implement a reliable PWA update experience so users can get app updates without manually clearing site data. The app now detects new deployments, prompts for refresh, and uses cache policies that minimize stale app shells.

## Critical Decisions
Key architectural/implementation choices made during exploration:
- Decision 1: Prompt-based service worker update flow - avoids interrupting active finance data entry.
- Decision 2: Keep hashed asset caching + revalidate HTML/SW - preserves performance while improving update freshness.

## Tasks:

- [x] 🟩 **Step 1: Confirm current PWA registration and update hooks**
  - [x] 🟩 Locate service worker registration entrypoint in the React app
  - [x] 🟩 Verify whether update detection existed

- [x] 🟩 **Step 2: Implement in-app “Update available” UX**
  - [x] 🟩 Add lightweight update banner with a one-tap refresh action
  - [x] 🟩 Wire action to activate the new service worker and reload

- [x] 🟩 **Step 3: Configure production cache headers**
  - [x] 🟩 Set `index.html` to revalidate
  - [x] 🟩 Set hashed static assets to immutable caching
  - [x] 🟩 Set service worker/manifest to revalidate

- [x] 🟩 **Step 4: Add basic version visibility**
  - [x] 🟩 Expose build metadata in Vite define constants
  - [x] 🟩 Surface build label on the install page

- [ ] 🟨 **Step 5: Validate update flow end-to-end**
  - [x] 🟩 Validate build and lint after implementation
  - [ ] 🟨 Test first install and second deploy update prompt
  - [ ] 🟨 Verify no manual cache clear is required on Android Chrome

- [x] 🟩 **Step 6: Rollout safeguards**
  - [x] 🟩 Add a short release checklist for PWA update verification
  - [x] 🟩 Define fallback guidance if update prompt does not appear

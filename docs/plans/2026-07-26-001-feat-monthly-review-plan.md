---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
title: Monthly Review (Personal Finances + Personal Assessment) - Plan
created: 2026-07-26
type: feat
---

# Monthly Review (Personal Finances + Personal Assessment) - Plan

## Goal Capsule

**Objective:** Add a recurring **Monthly Review** to the app that mirrors the shipped Weekly and Quarterly reviews — reminder pop-up when due, hybrid page, nav item with a due indicator, completion tracking — covering a **personal finances / wealth review** (guided prompts) and a **light personal-assessment capture** (link + takeaways) whose actual questions the user takes outside the app.

**Product authority:** In-session dialogue (this conversation). Grounded in the app's own `monthly_review` ritual list (`artifacts/api-server/src/routes/idealWeek.ts`): *Monthly Personal Assessment · Personal Finances/Wealth Review (pay CC, transfer $ to savings, Investments: HSA, brokerage) · Review Vision Board & Read Goals*.

**Reference blueprint:** `docs/plans/2026-07-23-001-feat-recurring-review-system-plan.md` (the shipped weekly/quarterly system). This plan reuses that architecture; monthly is a third review `kind`.

**Open blockers:** None. The personal-assessment questions live outside the app by the user's choice; this plan captures takeaways rather than rebuilding the questionnaire.

---

## Summary

The app already ships a recurring-review system for **weekly** and **quarterly** reviews: a `review_completions` table + `GET /reviews/status` / `POST /reviews/:kind/complete` endpoints, client-side due-ness in `review-cadence.ts`, a reminder pop-up mounted in the layout, per-field autosave via `{kind}_review_entries` tables, and text/icon nav items with a "due" indicator. This plan adds a **third review kind, `monthly`**, by mirroring that pattern end to end:

1. A **new `monthly_review_entries` table + `monthlyReview.ts` router** for per-field autosave, mirroring quarterly.
2. **Monthly completions** accepted by the existing completion endpoint (`kind="monthly"`, period = month 1-12).
3. **Monthly due-ness helpers** in `review-cadence.ts` (due from the 1st of each calendar month until completed).
4. A **new Monthly Review page** — hybrid (single page + optional guided steps): a **Finances** section (guided personal-finance prompts) and a **light Personal Assessment** section (link to the external assessment + key takeaways + next-month focus), ending in Finish/Mark complete.
5. The **reminder pop-up** and **nav** extended for the monthly kind.

---

## Problem Frame

- The user runs a monthly ritual (finances review + personal assessment) that the app *names* in its ritual list but does not *support* — there is no page, reminder, or record for it.
- Weekly and quarterly reviews are already first-class (page, reminder, nav, completion); monthly is the missing cadence between them.
- The personal-assessment questionnaire lives outside the app and will stay there; the app needs a lightweight touchpoint to prompt it and capture its outcome, not a rebuild.

---

## Requirements

- **R1** — Add a recurring **Monthly Review** as a third review kind, reusing the shipped weekly/quarterly machinery (completion tracking, reminder, hybrid page, nav).
- **R2** — When the app loads and the monthly review is due/overdue and not completed, the reminder pop-up offers to start it; dismissible for the session, reappearing every app open until marked complete.
- **R3** — The monthly review becomes due on the **1st of each calendar month** and stays due into the month until completed.
- **R4** — When multiple reviews are due at once, reminder precedence is **quarterly > monthly > weekly** (surface the rarest/most strategic first).
- **R5** — A **Finances** section with guided personal-finance prompts: income vs. plan; spending & biggest leak; money moves (credit cards paid, savings transfer, investments — HSA/brokerage); net-worth / cash check; money win; next month's #1 money move.
- **R6** — A **light Personal Assessment** section: a link field to the user's external assessment, key takeaways, and next-month focus. It does **not** reproduce the external questionnaire's questions.
- **R7** — Hybrid presentation: a single well-designed page by default plus an optional guided step mode (Finances → Personal Assessment), matching the weekly/quarterly pattern.
- **R8** — An explicit **Finish / Mark complete** records monthly completion and is the only thing that stops the reminder for that month.
- **R9** — The Monthly Review is surfaced in nav (mirroring the as-shipped weekly/quarterly item: label + icon + due indicator).
- **R10** — Monthly review content persists per-field with debounced autosave, mirroring quarterly (`monthly_review_entries`).

---

## Key Technical Decisions

- **KTD1 — Monthly is a third `kind` on the existing recurring-review architecture; do not reinvent.** Completion reuses the existing `review_completions` table with `kind="monthly"` and `period` = month number (1-12). `review_completions.kind` is a free-text column with no DB check constraint, so no schema change to that table is needed — only the endpoint's in-code `KINDS` allowlist and period-range validation are extended. *(Rationale: the sibling plan's KTD1/KTD2 already proved this shape; matching it is the whole point.)*
- **KTD2 — Monthly persistence mirrors quarterly exactly.** New `monthly_review_entries(id, year, month, field_key, content, updated_at)` table, unique on `(year, month, field_key)`, and a `monthlyReview.ts` router that mirrors `quarterlyReview.ts` (per-field `GET /monthly-review/:year/:month`, `PUT /monthly-review/:year/:month/:fieldKey`, month validated 1-12). Ships via drizzle `push` run **manually** against `DATABASE_PUBLIC_URL` (the deploy pipeline does not auto-migrate), per the sibling plan's KTD7.
- **KTD3 — Due-ness client-side, completion from server**, identical to weekly/quarterly. `review-cadence.ts` gains `currentMonth` / `monthlyPeriod` / `isMonthlyDue` (due whenever the current calendar month is not present in the completion rows). ET timezone matches the existing helpers (local-time `Date`).
- **KTD4 — Reminder precedence quarterly > monthly > weekly.** The modal already resolves a single `active` review from quarterly-then-weekly; monthly slots between them. *(Rationale: rarer/more strategic reviews should not be buried behind a weekly nudge.)*
- **KTD5 — Personal Assessment is a light capture section, not a questionnaire rebuild.** Fields: an assessment **link**, **key takeaways** (three-box field), and **next-month focus**. Three-box fields use the sibling plan's **KTD8 newline-join** convention — three inputs persisted as one `field_key` (three lines joined by `\n`, split on load) — so no new backend field concepts are introduced. *(Rationale: the user takes the actual assessment outside the app; KISS.)*
- **KTD6 — Nav mirrors the as-shipped icon + due-indicator pattern, not the sibling plan's original "text-only" intent.** The shipped `navItems` uses icons (Weekly = `ClipboardCheck`, Quarterly = `Target`) with a due set built from `reviews-status`. Monthly follows the code as shipped: a `navItems` leaf with an icon (`Wallet` proposed) plus `isMonthlyDue` feeding the same due set. *(Follow the implementation, not the superseded plan text.)*

**Product Contract preservation:** N/A — no separate brainstorm doc; product decisions authored here from the in-session dialogue.

---

## Implementation Units

### U1. Backend — monthly review persistence + accept monthly completions

**Goal:** Per-field storage for monthly review content, and let the existing completion endpoint accept `kind="monthly"`.
**Requirements:** R1, R8, R10.
**Dependencies:** none.
**Files:**
- `lib/db/src/schema/monthlyReview.ts` (new — `monthly_review_entries`, mirror `quarterlyReview.ts`)
- `lib/db/src/schema/index.ts` (export the new table)
- `artifacts/api-server/src/routes/monthlyReview.ts` (new router — mirror `quarterlyReview.ts`)
- `artifacts/api-server/src/routes/index.ts` (import + mount `monthlyReviewRouter`)
- `artifacts/api-server/src/routes/reviews.ts` (add `"monthly"` to `KINDS`; extend `maxPeriod` so monthly = 12)
- `lib/db/src/schema/reviewCompletions.ts` (comment only — document the new `monthly` kind / month period)
- `artifacts/api-server/src/routes/monthlyReview.test.ts` (new, if a route-test harness is present; otherwise verify via typecheck + live probe as the sibling plan did)

**Approach:** Copy the quarterly shape, swapping `quarter` → `month`: `monthly_review_entries(id, year, month, field_key, content, updated_at)`, unique `(year, month, field_key)`; routes `GET /monthly-review/:year/:month` (all fields) and `PUT /monthly-review/:year/:month/:fieldKey` (upsert), validating month 1-12 with the same `FIELD_KEY_RE` guard. In `reviews.ts`, change the period ceiling from the current binary (`weekly ? 53 : 4`) to a per-kind lookup covering `weekly=53, monthly=12, quarterly=4`, and add `"monthly"` to the `KINDS` set. `review_completions.kind` is free-text — no table migration for completions; only the new entries table is pushed.
**Patterns to follow:** `artifacts/api-server/src/routes/quarterlyReview.ts` and `lib/db/src/schema/quarterlyReview.ts` verbatim in structure; `reviews.ts` existing validation; drizzle `push` (no migration files; run manually against `DATABASE_PUBLIC_URL`).
**Test scenarios:**
- Happy: `PUT /monthly-review/2026/7/income {content:"..."}` then `GET /monthly-review/2026/7` returns it.
- Edge: re-`PUT` the same field overwrites, does not duplicate (unique index).
- Edge: `GET` a month with no entries → `[]`.
- Error: invalid `month` (0, 13, non-numeric) → 400; invalid `field_key` → 400.
- Completion: `POST /reviews/monthly/complete {year:2026, period:7}` then `GET /reviews/status` includes that row; `period:13` or `period:0` → 400; completing the same `(monthly,2026,7)` twice is idempotent.
**Verification:** Monthly fields round-trip per field; the completion endpoint accepts `monthly` with month 1-12 and rejects out-of-range; unique indexes enforced.

### U2. Cadence — monthly due-ness helpers

**Goal:** Client-side helpers that tell the reminder and nav whether the monthly review is due.
**Requirements:** R2, R3.
**Dependencies:** none (pure logic; parallel to U1).
**Files:**
- `artifacts/dental-dashboard/src/lib/review-cadence.ts` (add `currentMonth`, `monthlyPeriod`, `isMonthlyDue`; extend the `ReviewCompletion.kind` union to include `"monthly"`)
- `artifacts/dental-dashboard/src/lib/review-cadence.test.ts` (new/expanded, if a test file exists)

**Approach:** Mirror the quarterly helpers. `currentMonth(date) = date.getMonth() + 1` (1-12); `monthlyPeriod(now) = { year: now.getFullYear(), period: currentMonth(now) }`; `isMonthlyDue(completions, now) = !isCompleted(completions, "monthly", year, period)` where `{year, period} = monthlyPeriod(now)` — i.e., due from the 1st of the month until that month's completion row exists, exactly like `isQuarterlyDue`. Reuse the existing private `isCompleted` helper.
**Patterns to follow:** the `quarterlyPeriod` / `isQuarterlyDue` / `currentQuarter` trio already in `review-cadence.ts`.
**Test scenarios:**
- `monthlyPeriod(new Date(2026, 6, 15))` → `{year:2026, period:7}` (July).
- `isMonthlyDue([], now)` → true when no completion for the current month.
- `isMonthlyDue([{kind:"monthly",year:2026,period:7,...}], July2026)` → false; a completion for a *different* month or a different kind does not satisfy it.
- Year boundary: December vs January map to periods 12 and 1 with correct years.
**Verification:** Due-ness flips off only when the current month's monthly completion exists; unaffected by weekly/quarterly rows.

### U3. Frontend — Monthly Review page (hybrid)

**Goal:** A new Monthly Review page: a Finances section and a light Personal Assessment section, hybrid (page + guided steps), markable complete.
**Requirements:** R5, R6, R7, R8, R10.
**Dependencies:** U1 (entry + completion routes), U2 (`monthlyPeriod`).
**Files:**
- `artifacts/dental-dashboard/src/pages/monthly-review.tsx` (new — model on `quarterly-review.tsx`)
- `artifacts/dental-dashboard/src/App.tsx` (import `MonthlyReview`; add `/monthly-review` route)
- `artifacts/dental-dashboard/src/pages/monthly-review.test.tsx` (new)

**Approach:** Copy the quarterly page's hybrid scaffold (Page ↔ Guided toggle, uniform input boxes, debounced per-field autosave to `api/monthly-review/:year/:month/:fieldKey`, Finish action). Two sections replace Score/Reflect/Set-next:
- **1 · Finances** — guided prompts persisted as fields: `income` (income vs. plan, one box), `spending` (top spend / biggest leak / unnecessary — three boxes, KTD5), `money_moves` (CC paid / savings transfer / investments HSA+brokerage — three boxes), `net_worth` (net-worth or cash check, one box), `win` (money win, one box), `next_move` (next month's #1 money move, one box).
- **2 · Personal Assessment (light)** — `assessment_link` (URL to the external assessment, one box), `assessment_takeaways` (three boxes, KTD5), `assessment_focus` (focus for next month, one box). A short line reminds the user to take the assessment outside the app.

Guided mode steps: **Finances → Personal Assessment**, entered via the page toggle or the reminder's `?mode=guided`. **Finish — log this month ✓** `POST`s `/reviews/monthly/complete` with `monthlyPeriod` and routes back to the focus board. Exact prompt wording is directional and defined in the page — trivially editable later.
**Patterns to follow:** `artifacts/dental-dashboard/src/pages/quarterly-review.tsx` (hybrid structure, guided stepper, per-field autosave, Finish); three-box field handling from `weekly-review.tsx` (KTD5 / sibling KTD8).
**Test scenarios:**
- Happy: typing in the `income` box autosaves via `PUT /monthly-review/:year/:month/income`; reload rehydrates it.
- Three-box field: entering box 2 of `spending` persists the three lines joined by `\n`; reload splits back into the correct boxes.
- Guided: toggle / `?mode=guided` shows the two-step stepper; Next advances Finances → Personal Assessment; the last step shows Finish; Back returns.
- Finish: posts monthly completion for the current month and navigates away; re-opening the app that session shows no monthly modal.
- Assessment: `assessment_link` accepts and rehydrates a URL string; the section renders without requiring the external questions.
- Edge: Finish with empty fields still completes (user-driven ritual, not field-gated).
**Verification:** All monthly fields round-trip; guided stepper flows Finances → Personal Assessment; Finish records completion and silences the monthly reminder for the month.

### U4. Frontend — reminder pop-up: monthly branch

**Goal:** The app-open reminder covers the monthly review with correct precedence.
**Requirements:** R2, R3, R4, R8.
**Dependencies:** U1 (monthly completion), U2 (`isMonthlyDue`, `monthlyPeriod`).
**Files:**
- `artifacts/dental-dashboard/src/components/review-reminder-modal.tsx` (add the monthly branch)
- `artifacts/dental-dashboard/src/components/review-reminder-modal.test.tsx` (new/expanded)

**Approach:** Import `isMonthlyDue` / `monthlyPeriod`. Compute `monthlyDue` alongside `quarterlyDue` / `weeklyDue`, each gated by its own `sessionStorage` dismiss key (`review-dismiss-monthly-<year>-<month>`). Resolve `active` with precedence **quarterly → monthly → weekly** (KTD4). Add monthly copy — title e.g. "Time for your Monthly Review", subline about finances + personal check-in, icon 💰 — and route `start()` to `/monthly-review?mode=guided` for the monthly case. The modal still never sets completion; only the page's Finish does, so it returns each app open until then. The plain fixed-overlay implementation (no Radix Dialog) is unchanged — only branch logic is added.
**Patterns to follow:** the existing quarterly/weekly branches in `review-reminder-modal.tsx` (dismiss keys, `active` resolution, `start`/`dismiss`).
**Test scenarios:**
- Monthly due + not dismissed, nothing else due → monthly modal renders with monthly copy + Start links to `/monthly-review?mode=guided`.
- Precedence: monthly + weekly both due → monthly shown; quarterly + monthly both due → quarterly shown.
- Dismiss: "Later" hides it; re-mount same session stays hidden; new session (cleared sessionStorage) reappears.
- Completed: current month has a monthly completion → no monthly modal even after the 1st.
- Edge: status query error → no modal (fail closed).
**Verification:** Modal visibility matches the due/completed/dismiss matrix across all three kinds; precedence is quarterly > monthly > weekly; navigation lands on `/monthly-review`.

### U5. Navigation — surface the Monthly Review

**Goal:** Add Monthly Review as a nav item with a due indicator, mirroring the shipped weekly/quarterly items.
**Requirements:** R9.
**Dependencies:** U2 (`isMonthlyDue`), U3 (route exists).
**Files:**
- `artifacts/dental-dashboard/src/components/layout.tsx` (add the `navItems` leaf; feed `isMonthlyDue` into the due set)
- `artifacts/dental-dashboard/src/components/layout.test.tsx` (new/expanded, if a nav test exists)

**Approach:** Add a `navItems` leaf `{ href: "/monthly-review", label: "Monthly Review", icon: Wallet }` (import `Wallet` from lucide-react), placed between Weekly and Quarterly to read weekly → monthly → quarterly. In `NavList`, add `if (isMonthlyDue(reviewCompletions)) dueHrefs.add("/monthly-review");` alongside the existing weekly/quarterly due checks, reusing the same `reviews-status` query and due-indicator rendering.
**Patterns to follow:** the existing Weekly/Quarterly `navItems` entries and the `dueHrefs` logic in `layout.tsx`.
**Test scenarios:**
- Nav shows Monthly Review as a leaf linking to `/monthly-review`, ordered weekly → monthly → quarterly.
- The due indicator appears on Monthly Review only when the status query says the month is due, and is absent once completed.
**Verification:** Monthly Review reachable from nav; due indicator matches `isMonthlyDue`.

---

## Scope Boundaries

**In scope:** the five units above — monthly persistence + completion (U1), cadence helpers (U2), the Monthly Review page (U3), the reminder monthly branch (U4), and nav (U5).

### Deferred to Follow-Up Work
- **Rebuilding the external personal-assessment questionnaire in-app.** By the user's choice the questions stay external; v1 captures a link + takeaways + focus only (KTD5). Reproducing the full questionnaire is a later unit if wanted.
- **Per-business / company finances.** This review is personal finances only; business P&L stays with the Command Center / objectives.
- **Any bank / Open Dental / brokerage data pull.** All manual entry, like the other reviews.
- **Trend charts of monthly finance or assessment scores over time.** v1 stores per-month text; no aggregation view.
- **A third guided step linking Vision Board & Goals.** The user's ritual list includes "Review Vision Board & Read Goals"; adding it as a closing nudge/link is an optional nicety, deferred.

---

## Open Questions (non-blocking defaults chosen)

- **Personal Assessment section inclusion:** included as a light capture section (link + takeaways + focus). Drop to finances-only if preferred — it is one section to remove (assumed: include).
- **Finance prompt wording:** the six prompts in U3 are directional defaults grounded in the ritual note ("pay CC, transfer to savings, HSA/brokerage"); they live in the page and are trivially editable. Adjust wording anytime.
- **Monthly due window:** due from the 1st of the month until completed (assumed), mirroring the quarterly window. A grace/lead window is deferred.
- **Reminder frequency:** once per app session until completed (sessionStorage), reappearing each new session — same as weekly/quarterly.

---

## Risks & Dependencies

- **Client-side month math + ET timezone.** `getMonth()`/`getFullYear()` are local-time; the existing helpers already assume ET. Mitigation: pure helpers in `review-cadence.ts` with unit tests; fail-closed on status errors (no modal).
- **Reminder precedence must not hide a due weekly.** Adding monthly between quarterly and weekly changes the `active` resolution. Mitigation: cover the full precedence matrix in the U4 test.
- **Schema via `push`.** `drizzle-kit push` mutates the live DB; adding one additive table (`monthly_review_entries`) is low-risk. Run manually against the intended `DATABASE_PUBLIC_URL`; no destructive changes; `review_completions` needs no migration (free-text `kind`).
- **Pattern drift from the sibling system.** The value here is fidelity to the shipped weekly/quarterly pattern; deviating invites inconsistency. Mitigation: copy `quarterlyReview.ts` / `quarterly-review.tsx` structure rather than authoring fresh.

---

## Verification Contract

- **Backend:** `pnpm --filter @workspace/api-server run typecheck` clean; new route test (`monthlyReview.test.ts`) passes if a harness exists, otherwise verify live per the sibling plan (typecheck + probe `PUT`/`GET /monthly-review/...` and `POST /reviews/monthly/complete`); schema `push` applies cleanly against `DATABASE_PUBLIC_URL`.
- **Frontend:** `pnpm --filter @workspace/dental-dashboard run typecheck` + `build` clean; new component/page/cadence tests pass.
- **End-to-end (post-deploy, manual):** with the current month uncompleted, opening the app shows the monthly reminder (respecting quarterly > monthly > weekly precedence); "Later" hides it and it returns on reload; the Monthly Review page autosaves finance + assessment fields; Finish records completion and stops the reminder; the nav due indicator clears after completion.

---

## Definition of Done

- All five units landed; backend + frontend typecheck + build + new tests green.
- Opening the app when the monthly review is due shows the reminder with correct precedence; ignoring never permanently dismisses it; Finish does.
- The Monthly Review page captures personal finances (guided prompts) and a light personal-assessment record (link + takeaways + focus), hybrid page/guided, autosaved per field.
- Monthly Review is reachable from nav with a due indicator that matches `isMonthlyDue`.
- Shipped via branch → PR → merge → deploy, verified live (per repo deploy pipeline).

---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
title: Recurring Weekly + Quarterly Review System - Plan
created: 2026-07-23
type: feat
---

# Recurring Weekly + Quarterly Review System - Plan

## Goal Capsule

**Objective:** Turn the buried, passive Weekly Review into a recurring, prompted, well-designed ritual, and add a matching Quarterly Review — both surfaced by a persistent pop-up when due, wired into the quarterly OKRs and the On Deck → This Week's Top 3 flow.

**Product authority:** In-session brainstorm (this conversation). No separate requirements doc was written; the resolved product decisions are captured below as Requirements and Key Technical Decisions.

**Open blockers:** None. A handful of non-blocking design defaults are recorded in Open Questions.

---

## Summary

Today the Weekly Review (`src/pages/weekly-review.tsx`) is a flat, per-week form the user has to remember to visit; there is no Quarterly Review, no reminder, and no connection to the objectives or the On Deck shortlist. This plan adds:

1. A **persistent modal pop-up** on app open when a weekly/quarterly review is due or overdue — dismissible for the current session but reappearing every app open until the review is marked complete.
2. A **redesigned Weekly Review** — same reflection content, restructured into Reflect → Review → Plan, ending by picking **This Week's Top 3 from On Deck**, anchored to live OKR pace.
3. A **new Quarterly Review** — Score → Reflect → Set next quarter — that auto-pulls objectives and their key-result progress to score, and edits objectives going forward.
4. **Hybrid presentation** — a nice single page by default, with an optional guided step mode.
5. **Completion + status tracking** so cadence (and a streak) is visible and the pop-up knows when to stop.

---

## Problem Frame

- The review page is *hidden and passive* — nothing pulls the user into it, so the ritual lapses.
- It is *disconnected* — the week's plan doesn't draw from On Deck, and neither weekly nor quarterly connects to the objectives that pace pills already track.
- There is *no quarterly ritual* — objectives run on a calendar-quarter cadence (pace pills) but nothing scores a quarter or sets the next one.
- The UI is a long column of textareas — functional but not something the user wants to open.

---

## Requirements

- **R1** — When the app loads and a weekly or quarterly review is due/overdue and not completed, show a modal reminder linking to that review page.
- **R2** — The reminder can be dismissed (X) for the current app session but reappears on every subsequent app open until the review is marked complete.
- **R3** — The weekly review becomes "due" on a configurable day of week (default Sunday) and stays due into the new week until completed.
- **R4** — The quarterly review becomes due at the start of each calendar quarter and stays due until completed.
- **R5** — Marking a review **complete** (explicit "Finish / Mark complete") is the only thing that stops the reminder for that period, and records completion.
- **R6** — The weekly review is presented as a hybrid: a single well-designed page by default, plus an optional guided step-by-step mode.
- **R7** — The weekly review preserves all existing reflection + planning fields.
- **R8** — The weekly review's "Plan" step lets the user pick **This Week's Top 3 (Weekly Big 3) from On Deck**, add new items to On Deck inline, and (when On Deck is empty) offers a link to set it up. It also surfaces the current quarter's objectives with pace as an anchor.
- **R9** — A new quarterly review page presents Score → Reflect → Set next quarter, hybrid like the weekly.
- **R10** — The quarterly review's "Score" step auto-pulls the user's objectives and their key-result progress; scores are snapshotted into the review's saved content.
- **R11** — The quarterly review's "Set next quarter" step lets the user edit/add objectives going forward (carry-forward = keep an objective).
- **R12** — Both reviews are surfaced prominently in navigation (no longer buried), as **text-only** items (no icons), with a small "due" dot when a review is due. No streak/cadence widget.
- **R13** — Designated reflection/planning fields provide **three discrete entry spots** (not one free-text blob): Wins, Losses, Fixes, Ah-HAs, What I learned, Banner Goals, Quarterly Big 3, Three Most Important Events, Habits, and Personal-development studying. The remaining single-entry fields (Unexpected Time Drains, the two Grateful fields) keep one input; Weekly Big 3 comes from the On Deck picker.
- **R14** — Objectives shown in the weekly "Review" section are **editable in place** (click-to-edit), not read-only.
- **R15** — Vision Board is removed from the sidebar navigation (its page/route is retained, just unlinked).

---

## Key Technical Decisions

- **KTD1 — Due-ness computed client-side, completion from the server.** The frontend already knows the date and the configured due-day, so it computes "is a review due"; the backend supplies "is this period completed." **As shipped (U1/U2):** the endpoints are root-level — `GET /reviews/status` (returns the raw completion rows), `POST /reviews/:kind/complete`, and `/quarterly-review/...` — matching the existing root-mounted `weekly-review` router, and **not** business-scoped. `GET /reviews/status` returns only the completion rows (no streak); the client derives "completed this week/quarter" from them. The reminder modal mounts once in `src/components/layout.tsx` (wraps every route). Session dismissal uses `sessionStorage` so it clears on a fresh app open. *(Rationale: no email/push infra needed; single-user app.)*
- **KTD2 — Completion tracked in a new `review_completions` table**, mirroring the existing `idealWeekCompletionsTable` pattern: `(kind, year, period, completed_at)` where `kind ∈ {weekly, quarterly}` and `period` is ISO week or quarter number. Unique on `(kind, year, period)`.
- **KTD3 — Configurable weekly due-day lives in `localStorage` (default Sunday) for v1.** No settings table exists; a single-user app doesn't need cross-device sync yet. Promoting to a server setting is deferred.
- **KTD4 — Quarterly persistence mirrors weekly.** New `quarterly_review_entries` table `(year, quarter, field_key, content)` and a `quarterlyReview.ts` router that mirrors `weeklyReview.ts` (per-field GET/PUT, debounced autosave). *(Rationale: identical shape → reuse the proven pattern.)*
- **KTD5 — Objectives are NOT quarter-stamped, and this plan does not add stamping.** `cc_objectives` has no quarter column; pace is derived vs. the current calendar quarter. The quarterly review therefore **scores the current objectives** at review time and snapshots each score into its own saved fields; "Set next quarter" edits objectives forward via the existing objectives/key-results endpoints. Per-quarter objective historization is explicitly deferred (see Scope Boundaries).
- **KTD6 — Hybrid = one page + a local "guided mode" toggle, not separate routes.** Guided mode is UI state over the same sections and same persistence; the reminder's "Start review" can deep-link into guided mode via a query param.
- **KTD7 — Reuse, don't reinvent.** The On Deck → Top 3 picker reuses the existing `FocusSnapshot` pin/slot logic (`src/pages/ideal-week.tsx`); OKR pace reuses `paceOf` / objectives (`src/pages/command-center.tsx`); the modal reuses the Radix `Dialog`; weekly persistence stays as-is. Schema changes ship via drizzle `push` (no migration files) — and, since the deploy pipeline does not auto-migrate, the push is run manually against `DATABASE_PUBLIC_URL`.
- **KTD8 — Three-entry fields store one field key, newline-joined.** For the R13 fields, the frontend renders three input boxes but persists them as a **single** field key whose content is the three lines joined by `\n` (split back into three boxes on load). This keeps the existing per-field weekly/quarterly persistence and its allowlist **unchanged** — no new field keys, no backend edit. *(Rationale: KISS; avoids reopening the shipped backend.)*
- **KTD9 — Nav is text-only and flat.** Weekly Review and Quarterly Review are added as plain text nav items (no icons, no "Reviews" group heading), with a small red "due" dot driven by the same status query. No streak/cadence widget. Vision Board's nav entry is removed (route retained). *(Existing nav items keep their current icons; only the review items and the removals are in scope.)*

**Product Contract preservation:** N/A — no separate brainstorm doc; product decisions authored here from the in-session dialogue.

---

## High-Level Technical Design

The recurring loop and the due-ness state machine:

```mermaid
flowchart TD
  Q[Quarterly Review<br/>Score → Reflect → Set next quarter] -->|sets/edits| OBJ[Objectives + Key Results]
  OBJ -->|pace anchor| W[Weekly Review<br/>Reflect → Review → Plan]
  W -->|Plan step: On Deck → Top 3| T3[This Week's Top 3]
  T3 --> DAY[Daily work / focus board]
  DAY -->|next week| W
  W -.->|weeks roll up| Q

  subgraph Reminder
    LOAD[App open] --> STAT[GET review status]
    STAT --> DUE{Due & not completed<br/>& not dismissed this session?}
    DUE -->|yes| MODAL[Show modal → link to page]
    DUE -->|no| NONE[No modal]
    MODAL -->|X| DISMISS[sessionStorage dismiss<br/>returns next app open]
    MODAL -->|Finish/Mark complete| DONE[POST complete → stops until next period]
  end
```

Due-ness (client-computed): **weekly** = today's weekday ≥ configured due-day within the current ISO week AND that week not completed; **quarterly** = within the current calendar quarter AND that quarter not completed. Completion is per-period and permanent for that period.

---

## Implementation Units

### U1. Backend — review completion + status endpoint

**Goal:** Persist per-period review completion and expose a status query the frontend uses to drive the reminder and streak.
**Requirements:** R2, R5, R12.
**Dependencies:** none.
**Files:**
- `lib/db/src/schema/reviewCompletions.ts` (new — `review_completions` table)
- `lib/db/src/schema/index.ts` (export the new table)
- `artifacts/api-server/src/routes/reviews.ts` (new router: status + complete)
- `artifacts/api-server/src/routes/index.ts` (mount the router)
- `artifacts/api-server/src/routes/reviews.test.ts` (new)

**Status: SHIPPED (PR #6).** Prod DB migrated via `drizzle-kit push`; endpoints verified live returning `[]`.

**Approach (as built):** Mirror `idealWeekCompletionsTable`. `review_completions(id, kind text, year int, period int, completed_at timestamptz)`, unique `(kind, year, period)`. **Root-mounted, not business-scoped:** `GET /reviews/status` returns the raw completion rows `[{kind, year, period, completedAt}]` (no streak — the client derives everything); `POST /reviews/:kind/complete {year, period}` idempotently upserts (validates kind + period range). *(Streak was dropped per the no-streak decision, KTD9/R12.)*
**Patterns to follow:** `idealWeekCompletionsTable`; `weeklyReview.ts` route style; drizzle `push` (no migration files; run manually against `DATABASE_PUBLIC_URL`).
**Test scenarios (no backend harness — verified via typecheck + live probe):**
- `POST /reviews/weekly/complete {year:2026, period:30}` then `GET /reviews/status` includes that row.
- Completing the same `(kind,year,period)` twice is idempotent (unique index; returns existing row).
- `GET /reviews/status` with no rows → `[]`.
- `POST` with missing/invalid `year`/`period`, or invalid `kind`, → 400.
**Verification:** `GET status` reflects completions; unique constraint prevents dupes.

### U2. Backend — quarterly review persistence

**Status: SHIPPED (PR #6).** Table created in prod; `/quarterly-review/...` verified live.

**Goal:** Per-field storage for quarterly review content, mirroring the weekly review.
**Requirements:** R9, R10.
**Dependencies:** none (parallel to U1).
**Files:**
- `lib/db/src/schema/quarterlyReview.ts` (new — `quarterly_review_entries`)
- `lib/db/src/schema/index.ts` (export)
- `artifacts/api-server/src/routes/quarterlyReview.ts` (new — mirror `weeklyReview.ts`)
- `artifacts/api-server/src/routes/index.ts` (mount)
- `artifacts/api-server/src/routes/quarterlyReview.test.ts` (new)

**Approach:** Copy the weekly shape exactly, swapping `week` → `quarter`: `quarterly_review_entries(id, year, quarter, field_key, content, updated_at)`, unique `(year, quarter, field_key)`. Routes: `GET /api/quarterly-review/:year/:quarter` (all fields), `PUT /api/quarterly-review/:year/:quarter/:fieldKey` (upsert content).
**Patterns to follow:** `artifacts/api-server/src/routes/weeklyReview.ts` and `lib/db/src/schema/weeklyReview.ts` verbatim in structure.
**Test scenarios:**
- Happy: `PUT .../2026/2/wins {content:"..."}` then `GET .../2026/2` returns it.
- Edge: re-`PUT` the same field overwrites, does not duplicate.
- Edge: `GET` a quarter with no entries → `[]`.
- Error: invalid `quarter` (e.g. 5) or non-numeric → 400.
**Verification:** Round-trips per field; unique index enforced.

### U3. Frontend — review reminder pop-up (app shell)

**Goal:** A persistent modal that appears on app open when a review is due and unfinished, links to the page, and won't be permanently dismissed by ignoring it.
**Requirements:** R1, R2, R3, R4, R5.
**Dependencies:** U1.
**Files:**
- `src/components/review-reminder-modal.tsx` (new)
- `src/components/layout.tsx` (mount the modal once, inside `<Layout>`)
- `src/lib/review-cadence.ts` (new — due-ness helpers + due-day localStorage accessor)
- `src/components/review-reminder-modal.test.tsx` (new)

**Approach:** On mount, query `GET /reviews/status` (react-query; returns completion rows). Compute due-ness client-side via `review-cadence.ts`: weekly due when `todayWeekday >= dueDay` (from `localStorage`, default 0=Sunday) and the current ISO week is not in the completions; quarterly due when the current quarter is not in the completions. If due and not dismissed this session (a `sessionStorage` key per kind+period), render a centered Radix `Dialog`. **Copy:** title "Your Weekly Review is ready" (quarterly: "New quarter — time for your Q# review"), sub-line "Take a few minutes to reflect on last week and set your focus for the week ahead." — **no** persistence/"it'll come back" fine print. Buttons: **"Start review →"** navigates to the page **and opens Guided mode** (`?mode=guided`), quarterly taking precedence when both due; **"Later"** (and the X) set the sessionStorage dismiss. The modal never sets completion — only the page's Finish does (U4/U5), so it returns next app open until then.
**Patterns to follow:** existing `Dialog` usage; react-query hooks in `src/pages/ideal-week.tsx`; wouter `useLocation`/`Link` for navigation. **No backend test harness exists** — cover this unit with the frontend component test only.
**Test scenarios:**
- Happy: status weekly-due + not dismissed → modal renders with weekly copy + link to `/weekly-review`.
- Both due → quarterly modal takes precedence.
- Dismiss: click "Later" → modal hides; re-mount in same session → stays hidden; simulate new session (clear sessionStorage) → reappears.
- Completed: status `completedThisWeek:true` → no weekly modal even if past due-day.
- Due-day config: due-day set to Friday, today Thursday → not due; today Saturday → due.
- Edge: status query error → no modal (fail closed, never blocks the app).
**Verification:** Modal visibility matches the due/completed/dismiss matrix; navigation lands on the correct page; ignoring never permanently silences it.

### U4. Frontend — Weekly Review redesign (hybrid, On Deck → Top 3, Finish)

**Goal:** Rebuild the weekly review as a nicely-designed hybrid page whose Plan step sets This Week's Top 3 from On Deck and which can be marked complete.
**Requirements:** R5, R6, R7, R8, R13, R14.
**Dependencies:** U1 (complete endpoint). Reuses On Deck/Top 3 + objectives (no new backend).
**Files:**
- `src/pages/weekly-review.tsx` (redesign; keep field defs + per-field autosave)
- `src/pages/ideal-week.tsx` (export the On Deck → Top 3 slot-pick logic for reuse, or a thin extracted picker)
- `src/pages/weekly-review.test.tsx` (new/expanded)

**Approach:** Restructure into three sections with a shared visual language — every field is **label + uniform input boxes** (see below):
- **1 · Reflect** — Wins, Losses, Fixes, Ah-HAs, What I learned (**three boxes each**, R13); Unexpected Time Drains, Something I'm grateful for, A loss I'm grateful for (one box each).
- **2 · Review** — current-quarter objectives from `/command-center/objectives` with `paceOf` pills, rendered **click-to-edit (R14, not read-only)** reusing the Command Center objective edit/`ObjectiveDialog` pattern; plus Banner Goals and Quarterly Big 3 (three boxes each).
- **3 · Plan** — the **On Deck → Weekly Big 3** picker (reuses `FocusSnapshot`'s pin-to-slot flow), with a quiet **"+ Add to On Deck"** input under the list and, when On Deck is empty, a **"Set up your On Deck →"** link; plus Three Most Important Events, Habits, and studying (three boxes each).

**Three-box fields (R13/KTD8):** render three inputs but persist as one field key, the three lines joined by `\n` (split on load). Existing debounced per-field autosave to `api/weekly-review/...` is otherwise **untouched**.

**Hybrid (KTD6):** a **Page ↔ Guided** toggle. Guided (also entered via the pop-up's `?mode=guided`) shows a **stepper (Reflect → Review → Plan)** with Back/Next, one section at a time; finished steps show a check. Both modes share the same fields and autosave. A **"Finish — set my week ✓"** action `POST`s weekly completion (U1) and routes to the focus board.
**Patterns to follow:** current `weekly-review.tsx` persistence; `FocusSnapshot` pin/slot picker, On Deck add + `ON_DECK_CAP` in `src/pages/ideal-week.tsx`; `paceOf`/objectives/`ObjectiveDialog` in `src/pages/command-center.tsx`.
**Test scenarios:**
- Happy: typing in box 2 of a three-box field autosaves with the three lines joined by `\n`; reload splits them back into the right boxes.
- Plan: selecting an On Deck item into slot 2 fills Weekly Big 3 slot 2 and removes the item from On Deck.
- On Deck: "+ Add to On Deck" adds an item; empty On Deck shows the "Set up your On Deck →" link.
- Review: current-quarter objectives render with correct pace pills; editing an objective's text persists via the objectives endpoint.
- Guided: toggle/`?mode=guided` shows the stepper; Next advances Reflect→Review→Plan; the last step shows Finish; Back returns.
- Finish: posts weekly completion and navigates away; re-opening the app that session shows no weekly modal.
- Edge: Finish with empty fields still completes (user-driven, not field-gated).
**Verification:** Three-box fields round-trip; Weekly Big 3 gets set from On Deck; objectives editable inline; Guided stepper flows; Finish records completion and silences the reminder for the week.

### U5. Frontend — Quarterly Review page (new, hybrid)

**Goal:** A new quarterly review page: Score objectives → Reflect → Set next quarter, hybrid, markable complete.
**Requirements:** R9, R10, R11, R5.
**Dependencies:** U1, U2.
**Files:**
- `src/pages/quarterly-review.tsx` (new)
- `src/App.tsx` (add `/quarterly-review` route)
- `src/pages/quarterly-review.test.tsx` (new)

**Approach:** Three sections mirroring the weekly hybrid, same **Page ↔ Guided stepper** (Score → Reflect → Set next quarter) and same uniform input boxes. **Score:** fetch `/command-center/objectives`, render each objective grouped by business (`businessIds` → EDGE/Urgent/Personal) with its key-result progress bar and a per-objective **score input** saved to `quarterly_review_entries` via `PUT /quarterly-review/:year/:quarter/score_<objectiveId>` (via U2) — score is a snapshot, not written back to the objective (KTD5). **Reflect:** quarterly reflection prompts as **three-box fields** (KTD8), persisted via U2. **Set next quarter:** list current objectives with inline edit/add using the existing objectives + key-results endpoints (carry-forward = leave as-is; "+ Add a Q3 objective" = create). **Finish — set the quarter ✓** posts `POST /reviews/quarterly/complete` (U1).
**Patterns to follow:** U4's hybrid structure; objectives grouping + `objectiveGroupColor`/`paceOf` from `src/pages/command-center.tsx`; weekly per-field autosave pattern for the score/reflect fields.
**Test scenarios:**
- Happy: Score step lists objectives with derived KR progress; entering a score autosaves to the quarterly field store.
- Set next quarter: adding an objective calls the objectives create endpoint; editing text patches it.
- Snapshot: changing objectives in "Set next quarter" does not alter a previously saved Score field.
- Guided: step navigation Score→Reflect→Set-next works; final step shows Finish.
- Finish: posts quarterly completion; reminder for the quarter stops that session.
- Edge: no objectives yet → Score step shows an empty-state prompt, Finish still allowed.
**Verification:** Scores persist independently of objective edits; next-quarter edits flow through existing objective endpoints; Finish silences the quarterly reminder.

### U6. Navigation — surface reviews, remove Vision Board

**Goal:** Make both reviews first-class, text-only nav items with a small "due" dot; remove Vision Board from the sidebar.
**Requirements:** R12, R15.
**Dependencies:** U1 (status), U5 (route exists).
**Files:**
- `src/components/layout.tsx` (nav items for Weekly Review + Quarterly Review; remove Vision Board entry; due dot)
- `src/App.tsx` (retain the `/vision-board` route — only the nav link is removed)
- `src/components/layout.test.tsx` (new/expanded, if a nav test exists)

**Approach:** Add **plain text** nav entries for Weekly Review and Quarterly Review (no icons, **no "Reviews" group heading** — flat in the `NAV` list), and **remove the Vision Board entry** (route retained per R15). Show a small red **due dot** on a review item when that review is due, derived from the same `GET /reviews/status` query used by U3 (share the hook). **No streak/cadence widget** (KTD9). Existing items keep their icons.
**Patterns to follow:** existing `NAV` array + `NavList` in `src/components/layout.tsx`.
**Test scenarios:**
- Nav shows Weekly Review + Quarterly Review as text items linking to the right routes; Vision Board is absent.
- The due dot appears on Weekly Review only when the status query says it's due, and is absent when completed.
**Verification:** Both reviews reachable from nav as text items; Vision Board gone from nav but its route still resolves; due dot matches status.

---

## Scope Boundaries

**In scope:** the six units above — completion/status backend, quarterly persistence, the reminder modal, the weekly redesign with On Deck → Top 3, the new quarterly review, and nav surfacing.

### Deferred to Follow-Up Work
- **Per-quarter objective historization** (a quarter column on objectives / snapshotting the full objective set per quarter). v1 scores current objectives and snapshots scores into review fields (KTD5).
- **Server-side due-day setting** (cross-device). v1 uses `localStorage` (KTD3).
- **Email / browser-push / calendar reminders.** Explicitly out — in-app modal only, per the brainstorm.
- **Auto-carry-forward automation** (e.g., auto-cloning unfinished objectives into next quarter). v1 is manual edit/add.
- **Reminder cadence tuning** (grace windows, "remind me in N days"). v1 is due-until-complete.

---

## Open Questions (non-blocking defaults chosen)

- **Completion gating:** Finish completes regardless of how many fields are filled (assumed — user-driven ritual, not a form gate). Revisit if the user wants a minimum.
- **Quarterly due window:** due from the first day of the quarter until completed (assumed). A later grace/lead window is deferred.
- **Reminder frequency:** once per app session until completed (via `sessionStorage`), reappearing each new session. Alternative (once per calendar day) is a small tweak if preferred.
- **Three-entry storage (resolved → KTD8):** stored as one field key, three lines joined by `\n` — no backend change. (Alternative of three separate field keys was declined for KISS.)
- **Streak: removed.** The nav shows only a "due" dot; no streak/cadence widget (KTD9/R12).

---

## Risks & Dependencies

- **Shared-component reuse (Top 3 picker):** the On Deck → Top 3 flow lives inside `FocusSnapshot`; extracting/reusing it must not regress the Ideal Week and Command Center boards. Mitigation: reuse the existing pin logic without changing `FocusSnapshot`'s own props/behavior; cover with the U4 integration test.
- **Client-side due-ness correctness:** weekday/quarter math and timezone (ET). Mitigation: pure helpers in `review-cadence.ts` with unit tests; fail-closed on status errors (no modal).
- **Schema via `push`:** `drizzle-kit push` mutates the live DB; adding two tables is additive/low-risk, but run against the intended database. No destructive changes.
- **Objectives grouping assumption:** `businessIds` `[1]=EDGE, [2]=Urgent, []=personal` is a documented convention in the schema; if business ids drift, grouping labels must follow the real `/businesses` list (as the Command Center band already does).

---

## Verification Contract

- Backend: `pnpm --filter @workspace/api-server run typecheck` + the new route tests (`reviews.test.ts`, `quarterlyReview.test.ts`) pass; schema `push` applies cleanly.
- Frontend: `pnpm --filter @workspace/dental-dashboard run typecheck` + `build` clean; new component/page tests pass.
- End-to-end (post-deploy, manual — no local backend): with a due week, opening the app shows the modal; "Later" hides it and it returns on reload; completing the weekly review stops it; the Plan step sets This Week's Top 3 from On Deck; the quarterly review scores objectives and marks complete.

## Definition of Done

- All six units landed; typecheck + build + new tests green.
- Opening the app when a review is due shows the modal; ignoring never permanently dismisses it; Finish does.
- Weekly review is a hybrid page that ends by setting This Week's Top 3 from On Deck and shows OKR pace.
- Quarterly review exists, scores current objectives, and can set next quarter's objectives.
- Both reviews are reachable and their cadence/streak is visible in the nav.
- Shipped via branch → PR → merge → deploy, verified live by bundle hash (per repo deploy pipeline).

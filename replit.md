# Dental CEO Dashboard

## Overview

A focused dental practice CEO dashboard with three surfaces: **Today** (daily planning + ideal-week scheduling), **Command Center** (personal planner — Top 3, direct reports, projects, life areas, brain dump), and **EDGE** (lease tracking across every EDGE and Urgent Dental location). The earlier modules — Action Items, Team / Org Chart / Roles, Meetings (Leadership + 1-on-1s), and the Playbook Library — were removed in May 2026 to keep the app lean.

A second standalone artifact, **Urgent Dental** (`/urgent-dental/`), mirrors the Command Center as its own root-route page and is fully isolated: its tables use the `ud_` prefix (`ud_top3`, `ud_direct_reports`, `ud_projects`, `ud_task_sections`, `ud_tasks`, `ud_brain_dump`, `ud_future_todos`) and Life Areas is intentionally not exposed there — that surface is personal to the CEO Dashboard only and its API is mounted at `/api/urgent-dental/*`. No data is shared with the Dental CEO Dashboard.

## User Preferences

The user prefers clean, read-only views with minimal chrome. Editing controls (add row buttons, delete icons, drag handles, hover-only actions) should be hidden behind an explicit edit toggle on each container. The user prefers one obvious affordance over many to avoid clutter.

## System Architecture

The project uses a monorepo structure managed by `pnpm workspaces`. The frontend is built with **React, Vite, Tailwind CSS, shadcn/ui**, and **Recharts**. The API backend is an **Express 5** application. **PostgreSQL** with **Drizzle ORM** is used for data persistence. **Zod** is used for schema validation, and **Orval** generates API client code from an OpenAPI specification. **Wouter** handles frontend routing.

### Surviving sidebar
- **Command Center** (`/command-center`): Personal planner with five tabs — Overview (Today's Top 3 (persistent — does not reset), four stat tiles, open-items snapshot), Direct Reports (collapsible per-person accordions with task lists; project tasks owned by the report auto-merge in with a "from [Project]" badge), Projects (per-project accordions with clickable Active/On Hold/Complete status badge; tasks include an Owner column that can route the task to a direct report), Life Areas (the 8 categories from "Living Your Best Year Ever" — Health / Fitness, Business, Mindset, Family, Legacy Wealth, Faith, Lifestyle and Travel, Relationships — each accordion exposes Identity / Why / How I Preserve It / What It Feels Like bullet panels plus structured goals grouped by Outcome / Performance / Process-Continue / Process-More-Consistent / Process-Begin with a 4-state status (Not started / In progress / Launched / Achieved) and Next Steps; one Edit/Done toggle per area gates all inline editing), and Brain Dump (timestamped entries with a GTD processor — filter pills for Inbox/Reference/Someday/Processed, an edit-mode toggle that reveals a Process button on each entry, and a decision-tree panel that routes the thought to Trash/Reference/Someday/Done/Delegate (→ DR task)/Project (→ project task with optional owner)/Today's Big 3 (slot picker, snapshots & restores prior slot on Undo)/Future To-Do). Backend tables: `cc_top3`, `cc_direct_reports`, `cc_projects`, `cc_life_areas` (with `identity`, `why`, `how_i_preserve`, `feels_like` text arrays), `cc_life_area_goals` (id, life_area_id FK, goal_type, text, status, next_steps, sort_order), `cc_tasks` (polymorphic via `parent_type` + `parent_id`, with optional `owner_direct_report_id`), `cc_brain_dump` (with `outcome`, `processed_at`, `routed_task_id/type/slot/snapshot` for reversible routing). API mounted under `/api/command-center/*`; the GTD endpoints are `POST /brain-dump/:id/process` and `POST /brain-dump/:id/unprocess`. Page is self-contained with inline styles (Playfair Display + DM Sans on warm off-white #f4f1ec, charcoal #2a2520 header, burgundy #6b1d2a accent) — does not use shadcn.
- **Today** (`/ideal-week`): Weekly scorecard with identity/habit tracking. A Google Calendar-style weekly schedule supports drag-to-create, move, and resize time blocks, with half-hour grid lines and a current time indicator. Google Calendar integration overlays live events. Includes Today's Big 3 and This Week's Big 3 (each capped at 3 items), a **Future To-Do** backlog (uncapped, separate from the date- and week-scoped Big 3 lists; persists in `future_todos` table; completed items collapse behind a "Show N completed" toggle), a Reading List, and editable Ritual sidebar sections.
- **EDGE** (`/organizations`): Two tabs only — **Lease Matrix** (default) and **Lease Toolkit**.
  - **Lease Matrix**: Spreadsheet-style grid that puts every EDGE/UD location side-by-side as columns with lease fields as rows (locations, terms, base rent & escalator, CAM cap structure, TI allowance per SF + auto-totaled, free rent, delivery condition, RCD timeline, personal guarantors and exposure, liability cap, permitted use, exclusivity, signage rights, key dates, documents, notes). Sticky leftmost field column and sticky header row. A read-only / edit-mode toggle (persisted to `localStorage`) gates inline editing — every cell opens a small popover editor (text, multi-line, currency, percent, integer, date, yes/no/conditional, multi-select). Consolidated cells (Lease Term & Options, Base Rent & Escalator, CAM, Signage Rights, Personal Guarantors) edit several DB columns at once but display a single summary. Auto-calculated cells (TI Allowance Total = Sq Ft × $/SF; Lease Expiration = Execution Date + Term Years) show the calculation by default but accept an override that persists, with an indicator (amber calculator icon) when overridden — clearing the override reverts to the calculation. The Documents row opens a side panel with a file uploader (presigned-PUT to App Storage), a type tag dropdown (Signed Lease / LOI / Amendment / Exhibit / Side Letter / Guaranty / Signage Approval / Exclusive Recording / Other) and a free-form label per upload. Column headers carry critical-date alert badges (red = past due, orange ≤30d, yellow ≤90d) sorted most-urgent-first with "+N more" overflow. Rows are seeded idempotently from EDGE/UD organizations on every list request (categories `edge` and `urgent_dental`; the `edge_dso` parent is excluded), so adding a new location automatically gets an empty lease record without requiring manual seeding.
  - **Lease Toolkit**: Static reference documents tied to lease workflows.
- Legacy `/edge-lease-matrix` URL still redirects into `/organizations?tab=lease-matrix`.

### Authentication
**Clerk** is the authentication provider. Server-side, `@clerk/express` handles authentication, upserting users into the `users` table and attaching `req.authedUser`. Frontend uses `@clerk/react` with a branded `shadcn` theme. Protected routes redirect to sign-in, and signed-in users on the root path redirect to `/ideal-week`.

## External Dependencies

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk (Replit-managed)
- **API Specification**: OpenAPI
- **API Client Generation**: Orval
- **Frontend UI Components**: shadcn/ui
- **Charting Library**: Recharts
- **Styling**: Tailwind CSS
- **Google Services**: Google Calendar API (for integration in Ideal Week)

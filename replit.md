# Dental CEO Dashboard

## Overview

A focused dental practice CEO dashboard with three surfaces: **Today** (daily planning + ideal-week scheduling), **Command Center** (personal planner — Top 3, direct reports, projects, life areas, brain dump), and **EDGE** (lease tracking across every EDGE and Urgent Dental location). The earlier modules — Action Items, Team / Org Chart / Roles, Meetings (Leadership + 1-on-1s), and the Playbook Library — were removed in May 2026 to keep the app lean.

## User Preferences

The user prefers clean, read-only views with minimal chrome. Editing controls (add row buttons, delete icons, drag handles, hover-only actions) should be hidden behind an explicit edit toggle on each container. The user prefers one obvious affordance over many to avoid clutter.

## System Architecture

The project uses a monorepo structure managed by `pnpm workspaces`. The frontend is built with **React, Vite, Tailwind CSS, shadcn/ui**, and **Recharts**. The API backend is an **Express 5** application. **PostgreSQL** with **Drizzle ORM** is used for data persistence. **Zod** is used for schema validation, and **Orval** generates API client code from an OpenAPI specification. **Wouter** handles frontend routing.

### Surviving sidebar
- **Command Center** (`/command-center`): Personal planner with five tabs — Overview (Today's Top 3 with daily midnight reset, four stat tiles, open-items snapshot), Direct Reports (collapsible per-person accordions with task lists), Projects (per-project accordions with clickable Active/On Hold/Complete status badge), Life Areas (5 seeded areas — Health & Fitness, Finance, Relationships, Personal Growth, Home & Environment — each with colored left-border accent), and Brain Dump (timestamped entries). Backend tables: `cc_top3`, `cc_direct_reports`, `cc_projects`, `cc_life_areas`, `cc_tasks` (polymorphic via `parent_type` + `parent_id`), `cc_brain_dump`. API mounted under `/api/command-center/*`. Page is self-contained with inline styles (Playfair Display + DM Sans on warm off-white #f4f1ec, charcoal #2a2520 header, burgundy #6b1d2a accent) — does not use shadcn.
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

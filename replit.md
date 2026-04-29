# Dental CEO Dashboard

## Overview

A full-stack dental practice CEO dashboard providing a centralized command center for leaders. It enables management of multiple locations, tracking daily priorities, monitoring team performance, and facilitating organizational communication. The project aims to enhance operational efficiency, improve team accountability, and provide real-time insights for strategic decision-making in dental practices.

## User Preferences

The user prefers clean, read-only views with minimal chrome. Editing controls (add row buttons, delete icons, drag handles, hover-only actions) should be hidden behind an explicit edit toggle on each container. The user prefers one obvious affordance over many to avoid clutter.

## System Architecture

The project uses a monorepo structure managed by `pnpm workspaces`. The frontend is built with **React, Vite, Tailwind CSS, shadcn/ui**, and **Recharts**. The API backend is an **Express 5** application. **PostgreSQL** with **Drizzle ORM** is used for data persistence. **Zod** is used for schema validation, and **Orval** generates API client code from an OpenAPI specification. **Wouter** handles frontend routing.

### UI/UX Decisions
- **Dashboard**: KPI overview cards, Daily Top 3 priorities, EDGE performance charts, recent activity, announcements.
- **EDGE**: CRUD for practice locations including financial and operational metrics.
- **Urgent Dental**: Single-location detail view with inline editing.
- **Ideal Week**: Weekly scorecard with identity/habit tracking. A Google Calendar-style weekly schedule supports drag-to-create, move, and resize time blocks, with half-hour grid lines and a current time indicator. Google Calendar integration overlays live events. Includes Today's Big 3 and This Week's Big 3 (each capped at 3 items), a **Future To-Do** backlog (uncapped, separate from the date- and week-scoped Big 3 lists; persists in `future_todos` table; completed items collapse behind a "Show N completed" toggle), a Reading List, and editable Ritual sidebar sections.
- **Direct Reports**: Card-based view of team members with roles, performance, and contact details. Side panels manage Weekly Report visibility ("Who can see your personal Weekly Reports?" and "View as Me" Access).
- **Announcements**: Color-coded announcements (info, warning, success, urgent) with creation/deletion.
- **My Role**: Role index rendered as an org-chart tree (root tier at top, reports indented below with vertical connector lines). Each card shows the role title, seat holder (or "Open seat" with a dashed avatar), and Business Area / Tier pills. Roles mirror the Practice Org Chart hierarchy (two Owners, Office Manager, then Front Desk / Assistant / Lead Assistant / Associate Dentist / Practice Liaison). Role Detail pages include Purpose & Cultural Alignment, Key Results Area, Daily Operations Protocol (checklists), Decisions to Own, and Playbooks & Procedures. The Key Results Area mirrors the rich pattern from Practice Org Chart seats: each Key Result is a card with an inline-editable title, a deadline-aware progress bar, and a collapsible list of action items. Action items are stored in `role_tasks` (with optional `roleKeyResultId` foreign key — null means "Unfiled"); each has title, assignee (chosen from any team member across all org-chart organizations, with photo), status, and due date, and is created/edited via a dialog. Deleting a Key Result detaches its action items rather than cascading. Features a three-mode toggle: Reference (read-only), Daily (interactive checklists), and Edit (single-buffer form). New Role dialog includes a "Reports to" picker so additions slot into the tree.
- **Playbook Library**: Searchable and filterable global index of "how-to" documents. Playbook Detail includes purpose, steps, decision points, pitfalls, linked roles, and related playbooks, with Reference/Edit toggles.
- **Big Board** (route `/edge-buildout-board`): A four-swimlane Kanban board for tracking construction and launch tasks, organized by Business Area (Location, Financials, People, Operations). Each swimlane has a 6-column workflow (Backlog → Ready → In Progress → Waiting On → Review → Done) with WIP limits. Cards carry title/owner/business area/category/location/target date plus optional category-specific fields (e.g. Permitting & DNR, Signage, Equipment & IT, Vendor Contracts), with drag-and-drop and an activity log. The "Lease & Legal" category has no extra detail fields. The Weekly Review view flags overdue and stalled cards (cards past target, due in ≤7 days, or stuck in "Waiting On" ≥14 days).

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
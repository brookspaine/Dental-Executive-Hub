# Dental CEO Dashboard

## Overview

A full-stack dental practice CEO dashboard built with React + Vite frontend and Express API backend. The dashboard provides a command center for dental practice leaders to manage multiple locations, track daily priorities, monitor team performance, and communicate with their organization.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Routing**: Wouter

## Features

- **Dashboard**: KPI overview cards (revenue, patients, EDGE locations, reports), Daily Top 3 priorities checklist, EDGE performance bar chart with progress bars, recent activity feed, latest announcements
- **EDGE**: CRUD management for EDGE dental practice locations with address, contact info, provider/patient counts, monthly revenue, and status tracking
- **Urgent Dental**: Single-location detail view for the urgent dental care practice with inline editing
- **Ideal Week**: Weekly scorecard with 12 identity/habit items (Bed Before 9:30 PM, Morning Ritual, Morning Journal, Movement or Workout, etc.) displayed as a Mon–Sun checkbox grid with per-row scores and overall weekly progress. Below the scorecard is a **Google Calendar-style** color-coded weekly schedule with absolutely-positioned time blocks that visually span their full duration. Blocks show labels and time ranges (e.g. "9:00AM–12:00PM"). Supports **drag-to-create** (click and drag on empty space), **drag-to-move** (grab a block and drag to reposition across days/times), **drag-to-resize** (grab bottom edge to change duration), and click-to-edit via dialog. Half-hour grid lines provide visual precision. Current time is shown with a red indicator line. Schedule data persists in the database (`schedule_blocks` table) and auto-seeds defaults on first load. Week navigation with prev/next and "This Week" buttons. **Google Calendar integration** overlays live events from connected Google accounts with side-by-side layout when events overlap schedule blocks. Calendar events use cyan pastel styling consistent with other block categories. **Reading List** section with DB-backed book tracking (add, edit, complete, delete). **Ritual sidebar** with 11 editable ritual sections (Morning, Startup, Shutdown, Evening, Deepwork, etc.) with journal prompts and inline editing.
- **Direct Reports**: Card-based view of team members with roles, organization assignment, contact details, performance ratings, and status management
- **Announcements**: Color-coded announcements (info, warning, success, urgent) with create/delete functionality

## Database Schema

- `daily_top3` - Daily priority items with title, description, completion status, priority order, and date
- `organizations` - Dental practice locations with address, contact, provider/patient counts, revenue, status, and category (edge/urgent_dental)
- `ideal_week_rituals` - Ritual definitions with name, frequency (daily/weekly/monthly), and sort order
- `ideal_week_completions` - Per-date completion tracking for each ritual
- `direct_reports` - Team members with role, organization assignment, performance rating, hire date
- `announcements` - Team-wide announcements with type classification
- `activity` - Activity feed tracking events across the system
- `schedule_blocks` - Weekly schedule template blocks with day, start time, duration, label, and category
- `reading_list` - Books/reading items with title, completed status, and sort order
- `ritual_items` - Editable ritual section items with ritual key, content, and sort order
- `journal_responses` - Journal prompt responses with ritual key, prompt, response text, and date

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Design Principles

- **Simplicity first.** Default to clean, read-only views with minimal chrome. Hide editing controls (add row buttons, delete icons, drag handles, hover-only actions) behind an explicit edit toggle on each container. Avoid clutter; prefer one obvious affordance over many.

## Project Structure

- `artifacts/dental-dashboard/` — React + Vite frontend
- `artifacts/api-server/` — Express API server
- `lib/api-spec/` — OpenAPI specification
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod validation schemas
- `lib/db/` — Database schema and client

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

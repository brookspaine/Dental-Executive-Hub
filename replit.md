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

- **Dashboard**: KPI overview cards (revenue, patients, organizations, reports), Daily Top 3 priorities checklist, organization performance bar chart with progress bars, recent activity feed, latest announcements
- **Organizations**: CRUD management for dental practice locations with address, contact info, provider/patient counts, monthly revenue, and status tracking
- **Direct Reports**: Card-based view of team members with roles, organization assignment, contact details, performance ratings, and status management
- **Announcements**: Color-coded announcements (info, warning, success, urgent) with create/delete functionality

## Database Schema

- `daily_top3` - Daily priority items with title, description, completion status, priority order, and date
- `organizations` - Dental practice locations with address, contact, provider/patient counts, revenue, status
- `direct_reports` - Team members with role, organization assignment, performance rating, hire date
- `announcements` - Team-wide announcements with type classification
- `activity` - Activity feed tracking events across the system

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

- `artifacts/dental-dashboard/` — React + Vite frontend
- `artifacts/api-server/` — Express API server
- `lib/api-spec/` — OpenAPI specification
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod validation schemas
- `lib/db/` — Database schema and client

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

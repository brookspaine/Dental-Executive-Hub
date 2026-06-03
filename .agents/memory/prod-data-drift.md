---
name: Prod/dev DB data drift & fixing prod data
description: How seeded rows diverged between dev and prod, and the only sanctioned way to repair production data.
---

# Production vs dev database data can diverge

Dev and production are separate Postgres databases. Seed/data fixes applied in dev do NOT reach prod automatically — they only land when the user **republishes** (publish boots the new build, which runs `artifacts/api-server/src/lib/startupMigrations.ts`).

**Why:** the agent cannot write to production directly (the database skill exposes prod as READ-ONLY; schema is managed by Replit's publish-time diff). So the only sanctioned way to repair prod *data* is an **idempotent step in startupMigrations.ts** that runs at deploy boot, followed by a republish.

**How to apply:**
- If a user reports bad/duplicate data that you can't reproduce in dev, query prod read-only (`executeSql({environment:"production", ...})`) before assuming a code bug.
- Fix via an idempotent block in `startupMigrations.ts` (must be a no-op when already clean, since it runs on every boot in both envs), then tell the user to republish.
- Seeded "shared" rows (e.g. hidden owner direct reports Brooks/Chad in `cc_direct_reports`) were historically inserted per-business, creating duplicates that name-based dedup-on-insert does not remove. Dedup must actively collapse duplicates: pick the survivor as the VISIBLE (`hidden=false`) row when one exists else lowest id (see section below), repoint dependent FKs (e.g. `cc_tasks.owner_direct_report_id`) to the survivor, then delete extras.

## Deduping seeded owners must keep the *real* (visible) row
When collapsing duplicate seeded direct reports (Brooks/Chad in `cc_direct_reports`), the survivor must be the **visible** row (`hidden=false`) when one exists — that is the entry the CEO actually manages under Direct Reports — NOT the lowest id (which is usually the hidden owner-only seed). Order by `(hidden = false) DESC, id ASC`.

**Why:** picking min(id) kept the hidden seed and would delete the user's real direct report. Also: do NOT force seeded owners back to `hidden=true` on every boot — that re-hides a direct report the user intentionally made visible.

**How to verify a deploy actually applied it:** log post-dedup counts (expect exactly 1 per name) so it shows in deployment logs. The migration only runs at deploy boot — a DB rollback or live manual edit after deploy can re-introduce drift, so re-check prod after any rollback.

## "hidden" direct reports suppress the whole section (incl. merged project tasks)
`cc_direct_reports.hidden=true` removes a person from the Direct Reports tab entirely (client filters `!p.hidden`), but they remain selectable as a task owner (the `/direct-reports` list returns hidden rows). Project tasks owned by a direct report merge into that person's accordion with a "from [Project]" badge — but only if the section renders, i.e. the owner is NOT hidden.

**Why:** the seeded owners Brooks/Chad were inserted `hidden=true` (owner-only). Brooks accumulated ~28 delegated project tasks that were invisible because his section never rendered, while visible Chad's tasks showed — that asymmetry was the bug. `hidden` is only ever set by the seed migration (no UI toggles it), so forcing seeded owners visible is safe and won't fight a user choice.

**How to apply:** if delegated/merged tasks "don't show" for one person but do for another, check the owner's `hidden` flag before assuming a query/label bug.

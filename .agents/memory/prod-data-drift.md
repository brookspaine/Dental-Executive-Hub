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
- Seeded "shared" rows (e.g. hidden owner direct reports Brooks/Chad in `cc_direct_reports`) were historically inserted per-business, creating duplicates that name-based dedup-on-insert does not remove. Dedup must actively collapse duplicates: pick survivor = min(id), repoint dependent FKs (e.g. `cc_tasks.owner_direct_report_id`) to the survivor, then delete extras.

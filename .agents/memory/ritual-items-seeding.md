---
name: ritual_items default seeding vs startup migrations
description: Why a startup migration must never INSERT into an empty ritual_items category
---

`GET /ideal-week/ritual-items?category=X` lazily seeds `DEFAULT_RITUAL_ITEMS[X]` **only when that category currently has zero rows** (`items.length === 0`). Ritual bullets are user-editable rows; defaults are a one-time lazy seed, not a code-owned list.

**Rule:** a startup migration that backfills/append into `ritual_items` must gate its INSERT on the category already being non-empty (`WHERE EXISTS (... category=X)`). An UPDATE-to-fill-an-empty-trailing-bullet is naturally safe (no-op on an empty category).

**Why:** if a migration pre-populates a single row into a fresh/empty category, the GET endpoint's `length===0` default-seed never fires, leaving an incomplete checklist (only the migration's row). On a fresh DB the correct sequence is: boot migration is a no-op → first GET seeds the full defaults → next boot appends the extra bullet.

**How to apply:** when adding/altering ritual checklist content for prod parity, prefer UPDATE-fill-trailing-empty; if you must INSERT, guard with `EXISTS(category)` AND `NOT EXISTS(exact label)` for idempotency. Editing `DEFAULT_RITUAL_ITEMS` alone does nothing to already-seeded dev/prod data.

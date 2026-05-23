import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Idempotent one-shot schema migrations applied at server boot.
 *
 * Why this exists: the repo uses `drizzle-kit push` (no migration history),
 * which cannot safely convert an existing `integer` column to `integer[]`
 * without dropping data. These migrations encode column conversions that
 * must run before the new schema is queried.
 *
 * Each step MUST be safe to run repeatedly — guard every change behind a
 * check of the current information_schema state.
 *
 * Concurrency: a Postgres advisory lock serializes concurrent boots (two
 * deploy instances racing), so only one process performs the conversion.
 */
const ADVISORY_LOCK_KEY = 7421930125n;

export async function runStartupMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    try {
      await convertBusinessIdToArray(client, "cc_direct_reports");
      await convertBusinessIdToArray(client, "cc_projects");
      await restoreOrphanedParents(client);
      await migrateLifeAreasToYearlyPlanning(client);
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

/**
 * Recover parent rows for tasks/sections orphaned by an earlier prod
 * schema-push that wiped cc_direct_reports / cc_projects. Idempotent —
 * each insert is skipped if a row with that id already exists. Safe to
 * leave in indefinitely; once parents exist this is a no-op.
 */
async function restoreOrphanedParents(client: PgClient): Promise<void> {
  const drSeed: Array<{ id: number; name: string; businessIds: number[]; sortOrder: number }> = [
    { id: 1, name: "Carrie", businessIds: [1, 2], sortOrder: 0 },
    { id: 2, name: "Myka", businessIds: [1, 2], sortOrder: 1 },
  ];
  const projSeed: Array<{ id: number; name: string; businessIds: number[]; sortOrder: number }> = [
    { id: 1, name: "EDGE", businessIds: [1], sortOrder: 0 },
    { id: 3, name: "Urgent Dental", businessIds: [1, 2], sortOrder: 1 },
  ];

  for (const r of drSeed) {
    const refs = (await client.query(
      `SELECT 1 FROM cc_tasks WHERE parent_type='direct_report' AND parent_id=$1
       UNION ALL
       SELECT 1 FROM cc_task_sections WHERE parent_type='direct_report' AND parent_id=$1
       LIMIT 1`,
      [r.id],
    )) as { rows: unknown[] };
    if (refs.rows.length === 0) continue;
    const ins = await client.query(
      `INSERT INTO cc_direct_reports (id, business_ids, name, sort_order, collapsed)
       VALUES ($1, $2::int[], $3, $4, false)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.businessIds, r.name, r.sortOrder],
    );
    if ((ins as { rowCount?: number }).rowCount) {
      logger.info({ id: r.id, name: r.name }, "startup migration: restored orphaned direct report");
    }
  }

  // Ensure the `hidden` column exists. Idempotent. A "hidden" direct
  // report is selectable as an owner in task pickers but not rendered
  // as a section in the Direct Reports list.
  await client.query(
    `ALTER TABLE cc_direct_reports
       ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false`,
  );

  // Seed Brooks + Chad shared across both businesses so they appear as
  // owner options on every task (direct-report + project) in both apps.
  // Both are marked hidden so they don't render as sections in the list.
  // Idempotent on name match.
  for (const name of ["Brooks", "Chad"] as const) {
    const ins = await client.query(
      `INSERT INTO cc_direct_reports (business_ids, name, sort_order, collapsed, hidden)
       SELECT ARRAY[1,2]::int[], $1, 99, false, true
       WHERE NOT EXISTS (SELECT 1 FROM cc_direct_reports WHERE name=$1)`,
      [name],
    );
    if ((ins as { rowCount?: number }).rowCount) {
      logger.info({ name }, "startup migration: seeded hidden owner direct report");
    }
  }
  // Force Brooks + Chad to hidden=true even if they pre-existed without
  // the flag (e.g. inserted by an earlier deploy before the flag landed).
  await client.query(
    `UPDATE cc_direct_reports SET hidden=true WHERE name IN ('Brooks','Chad') AND hidden=false`,
  );

  for (const p of projSeed) {
    const refs = (await client.query(
      `SELECT 1 FROM cc_tasks WHERE parent_type='project' AND parent_id=$1
       UNION ALL
       SELECT 1 FROM cc_task_sections WHERE parent_type='project' AND parent_id=$1
       LIMIT 1`,
      [p.id],
    )) as { rows: unknown[] };
    if (refs.rows.length === 0) continue;
    const ins = await client.query(
      `INSERT INTO cc_projects (id, business_ids, name, status, sort_order, collapsed)
       VALUES ($1, $2::int[], $3, 'active', $4, false)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.businessIds, p.name, p.sortOrder],
    );
    if ((ins as { rowCount?: number }).rowCount) {
      logger.info({ id: p.id, name: p.name }, "startup migration: restored orphaned project");
    }
  }

  // Keep auto-increment sequences ahead of any restored ids so new
  // inserts don't collide.
  await client.query(
    `SELECT setval('cc_direct_reports_id_seq',
       GREATEST((SELECT COALESCE(MAX(id), 1) FROM cc_direct_reports), 1))`,
  );
  await client.query(
    `SELECT setval('cc_projects_id_seq',
       GREATEST((SELECT COALESCE(MAX(id), 1) FROM cc_projects), 1))`,
  );
}

type PgClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

/* -------------------------------------------------------------------------- */
/* Life Areas <- Living Your Best Year Ever migration                         */
/* -------------------------------------------------------------------------- */

/**
 * Brings each business's `cc_life_areas` set into alignment with the 8
 * categories from "Living Your Best Year Ever":
 *   Health / Fitness, Business, Mindset, Family, Legacy Wealth, Faith,
 *   Lifestyle and Travel, Relationships.
 *
 * - Adds new structured columns (identity/why/how_i_preserve/feels_like) and
 *   the cc_life_area_goals table if missing.
 * - For each business, ensures the 8 areas exist (renaming "Health & Fitness"
 *   → "Health / Fitness", keeping "Relationships" as-is) and populates the
 *   About fields + Goals from yearly_planning_sections.content if the area is
 *   still empty. User edits to those fields are preserved across boots.
 * - Removes the 3 legacy seeded areas that have no LYBYE counterpart
 *   (Finance, Personal Growth, Home & Environment), but only if they have
 *   zero tasks/sections beneath them, so no data is lost.
 *
 * Idempotent — every step is guarded so it's a no-op once applied.
 */
async function migrateLifeAreasToYearlyPlanning(client: PgClient): Promise<void> {
  // 1. Add new columns + table if missing.
  await client.query(`
    ALTER TABLE cc_life_areas
      ADD COLUMN IF NOT EXISTS identity        text[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS why             text[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS how_i_preserve  text[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS feels_like      text[] NOT NULL DEFAULT '{}'::text[]
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS cc_life_area_goals (
      id            SERIAL PRIMARY KEY,
      life_area_id  INTEGER NOT NULL REFERENCES cc_life_areas(id) ON DELETE CASCADE,
      goal_type     TEXT NOT NULL,
      text          TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'not_started',
      next_steps    TEXT NOT NULL DEFAULT '',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS cc_life_area_goals_area_idx
      ON cc_life_area_goals (life_area_id, goal_type, sort_order)
  `);

  // 2. Canonical 8 LYBYE sections, in display order.
  const CANONICAL = [
    { key: "health-fitness",    title: "Health / Fitness",   accent: "#7fb069", legacyNames: ["health & fitness", "health/fitness", "health and fitness"] },
    { key: "business",          title: "Business",           accent: "#4a6fa5", legacyNames: [] },
    { key: "mindset",           title: "Mindset",            accent: "#b08968", legacyNames: [] },
    { key: "family",            title: "Family",             accent: "#c97064", legacyNames: [] },
    { key: "legacy-wealth",     title: "Legacy Wealth",      accent: "#3a7d5e", legacyNames: ["finance"] },
    { key: "faith",             title: "Faith",              accent: "#8a7a9a", legacyNames: [] },
    { key: "lifestyle-travel",  title: "Lifestyle and Travel", accent: "#d6a45b", legacyNames: [] },
    { key: "relationships",     title: "Relationships",      accent: "#c97064", legacyNames: [] },
  ] as const;
  // Note: "Finance" is mapped to "Legacy Wealth" by name on first boot only
  // when there are zero life-area goals on it (so we don't trample edits).

  // 3. Pull stored LYBYE content (keyed by section_key) for seed payloads.
  const ypRes = (await client.query(
    `SELECT section_key, content FROM yearly_planning_sections`,
  )) as { rows: Array<{ section_key: string; content: string }> };
  const yearlyByKey = new Map<string, YearlyContent>();
  for (const r of ypRes.rows) {
    try {
      yearlyByKey.set(r.section_key, JSON.parse(r.content) as YearlyContent);
    } catch {
      // Skip rows with un-parseable content.
    }
  }

  // 4. Find every business that has any cc_life_areas row so we can seed
  // each one independently. (Currently 1 = CEO Dashboard, 2 = Urgent Dental.)
  const bizRes = (await client.query(
    `SELECT DISTINCT business_id FROM cc_life_areas ORDER BY business_id`,
  )) as { rows: Array<{ business_id: number }> };
  const businessIds = bizRes.rows.map((r) => r.business_id);
  // Always ensure both known businesses are processed, even if cc_life_areas
  // is empty (fresh install / wiped DB).
  for (const id of [1, 2]) if (!businessIds.includes(id)) businessIds.push(id);

  for (const businessId of businessIds) {
    // Load current life areas for this business once.
    const existingRes = (await client.query(
      `SELECT id, name, identity, why, how_i_preserve, feels_like
       FROM cc_life_areas WHERE business_id = $1`,
      [businessId],
    )) as { rows: Array<{ id: number; name: string; identity: string[]; why: string[]; how_i_preserve: string[]; feels_like: string[] }> };
    const byLowerName = new Map<string, (typeof existingRes.rows)[number]>();
    for (const row of existingRes.rows) byLowerName.set(row.name.trim().toLowerCase(), row);

    for (let i = 0; i < CANONICAL.length; i++) {
      const def = CANONICAL[i];
      const seed = yearlyByKey.get(def.key) ?? {};
      // Try canonical name, then any legacy aliases.
      let row = byLowerName.get(def.title.toLowerCase());
      if (!row) {
        for (const alias of def.legacyNames) {
          const m = byLowerName.get(alias);
          if (m) {
            row = m;
            break;
          }
        }
      }
      if (row) {
        // Rename + reorder + reaccent. Only fill About fields if still empty.
        await client.query(
          `UPDATE cc_life_areas
             SET name = $1,
                 sort_order = $2,
                 accent_color = $3,
                 identity = CASE WHEN cardinality(identity) = 0 THEN $4::text[] ELSE identity END,
                 why = CASE WHEN cardinality(why) = 0 THEN $5::text[] ELSE why END,
                 how_i_preserve = CASE WHEN cardinality(how_i_preserve) = 0 THEN $6::text[] ELSE how_i_preserve END,
                 feels_like = CASE WHEN cardinality(feels_like) = 0 THEN $7::text[] ELSE feels_like END
           WHERE id = $8`,
          [
            def.title,
            i,
            def.accent,
            seed.identity ?? [],
            seed.why ?? [],
            seed.howIPreserve ?? [],
            seed.feelsLike ?? [],
            row.id,
          ],
        );
        await seedGoalsIfEmpty(client, row.id, seed);
      } else {
        // Insert fresh.
        const insRes = (await client.query(
          `INSERT INTO cc_life_areas
             (business_id, name, accent_color, sort_order, identity, why, how_i_preserve, feels_like)
           VALUES ($1, $2, $3, $4, $5::text[], $6::text[], $7::text[], $8::text[])
           RETURNING id`,
          [
            businessId,
            def.title,
            def.accent,
            i,
            seed.identity ?? [],
            seed.why ?? [],
            seed.howIPreserve ?? [],
            seed.feelsLike ?? [],
          ],
        )) as { rows: Array<{ id: number }> };
        const newId = insRes.rows[0].id;
        await seedGoalsIfEmpty(client, newId, seed);
        logger.info(
          { businessId, name: def.title },
          "startup migration: seeded life area from LYBYE",
        );
      }
    }

    // 5. Delete only the 3 originally-seeded legacy areas that have no
    // canonical home AND have no tasks/sections/goals attached. We match
    // on an explicit allow-list (not "everything non-canonical") so any
    // user-renamed or custom area is never auto-deleted, even if empty.
    const LEGACY_REMOVABLE = new Set([
      "personal growth",
      "home & environment",
      // Note: "Finance" is handled by the rename path in step 4 above (it maps
      // into "Legacy Wealth"), so it never reaches this cleanup step.
    ]);
    const canonicalNames = new Set(CANONICAL.map((c) => c.title.toLowerCase()));
    for (const row of existingRes.rows) {
      const lower = row.name.trim().toLowerCase();
      if (canonicalNames.has(lower)) continue;
      if (!LEGACY_REMOVABLE.has(lower)) continue;
      // Skip rows that were renamed into a canonical name in step 4 above.
      // (existingRes was loaded before the UPDATE, so re-check by id.)
      const stillRes = (await client.query(
        `SELECT name FROM cc_life_areas WHERE id = $1`,
        [row.id],
      )) as { rows: Array<{ name: string }> };
      if (
        stillRes.rows.length === 0 ||
        canonicalNames.has(stillRes.rows[0].name.trim().toLowerCase())
      ) {
        continue;
      }
      const refs = (await client.query(
        `SELECT 1 FROM cc_tasks WHERE parent_type='life_area' AND parent_id=$1
         UNION ALL
         SELECT 1 FROM cc_task_sections WHERE parent_type='life_area' AND parent_id=$1
         UNION ALL
         SELECT 1 FROM cc_life_area_goals WHERE life_area_id=$1
         LIMIT 1`,
        [row.id],
      )) as { rows: unknown[] };
      if (refs.rows.length > 0) {
        logger.info(
          { id: row.id, name: row.name },
          "startup migration: keeping legacy life area (has tasks/goals)",
        );
        continue;
      }
      await client.query(`DELETE FROM cc_life_areas WHERE id = $1`, [row.id]);
      logger.info(
        { id: row.id, name: row.name },
        "startup migration: removed empty legacy life area",
      );
    }
  }
}

type YearlyGoal = { text?: string; status?: string; nextSteps?: string };
type YearlyContent = {
  identity?: string[];
  why?: string[];
  howIPreserve?: string[];
  feelsLike?: string[];
  outcomeGoals?: YearlyGoal[];
  performanceGoals?: YearlyGoal[];
  processContinue?: YearlyGoal[];
  processMoreConsistent?: YearlyGoal[];
  processBegin?: YearlyGoal[];
};

/** Map LYBYE status strings → internal 4-state vocabulary. */
function normalizeStatus(s: string | undefined): string {
  const v = (s ?? "").trim().toLowerCase();
  if (v === "in progress" || v === "in_progress") return "in_progress";
  if (v === "launched") return "launched";
  if (v === "consistent/achieved" || v === "achieved" || v === "consistent")
    return "achieved";
  return "not_started";
}

async function seedGoalsIfEmpty(
  client: PgClient,
  lifeAreaId: number,
  seed: YearlyContent,
): Promise<void> {
  const existing = (await client.query(
    `SELECT 1 FROM cc_life_area_goals WHERE life_area_id = $1 LIMIT 1`,
    [lifeAreaId],
  )) as { rows: unknown[] };
  if (existing.rows.length > 0) return; // Preserve user edits.
  const buckets: Array<[string, YearlyGoal[] | undefined]> = [
    ["outcome", seed.outcomeGoals],
    ["performance", seed.performanceGoals],
    ["process_continue", seed.processContinue],
    ["process_more_consistent", seed.processMoreConsistent],
    ["process_begin", seed.processBegin],
  ];
  for (const [goalType, list] of buckets) {
    if (!list?.length) continue;
    let i = 0;
    for (const g of list) {
      const text = (g.text ?? "").trim();
      if (!text) continue;
      await client.query(
        `INSERT INTO cc_life_area_goals
           (life_area_id, goal_type, text, status, next_steps, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [lifeAreaId, goalType, text, normalizeStatus(g.status), g.nextSteps ?? "", i++],
      );
    }
  }
}

/**
 * Convert `<table>.business_id INTEGER` → `<table>.business_ids INTEGER[]`,
 * backfilling each row's array from the old single value. No-op once the
 * conversion is complete (business_id dropped, business_ids present).
 *
 * Handles partial-state recovery: if a prior run added business_ids but
 * crashed before dropping business_id, this run will (re-)backfill any
 * empty arrays from business_id before dropping the old column.
 */
async function convertBusinessIdToArray(
  client: PgClient,
  table: string,
): Promise<void> {
  const colsRes = (await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = $1 AND column_name IN ('business_id', 'business_ids')`,
    [table],
  )) as { rows: Array<{ column_name: string }> };
  const cols = new Set(colsRes.rows.map((r) => r.column_name));

  if (cols.has("business_ids") && !cols.has("business_id")) return;

  if (!cols.has("business_id")) {
    logger.warn(
      { table },
      "startup migration: table has neither business_id nor business_ids — skipping",
    );
    return;
  }

  logger.info({ table }, "startup migration: converting business_id → business_ids[]");
  await client.query("BEGIN");
  try {
    if (!cols.has("business_ids")) {
      await client.query(
        `ALTER TABLE ${table} ADD COLUMN business_ids INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[]`,
      );
    }
    // Safe-backfill: covers both the fresh-add case and any partial-state
    // rows from a prior aborted attempt. Only rewrites rows whose array
    // is empty, so already-correct multi-business tags are preserved.
    await client.query(
      `UPDATE ${table}
         SET business_ids = ARRAY[business_id]
       WHERE business_ids IS NULL OR cardinality(business_ids) = 0`,
    );
    if (!cols.has("business_ids")) {
      await client.query(`ALTER TABLE ${table} ALTER COLUMN business_ids DROP DEFAULT`);
    }
    await client.query(`ALTER TABLE ${table} DROP COLUMN business_id`);
    await client.query("COMMIT");
    logger.info({ table }, "startup migration: conversion complete");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

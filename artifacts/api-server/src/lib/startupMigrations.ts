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

  // Seed Brooks (CEO Dashboard only — business 1; pinned above others via sort_order=-1).
  // Idempotent: only inserts if no direct report named 'Brooks' exists.
  const brooksIns = await client.query(
    `INSERT INTO cc_direct_reports (business_ids, name, sort_order, collapsed)
     SELECT ARRAY[1]::int[], 'Brooks', -1, false
     WHERE NOT EXISTS (SELECT 1 FROM cc_direct_reports WHERE name='Brooks')`,
  );
  if ((brooksIns as { rowCount?: number }).rowCount) {
    logger.info("startup migration: seeded Brooks direct report");
  }
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

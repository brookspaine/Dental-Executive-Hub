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
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
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

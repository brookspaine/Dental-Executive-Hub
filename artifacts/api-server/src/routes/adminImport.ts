import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router: IRouter = Router();

const SNAPSHOT_TABLES = [
  "wisdom_quotes",
  "ritual_items",
  "schedule_blocks",
  "reading_list",
  "activity",
  "journal_responses",
  "vendor_passwords",
  "ideal_week_rituals",
  "seat_tasks",
  "org_chart_seats",
  "yearly_planning_sections",
  "organizations",
  "seat_key_results",
  "weekly_top3",
  "direct_reports",
  "announcements",
  "daily_top3",
  "ideal_week_completions",
  "morning_ritual_completions",
  "weekly_review_entries",
] as const;

function findSnapshotPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/api-server/data-snapshot.json"),
    path.resolve(process.cwd(), "data-snapshot.json"),
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../data-snapshot.json",
    ),
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../data-snapshot.json",
    ),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const handleImport = async (req: import("express").Request, res: import("express").Response) => {
  const expected = process.env["ADMIN_IMPORT_TOKEN"];
  const provided =
    req.header("x-admin-token") ||
    (typeof req.query["token"] === "string" ? req.query["token"] : undefined);
  if (!expected || !provided || provided !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const snapshotPath = findSnapshotPath();
  if (!snapshotPath) {
    return res.status(500).json({ error: "snapshot file not found" });
  }

  let snapshot: Record<string, Array<Record<string, unknown>>>;
  try {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  } catch (e) {
    return res
      .status(500)
      .json({ error: "failed to parse snapshot", detail: String(e) });
  }

  const summary: Record<string, number | string> = {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Make all FK constraints deferrable for this transaction so we can
    // delete + insert in any order without violating FKs mid-transaction.
    const fkRes = await client.query(`
      SELECT conrelid::regclass::text AS table_name, conname
      FROM pg_constraint
      WHERE contype = 'f'
        AND connamespace = 'public'::regnamespace
    `);
    for (const fk of fkRes.rows) {
      await client.query(
        `ALTER TABLE ${fk.table_name} ALTER CONSTRAINT "${fk.conname}" DEFERRABLE INITIALLY DEFERRED`,
      );
    }
    await client.query("SET CONSTRAINTS ALL DEFERRED");

    for (const table of SNAPSHOT_TABLES) {
      const rows = snapshot[table];
      if (!Array.isArray(rows)) {
        summary[table] = "skipped (not in snapshot)";
        continue;
      }
      await client.query(`DELETE FROM "${table}"`);

      if (rows.length === 0) {
        summary[table] = 0;
        continue;
      }

      const colSet = new Set<string>();
      for (const r of rows) for (const k of Object.keys(r)) colSet.add(k);
      const cols = Array.from(colSet);
      const colList = cols.map((c) => `"${c}"`).join(", ");

      for (const row of rows) {
        const values = cols.map((c) => {
          const v = row[c];
          if (v === undefined) return null;
          // JSON columns: pass as string for jsonb
          if (v !== null && typeof v === "object") return JSON.stringify(v);
          return v;
        });
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
          values,
        );
      }
      summary[table] = rows.length;
    }

    await client.query("SET session_replication_role = 'origin'");

    // Reset serial sequences
    const seqRes = await client.query(`
      SELECT 'SELECT setval(pg_get_serial_sequence(''' || quote_ident(table_name) || ''', ''' || column_name || '''),
        GREATEST((SELECT COALESCE(MAX(' || quote_ident(column_name) || '), 0) FROM ' || quote_ident(table_name) || '), 1))' AS stmt
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_default LIKE 'nextval(%'
    `);
    for (const r of seqRes.rows) {
      try {
        await client.query(r.stmt);
      } catch {
        // ignore
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    return res
      .status(500)
      .json({ error: "import failed", detail: String(e), summary });
  } finally {
    client.release();
  }

  return res.json({ ok: true, summary });
};

router.post("/admin/import-snapshot", handleImport);
router.get("/admin/import-snapshot", handleImport);

export default router;

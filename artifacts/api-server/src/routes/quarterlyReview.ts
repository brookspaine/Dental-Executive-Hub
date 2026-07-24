import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, quarterlyReviewEntriesTable } from "@workspace/db";

const router: IRouter = Router();

/* Fixed reflect prompts plus dynamic per-objective score keys (e.g.
   "score_123"), so field keys are validated by shape rather than an allowlist. */
const FIELD_KEY_RE = /^[a-zA-Z0-9_]{1,64}$/;

function parseYearQuarter(
  yearStr: string,
  quarterStr: string,
): { year: number; quarter: number } | null {
  const year = Number(yearStr);
  const quarter = Number(quarterStr);
  if (!Number.isInteger(year) || year < 1970 || year > 9999) return null;
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) return null;
  return { year, quarter };
}

router.get("/quarterly-review/:year/:quarter", async (req, res): Promise<void> => {
  const parsed = parseYearQuarter(req.params.year, req.params.quarter);
  if (!parsed) {
    res.status(400).json({ error: "Invalid year or quarter" });
    return;
  }
  const rows = await db
    .select()
    .from(quarterlyReviewEntriesTable)
    .where(
      and(
        eq(quarterlyReviewEntriesTable.year, parsed.year),
        eq(quarterlyReviewEntriesTable.quarter, parsed.quarter),
      ),
    );
  res.json(rows);
});

router.put(
  "/quarterly-review/:year/:quarter/:fieldKey",
  async (req, res): Promise<void> => {
    const parsed = parseYearQuarter(req.params.year, req.params.quarter);
    if (!parsed) {
      res.status(400).json({ error: "Invalid year or quarter" });
      return;
    }
    const fieldKey = String(req.params.fieldKey);
    if (!FIELD_KEY_RE.test(fieldKey)) {
      res.status(400).json({ error: "Invalid field key" });
      return;
    }
    const content =
      typeof req.body?.content === "string" ? req.body.content : "";

    const existing = await db
      .select()
      .from(quarterlyReviewEntriesTable)
      .where(
        and(
          eq(quarterlyReviewEntriesTable.year, parsed.year),
          eq(quarterlyReviewEntriesTable.quarter, parsed.quarter),
          eq(quarterlyReviewEntriesTable.fieldKey, fieldKey),
        ),
      );

    if (existing.length === 0) {
      const [row] = await db
        .insert(quarterlyReviewEntriesTable)
        .values({
          year: parsed.year,
          quarter: parsed.quarter,
          fieldKey,
          content,
        })
        .returning();
      res.json(row);
      return;
    }

    const [row] = await db
      .update(quarterlyReviewEntriesTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(quarterlyReviewEntriesTable.id, existing[0].id))
      .returning();
    res.json(row);
  },
);

export default router;

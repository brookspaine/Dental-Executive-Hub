import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, monthlyReviewEntriesTable } from "@workspace/db";

const router: IRouter = Router();

/* Fixed personal-finance + light personal-assessment field keys, validated by
   shape rather than an allowlist (mirrors quarterlyReview.ts). */
const FIELD_KEY_RE = /^[a-zA-Z0-9_]{1,64}$/;

function parseYearMonth(
  yearStr: string,
  monthStr: string,
): { year: number; month: number } | null {
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || year < 1970 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

router.get("/monthly-review/:year/:month", async (req, res): Promise<void> => {
  const parsed = parseYearMonth(req.params.year, req.params.month);
  if (!parsed) {
    res.status(400).json({ error: "Invalid year or month" });
    return;
  }
  const rows = await db
    .select()
    .from(monthlyReviewEntriesTable)
    .where(
      and(
        eq(monthlyReviewEntriesTable.year, parsed.year),
        eq(monthlyReviewEntriesTable.month, parsed.month),
      ),
    );
  res.json(rows);
});

router.put(
  "/monthly-review/:year/:month/:fieldKey",
  async (req, res): Promise<void> => {
    const parsed = parseYearMonth(req.params.year, req.params.month);
    if (!parsed) {
      res.status(400).json({ error: "Invalid year or month" });
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
      .from(monthlyReviewEntriesTable)
      .where(
        and(
          eq(monthlyReviewEntriesTable.year, parsed.year),
          eq(monthlyReviewEntriesTable.month, parsed.month),
          eq(monthlyReviewEntriesTable.fieldKey, fieldKey),
        ),
      );

    if (existing.length === 0) {
      const [row] = await db
        .insert(monthlyReviewEntriesTable)
        .values({
          year: parsed.year,
          month: parsed.month,
          fieldKey,
          content,
        })
        .returning();
      res.json(row);
      return;
    }

    const [row] = await db
      .update(monthlyReviewEntriesTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(monthlyReviewEntriesTable.id, existing[0].id))
      .returning();
    res.json(row);
  },
);

export default router;

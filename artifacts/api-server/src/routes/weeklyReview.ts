import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, weeklyReviewEntriesTable } from "@workspace/db";

const router: IRouter = Router();

const VALID_FIELD_KEYS = new Set<string>([
  "wins",
  "losses",
  "drains",
  "fixes",
  "ahHas",
  "gratefulFor",
  "gratefulLoss",
  "learned",
  "bannerGoals",
  "quarterlyBig3",
  "weeklyBig3",
  "topEvents",
  "habits",
  "studying",
]);

function parseYearWeek(yearStr: string, weekStr: string): { year: number; week: number } | null {
  const year = Number(yearStr);
  const week = Number(weekStr);
  if (!Number.isInteger(year) || year < 1970 || year > 9999) return null;
  if (!Number.isInteger(week) || week < 1 || week > 53) return null;
  return { year, week };
}

router.get("/weekly-review/:year/:week", async (req, res): Promise<void> => {
  const parsed = parseYearWeek(req.params.year, req.params.week);
  if (!parsed) {
    res.status(400).json({ error: "Invalid year or week" });
    return;
  }
  const rows = await db
    .select()
    .from(weeklyReviewEntriesTable)
    .where(
      and(
        eq(weeklyReviewEntriesTable.year, parsed.year),
        eq(weeklyReviewEntriesTable.week, parsed.week),
      ),
    );
  res.json(rows);
});

router.put(
  "/weekly-review/:year/:week/:fieldKey",
  async (req, res): Promise<void> => {
    const parsed = parseYearWeek(req.params.year, req.params.week);
    if (!parsed) {
      res.status(400).json({ error: "Invalid year or week" });
      return;
    }
    const fieldKey = String(req.params.fieldKey);
    if (!VALID_FIELD_KEYS.has(fieldKey)) {
      res.status(400).json({ error: "Invalid field key" });
      return;
    }
    const content =
      typeof req.body?.content === "string" ? req.body.content : "";

    const existing = await db
      .select()
      .from(weeklyReviewEntriesTable)
      .where(
        and(
          eq(weeklyReviewEntriesTable.year, parsed.year),
          eq(weeklyReviewEntriesTable.week, parsed.week),
          eq(weeklyReviewEntriesTable.fieldKey, fieldKey),
        ),
      );

    if (existing.length === 0) {
      const [row] = await db
        .insert(weeklyReviewEntriesTable)
        .values({
          year: parsed.year,
          week: parsed.week,
          fieldKey,
          content,
        })
        .returning();
      res.json(row);
      return;
    }

    const [row] = await db
      .update(weeklyReviewEntriesTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(weeklyReviewEntriesTable.id, existing[0].id))
      .returning();
    res.json(row);
  },
);

export default router;

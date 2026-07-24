import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, reviewCompletionsTable } from "@workspace/db";

const router: IRouter = Router();

const KINDS = new Set<string>(["weekly", "quarterly"]);

/* Returns every review completion. The client computes due-ness and streak
   from these rows using its own ISO-week helpers, so week math lives in one
   place (the frontend) — see the review reminder modal. */
router.get("/reviews/status", async (_req, res): Promise<void> => {
  const rows = await db.select().from(reviewCompletionsTable);
  res.json(
    rows.map((r) => ({
      kind: r.kind,
      year: r.year,
      period: r.period,
      completedAt: r.completedAt,
    })),
  );
});

/* Marks a review complete for a period. Idempotent on (kind, year, period). */
router.post("/reviews/:kind/complete", async (req, res): Promise<void> => {
  const kind = String(req.params.kind);
  if (!KINDS.has(kind)) {
    res.status(400).json({ error: "Invalid kind" });
    return;
  }
  const year = Number(req.body?.year);
  const period = Number(req.body?.period);
  const maxPeriod = kind === "weekly" ? 53 : 4;
  if (
    !Number.isInteger(year) ||
    year < 1970 ||
    year > 9999 ||
    !Number.isInteger(period) ||
    period < 1 ||
    period > maxPeriod
  ) {
    res.status(400).json({ error: "Invalid year or period" });
    return;
  }
  const existing = await db
    .select()
    .from(reviewCompletionsTable)
    .where(
      and(
        eq(reviewCompletionsTable.kind, kind),
        eq(reviewCompletionsTable.year, year),
        eq(reviewCompletionsTable.period, period),
      ),
    );
  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }
  const [row] = await db
    .insert(reviewCompletionsTable)
    .values({ kind, year, period })
    .returning();
  res.json(row);
});

export default router;

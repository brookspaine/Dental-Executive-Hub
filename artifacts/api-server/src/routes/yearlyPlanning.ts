import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, yearlyPlanningSectionsTable } from "@workspace/db";

const router: IRouter = Router();

const VALID_KEYS = new Set([
  "health-fitness",
  "business",
  "mindset",
  "family",
  "legacy-wealth",
  "faith",
  "lifestyle-travel",
  "relationships",
]);

router.get("/yearly-planning", async (_req, res): Promise<void> => {
  const rows = await db.select().from(yearlyPlanningSectionsTable);
  res.json(rows);
});

router.put("/yearly-planning/:key", async (req, res): Promise<void> => {
  const key = String(req.params.key);
  if (!VALID_KEYS.has(key)) {
    res.status(400).json({ error: "Invalid section key" });
    return;
  }
  const content = typeof req.body?.content === "string" ? req.body.content : "";

  const existing = await db
    .select()
    .from(yearlyPlanningSectionsTable)
    .where(eq(yearlyPlanningSectionsTable.sectionKey, key));

  if (existing.length === 0) {
    const [row] = await db
      .insert(yearlyPlanningSectionsTable)
      .values({ sectionKey: key, content })
      .returning();
    res.json(row);
    return;
  }

  const [row] = await db
    .update(yearlyPlanningSectionsTable)
    .set({ content, updatedAt: new Date() })
    .where(eq(yearlyPlanningSectionsTable.sectionKey, key))
    .returning();
  res.json(row);
});

export default router;

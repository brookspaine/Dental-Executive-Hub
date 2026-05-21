import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/businesses", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(businessesTable)
    .orderBy(asc(businessesTable.sortOrder), asc(businessesTable.id));
  res.json(rows);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, dailyTop3Table } from "@workspace/db";
import {
  CreateDailyTop3Body,
  UpdateDailyTop3Params,
  UpdateDailyTop3Body,
  DeleteDailyTop3Params,
  ListDailyTop3Response,
  UpdateDailyTop3Response,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/daily-top3", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(dailyTop3Table)
    .orderBy(dailyTop3Table.priority);
  const mapped = items.map((i) => ({
    ...i,
    description: i.description ?? undefined,
  }));
  res.json(ListDailyTop3Response.parse(mapped));
});

router.post("/daily-top3", async (req, res): Promise<void> => {
  const parsed = CreateDailyTop3Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const [item] = await db
    .insert(dailyTop3Table)
    .values({ ...parsed.data, date: today })
    .returning();

  res
    .status(201)
    .json(
      UpdateDailyTop3Response.parse({
        ...item,
        description: item.description ?? undefined,
      })
    );
});

router.patch("/daily-top3/:id", async (req, res): Promise<void> => {
  const params = UpdateDailyTop3Params.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDailyTop3Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(dailyTop3Table)
    .set(parsed.data)
    .where(eq(dailyTop3Table.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(
    UpdateDailyTop3Response.parse({
      ...item,
      description: item.description ?? undefined,
    })
  );
});

router.delete("/daily-top3/:id", async (req, res): Promise<void> => {
  const params = DeleteDailyTop3Params.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(dailyTop3Table)
    .where(eq(dailyTop3Table.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

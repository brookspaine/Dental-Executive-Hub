import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, wisdomQuotesTable } from "@workspace/db";
import {
  CreateWisdomQuoteBody,
  DeleteWisdomQuoteParams,
  ListWisdomQuotesResponse,
  ListWisdomQuotesResponseItem,
  GetTodayWisdomQuotesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function dayHash(dateStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickDailyThree<T>(pool: T[], dateStr: string): T[] {
  if (pool.length === 0) return [];
  if (pool.length <= 3) return pool;
  const indices = new Set<number>();
  let seed = dayHash(dateStr);
  while (indices.size < 3) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    indices.add(seed % pool.length);
  }
  return [...indices].map((i) => pool[i]);
}

router.get("/wisdom-quotes", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(wisdomQuotesTable)
    .orderBy(asc(wisdomQuotesTable.id));
  const mapped = items.map((q) => ({ ...q, author: q.author ?? undefined }));
  res.json(ListWisdomQuotesResponse.parse(mapped));
});

router.get("/wisdom-quotes/today", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(wisdomQuotesTable)
    .orderBy(asc(wisdomQuotesTable.id));
  const today = new Date().toISOString().split("T")[0];
  const picked = pickDailyThree(items, today).map((q) => ({
    ...q,
    author: q.author ?? undefined,
  }));
  res.json(GetTodayWisdomQuotesResponse.parse(picked));
});

router.post("/wisdom-quotes", async (req, res): Promise<void> => {
  const parsed = CreateWisdomQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .insert(wisdomQuotesTable)
    .values(parsed.data)
    .returning();
  res
    .status(201)
    .json(
      ListWisdomQuotesResponseItem.parse({
        ...item,
        author: item.author ?? undefined,
      })
    );
});

router.delete("/wisdom-quotes/:id", async (req, res): Promise<void> => {
  const params = DeleteWisdomQuoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .delete(wisdomQuotesTable)
    .where(eq(wisdomQuotesTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

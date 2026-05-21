import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, futureTodosTable } from "@workspace/db";
import {
  CreateFutureTodoBody,
  UpdateFutureTodoBody,
  UpdateFutureTodoParams,
  DeleteFutureTodoParams,
  ListFutureTodosResponse,
  UpdateFutureTodoResponse,
} from "@workspace/api-zod";
import { getBusinessId } from "../lib/businessScope";

/**
 * Mounted twice (see routes/index.ts): once at the API root with header-based
 * business scoping, and once under `/urgent-dental` with a hardcoded business.
 */
const router: IRouter = Router();

router.get("/future-todos", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const items = await db
    .select()
    .from(futureTodosTable)
    .where(eq(futureTodosTable.businessId, businessId))
    .orderBy(futureTodosTable.sortOrder, futureTodosTable.id);
  res.json(ListFutureTodosResponse.parse(items));
});

router.post("/future-todos", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const parsed = CreateFutureTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(futureTodosTable)
    .values({
      title: parsed.data.title,
      sortOrder: parsed.data.sortOrder ?? 0,
      businessId,
    })
    .returning();

  res.status(201).json(UpdateFutureTodoResponse.parse(item));
});

router.patch("/future-todos/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const params = UpdateFutureTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFutureTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(futureTodosTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(eq(futureTodosTable.id, params.data.id), eq(futureTodosTable.businessId, businessId)),
    )
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(UpdateFutureTodoResponse.parse(item));
});

router.delete("/future-todos/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const params = DeleteFutureTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(futureTodosTable)
    .where(
      and(eq(futureTodosTable.id, params.data.id), eq(futureTodosTable.businessId, businessId)),
    )
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

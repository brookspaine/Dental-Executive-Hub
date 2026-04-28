import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, futureTodosTable } from "@workspace/db";
import {
  CreateFutureTodoBody,
  UpdateFutureTodoBody,
  UpdateFutureTodoParams,
  DeleteFutureTodoParams,
  ListFutureTodosResponse,
  UpdateFutureTodoResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/future-todos", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(futureTodosTable)
    .orderBy(futureTodosTable.sortOrder, futureTodosTable.id);
  res.json(ListFutureTodosResponse.parse(items));
});

router.post("/future-todos", async (req, res): Promise<void> => {
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
    })
    .returning();

  res.status(201).json(UpdateFutureTodoResponse.parse(item));
});

router.patch("/future-todos/:id", async (req, res): Promise<void> => {
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
    .where(eq(futureTodosTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(UpdateFutureTodoResponse.parse(item));
});

router.delete("/future-todos/:id", async (req, res): Promise<void> => {
  const params = DeleteFutureTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(futureTodosTable)
    .where(eq(futureTodosTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

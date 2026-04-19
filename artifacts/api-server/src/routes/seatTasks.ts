import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, seatTasksTable, orgChartSeatsTable } from "@workspace/db";
import {
  CreateSeatTaskBody,
  UpdateSeatTaskBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseIntParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function mapTask(t: any) {
  return {
    ...t,
    description: t.description ?? undefined,
    dueDate: t.dueDate ?? undefined,
  };
}

router.get("/seats/:seatId/tasks", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.seatId);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seatId" });
    return;
  }
  try {
    const tasks = await db
      .select()
      .from(seatTasksTable)
      .where(eq(seatTasksTable.seatId, seatId))
      .orderBy(asc(seatTasksTable.sortOrder), asc(seatTasksTable.id));
    res.json(tasks.map(mapTask));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to list tasks" });
  }
});

router.post("/seats/:seatId/tasks", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.seatId);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seatId" });
    return;
  }
  const parsed = CreateSeatTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [seat] = await db
      .select({ id: orgChartSeatsTable.id })
      .from(orgChartSeatsTable)
      .where(eq(orgChartSeatsTable.id, seatId));
    if (!seat) {
      res.status(404).json({ error: "Seat not found" });
      return;
    }
    const [task] = await db
      .insert(seatTasksTable)
      .values({
        seatId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status ?? "todo",
        dueDate: parsed.data.dueDate ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    res.status(201).json(mapTask(task));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to create task" });
  }
});

router.patch("/seat-tasks/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  const parsed = UpdateSeatTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.dueDate !== undefined) updates.dueDate = parsed.data.dueDate;
    if (parsed.data.completed !== undefined)
      updates.completed = parsed.data.completed;
    if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

    const [task] = await db
      .update(seatTasksTable)
      .set(updates)
      .where(eq(seatTasksTable.id, id))
      .returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(mapTask(task));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to update task" });
  }
});

router.delete("/seat-tasks/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  try {
    const [task] = await db
      .delete(seatTasksTable)
      .where(eq(seatTasksTable.id, id))
      .returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.sendStatus(204);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to delete task" });
  }
});

export default router;

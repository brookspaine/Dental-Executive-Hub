import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, roleTasksTable, rolesTable } from "@workspace/db";
import { CreateRoleTaskBody, UpdateRoleTaskBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseIntParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function mapTask(t: any) {
  return {
    ...t,
    description: t.description ?? null,
    assignee: t.assignee ?? null,
    dueDate: t.dueDate ?? null,
    keyResultId: t.keyResultId ?? null,
  };
}

router.get("/roles/:roleId/tasks", async (req, res): Promise<void> => {
  const roleId = parseIntParam(req.params.roleId);
  if (roleId === null) {
    res.status(400).json({ error: "Invalid roleId" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(roleTasksTable)
      .where(eq(roleTasksTable.roleId, roleId))
      .orderBy(asc(roleTasksTable.sortOrder), asc(roleTasksTable.id));
    res.json(rows.map(mapTask));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to list tasks" });
  }
});

router.post("/roles/:roleId/tasks", async (req, res): Promise<void> => {
  const roleId = parseIntParam(req.params.roleId);
  if (roleId === null) {
    res.status(400).json({ error: "Invalid roleId" });
    return;
  }
  const parsed = CreateRoleTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [role] = await db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(eq(rolesTable.id, roleId));
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }
    const [row] = await db
      .insert(roleTasksTable)
      .values({
        roleId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status ?? "todo",
        priority: parsed.data.priority ?? "medium",
        assignee: parsed.data.assignee ?? null,
        dueDate: parsed.data.dueDate ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        keyResultId: parsed.data.keyResultId ?? null,
        completed: parsed.data.status === "done",
      })
      .returning();
    res.status(201).json(mapTask(row));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to create task" });
  }
});

router.patch("/role-tasks/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateRoleTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const d = parsed.data;
    if (d.title !== undefined) updates.title = d.title;
    if (d.description !== undefined) updates.description = d.description;
    if (d.status !== undefined) updates.status = d.status;
    if (d.priority !== undefined) updates.priority = d.priority;
    if (d.assignee !== undefined) updates.assignee = d.assignee;
    if (d.dueDate !== undefined) updates.dueDate = d.dueDate;
    if (d.completed !== undefined) updates.completed = d.completed;
    if (d.sortOrder !== undefined) updates.sortOrder = d.sortOrder;
    if (d.keyResultId !== undefined) updates.keyResultId = d.keyResultId;
    const [row] = await db
      .update(roleTasksTable)
      .set(updates)
      .where(eq(roleTasksTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(mapTask(row));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to update task" });
  }
});

router.delete("/role-tasks/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(roleTasksTable).where(eq(roleTasksTable.id, id));
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to delete task" });
  }
});

export default router;

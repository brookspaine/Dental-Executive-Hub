import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  roleKeyResultsTable,
  rolesTable,
  roleTasksTable,
} from "@workspace/db";
import {
  CreateRoleKeyResultBody,
  UpdateRoleKeyResultBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseIntParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function mapKr(k: any) {
  return { ...k, description: k.description ?? null };
}

router.get("/roles/:roleId/key-results", async (req, res): Promise<void> => {
  const roleId = parseIntParam(req.params.roleId);
  if (roleId === null) {
    res.status(400).json({ error: "Invalid roleId" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(roleKeyResultsTable)
      .where(eq(roleKeyResultsTable.roleId, roleId))
      .orderBy(asc(roleKeyResultsTable.sortOrder), asc(roleKeyResultsTable.id));
    res.json(rows.map(mapKr));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to list key results" });
  }
});

router.post("/roles/:roleId/key-results", async (req, res): Promise<void> => {
  const roleId = parseIntParam(req.params.roleId);
  if (roleId === null) {
    res.status(400).json({ error: "Invalid roleId" });
    return;
  }
  const parsed = CreateRoleKeyResultBody.safeParse(req.body);
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
      .insert(roleKeyResultsTable)
      .values({
        roleId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    res.status(201).json(mapKr(row));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to create key result" });
  }
});

router.patch("/role-key-results/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateRoleKeyResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.sortOrder !== undefined)
      updates.sortOrder = parsed.data.sortOrder;
    const [row] = await db
      .update(roleKeyResultsTable)
      .set(updates)
      .where(eq(roleKeyResultsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Key result not found" });
      return;
    }
    res.json(mapKr(row));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to update key result" });
  }
});

router.delete("/role-key-results/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    // Detach any tasks pointing at this KRA so they show up under "Unfiled".
    await db
      .update(roleTasksTable)
      .set({ keyResultId: null, updatedAt: new Date() })
      .where(eq(roleTasksTable.keyResultId, id));
    await db.delete(roleKeyResultsTable).where(eq(roleKeyResultsTable.id, id));
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to delete key result" });
  }
});

export default router;

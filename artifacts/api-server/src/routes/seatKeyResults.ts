import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  seatKeyResultsTable,
  orgChartSeatsTable,
  seatTasksTable,
} from "@workspace/db";
import {
  CreateSeatKeyResultBody,
  UpdateSeatKeyResultBody,
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

router.get("/seats/:seatId/key-results", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.seatId);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seatId" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(seatKeyResultsTable)
      .where(eq(seatKeyResultsTable.seatId, seatId))
      .orderBy(asc(seatKeyResultsTable.sortOrder), asc(seatKeyResultsTable.id));
    res.json(rows.map(mapKr));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to list key results" });
  }
});

router.post("/seats/:seatId/key-results", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.seatId);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seatId" });
    return;
  }
  const parsed = CreateSeatKeyResultBody.safeParse(req.body);
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
    const [row] = await db
      .insert(seatKeyResultsTable)
      .values({
        seatId,
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

router.patch("/seat-key-results/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateSeatKeyResultBody.safeParse(req.body);
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
      .update(seatKeyResultsTable)
      .set(updates)
      .where(eq(seatKeyResultsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(mapKr(row));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to update key result" });
  }
});

router.delete("/seat-key-results/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    // Detach any tasks that reference this KRA so they remain visible (just unbucketed)
    await db
      .update(seatTasksTable)
      .set({ keyResultId: null, updatedAt: new Date() })
      .where(eq(seatTasksTable.keyResultId, id));
    const [row] = await db
      .delete(seatKeyResultsTable)
      .where(eq(seatKeyResultsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendStatus(204);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to delete key result" });
  }
});

export default router;

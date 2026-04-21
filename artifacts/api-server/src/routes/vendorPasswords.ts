import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, vendorPasswordsTable, orgChartSeatsTable } from "@workspace/db";
import {
  CreateVendorPasswordBody,
  UpdateVendorPasswordBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseIntParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function mapEntry(e: any) {
  return {
    ...e,
    username: e.username ?? null,
    password: e.password ?? null,
    url: e.url ?? null,
    notes: e.notes ?? null,
  };
}

router.get("/seats/:seatId/vendor-passwords", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.seatId);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seatId" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(vendorPasswordsTable)
      .where(eq(vendorPasswordsTable.seatId, seatId))
      .orderBy(asc(vendorPasswordsTable.sortOrder), asc(vendorPasswordsTable.id));
    res.json(rows.map(mapEntry));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to list vendor passwords" });
  }
});

router.post("/seats/:seatId/vendor-passwords", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.seatId);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seatId" });
    return;
  }
  const parsed = CreateVendorPasswordBody.safeParse(req.body);
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
      .insert(vendorPasswordsTable)
      .values({
        seatId,
        vendorName: parsed.data.vendorName,
        username: parsed.data.username ?? null,
        password: parsed.data.password ?? null,
        url: parsed.data.url ?? null,
        notes: parsed.data.notes ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    res.status(201).json(mapEntry(row));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to create vendor password" });
  }
});

router.patch("/vendor-passwords/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateVendorPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.vendorName !== undefined) updates.vendorName = parsed.data.vendorName;
    if (parsed.data.username !== undefined) updates.username = parsed.data.username;
    if (parsed.data.password !== undefined) updates.password = parsed.data.password;
    if (parsed.data.url !== undefined) updates.url = parsed.data.url;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

    const [row] = await db
      .update(vendorPasswordsTable)
      .set(updates)
      .where(eq(vendorPasswordsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(mapEntry(row));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to update vendor password" });
  }
});

router.delete("/vendor-passwords/:id", async (req, res): Promise<void> => {
  const id = parseIntParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [row] = await db
      .delete(vendorPasswordsTable)
      .where(eq(vendorPasswordsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendStatus(204);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to delete vendor password" });
  }
});

export default router;

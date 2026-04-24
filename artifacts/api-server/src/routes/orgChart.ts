import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, orgChartSeatsTable } from "@workspace/db";
import {
  CreateOrgChartSeatBody,
  UpdateOrgChartSeatBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseIntParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function mapSeat(s: any) {
  return {
    ...s,
    name: s.name ?? undefined,
    photoUrl: s.photoUrl ?? undefined,
    parentSeatId: s.parentSeatId ?? undefined,
    accountabilities: Array.isArray(s.accountabilities) ? s.accountabilities : [],
    keyResultsArea: Array.isArray(s.keyResultsArea) ? s.keyResultsArea : [],
  };
}

async function validateParent(
  parentSeatId: number,
  organizationId: number,
  movingSeatId: number | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (movingSeatId !== null && parentSeatId === movingSeatId) {
    return { ok: false, status: 400, error: "A seat cannot report to itself" };
  }
  const [parent] = await db
    .select()
    .from(orgChartSeatsTable)
    .where(eq(orgChartSeatsTable.id, parentSeatId));
  if (!parent) {
    return { ok: false, status: 400, error: "Parent seat does not exist" };
  }
  if (parent.organizationId !== organizationId) {
    return {
      ok: false,
      status: 400,
      error: "Parent seat must be in the same location",
    };
  }
  if (movingSeatId !== null) {
    // Walk up from parent to root; if we hit movingSeatId, it's a cycle.
    const visited = new Set<number>();
    let cursor: number | null = parent.id;
    while (cursor !== null) {
      if (visited.has(cursor)) break;
      visited.add(cursor);
      if (cursor === movingSeatId) {
        return {
          ok: false,
          status: 400,
          error: "Cannot report to one of your own direct reports",
        };
      }
      const [row] = await db
        .select({ parentSeatId: orgChartSeatsTable.parentSeatId })
        .from(orgChartSeatsTable)
        .where(eq(orgChartSeatsTable.id, cursor));
      cursor = row?.parentSeatId ?? null;
    }
  }
  return { ok: true };
}

router.get("/seats", async (_req, res): Promise<void> => {
  try {
    const seats = await db
      .select()
      .from(orgChartSeatsTable)
      .orderBy(asc(orgChartSeatsTable.organizationId), asc(orgChartSeatsTable.sortOrder), asc(orgChartSeatsTable.id));
    res.json(seats.map(mapSeat));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to list seats" });
  }
});

router.get("/organizations/:organizationId/seats", async (req, res): Promise<void> => {
  const orgId = parseIntParam(req.params.organizationId);
  if (orgId === null) {
    res.status(400).json({ error: "Invalid organizationId" });
    return;
  }
  try {
    const seats = await db
      .select()
      .from(orgChartSeatsTable)
      .where(eq(orgChartSeatsTable.organizationId, orgId))
      .orderBy(asc(orgChartSeatsTable.sortOrder), asc(orgChartSeatsTable.id));
    res.json(seats.map(mapSeat));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to list seats" });
  }
});

router.post("/organizations/:organizationId/seats", async (req, res): Promise<void> => {
  const orgId = parseIntParam(req.params.organizationId);
  if (orgId === null) {
    res.status(400).json({ error: "Invalid organizationId" });
    return;
  }
  const parsed = CreateOrgChartSeatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    if (parsed.data.parentSeatId != null) {
      const check = await validateParent(parsed.data.parentSeatId, orgId, null);
      if (!check.ok) {
        res.status(check.status).json({ error: check.error });
        return;
      }
    }
    const [seat] = await db
      .insert(orgChartSeatsTable)
      .values({
        organizationId: orgId,
        title: parsed.data.title,
        name: parsed.data.name ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
        parentSeatId: parsed.data.parentSeatId ?? null,
        accountabilities: parsed.data.accountabilities ?? [],
        keyResultsArea: parsed.data.keyResultsArea ?? [],
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    res.status(201).json(mapSeat(seat));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to create seat" });
  }
});

router.get("/seats/:id", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.id);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seat id" });
    return;
  }
  try {
    const [seat] = await db
      .select()
      .from(orgChartSeatsTable)
      .where(eq(orgChartSeatsTable.id, seatId));
    if (!seat) {
      res.status(404).json({ error: "Seat not found" });
      return;
    }
    res.json(mapSeat(seat));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to load seat" });
  }
});

router.patch("/seats/:id", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.id);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seat id" });
    return;
  }
  const parsed = UpdateOrgChartSeatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(orgChartSeatsTable)
      .where(eq(orgChartSeatsTable.id, seatId));
    if (!existing) {
      res.status(404).json({ error: "Seat not found" });
      return;
    }
    if (parsed.data.parentSeatId !== undefined && parsed.data.parentSeatId !== null) {
      const check = await validateParent(
        parsed.data.parentSeatId,
        existing.organizationId,
        seatId
      );
      if (!check.ok) {
        res.status(check.status).json({ error: check.error });
        return;
      }
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.photoUrl !== undefined) updates.photoUrl = parsed.data.photoUrl;
    if (parsed.data.parentSeatId !== undefined)
      updates.parentSeatId = parsed.data.parentSeatId;
    if (parsed.data.accountabilities !== undefined)
      updates.accountabilities = parsed.data.accountabilities;
    if (parsed.data.keyResultsArea !== undefined)
      updates.keyResultsArea = parsed.data.keyResultsArea;
    if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

    const [seat] = await db
      .update(orgChartSeatsTable)
      .set(updates)
      .where(eq(orgChartSeatsTable.id, seatId))
      .returning();

    res.json(mapSeat(seat));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to update seat" });
  }
});

router.delete("/seats/:id", async (req, res): Promise<void> => {
  const seatId = parseIntParam(req.params.id);
  if (seatId === null) {
    res.status(400).json({ error: "Invalid seat id" });
    return;
  }
  try {
    const [seat] = await db
      .delete(orgChartSeatsTable)
      .where(eq(orgChartSeatsTable.id, seatId))
      .returning();
    if (!seat) {
      res.status(404).json({ error: "Seat not found" });
      return;
    }
    res.sendStatus(204);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to delete seat" });
  }
});

export default router;

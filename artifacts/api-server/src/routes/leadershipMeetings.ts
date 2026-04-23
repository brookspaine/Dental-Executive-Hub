import { Router, type IRouter } from "express";
import { eq, asc, desc, sql, and, lt, inArray } from "drizzle-orm";
import {
  db,
  meetingSeriesTable,
  meetingAgendasTable,
  meetingKeyTopicsTable,
  meetingActionItemsTable,
} from "@workspace/db";

async function seriesExists(id: number): Promise<boolean> {
  const [row] = await db
    .select({ id: meetingSeriesTable.id })
    .from(meetingSeriesTable)
    .where(eq(meetingSeriesTable.id, id));
  return Boolean(row);
}

async function agendaExists(id: number): Promise<boolean> {
  const [row] = await db
    .select({ id: meetingAgendasTable.id })
    .from(meetingAgendasTable)
    .where(eq(meetingAgendasTable.id, id));
  return Boolean(row);
}

const router: IRouter = Router();

// ----- Series -----

router.get("/meeting-series", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(meetingSeriesTable)
    .orderBy(asc(meetingSeriesTable.id));
  res.json(rows);
});

router.post("/meeting-series", async (req, res): Promise<void> => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const members = Array.isArray(req.body?.members)
    ? (req.body.members as unknown[]).map((m) => String(m)).filter(Boolean)
    : [];
  const desiredFuture =
    typeof req.body?.desiredFuture === "string" ? req.body.desiredFuture : null;
  const desiredFutureStatus =
    typeof req.body?.desiredFutureStatus === "string"
      ? req.body.desiredFutureStatus
      : "on-pace";

  const [row] = await db
    .insert(meetingSeriesTable)
    .values({ name, members, desiredFuture, desiredFutureStatus })
    .returning();
  res.status(201).json(row);
});

router.get("/meeting-series/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select()
    .from(meetingSeriesTable)
    .where(eq(meetingSeriesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.patch("/meeting-series/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (typeof req.body?.name === "string") updates.name = req.body.name;
  if (Array.isArray(req.body?.members))
    updates.members = (req.body.members as unknown[])
      .map((m) => String(m))
      .filter(Boolean);
  if (typeof req.body?.desiredFuture === "string")
    updates.desiredFuture = req.body.desiredFuture;
  if (typeof req.body?.desiredFutureStatus === "string")
    updates.desiredFutureStatus = req.body.desiredFutureStatus;

  const [row] = await db
    .update(meetingSeriesTable)
    .set(updates)
    .where(eq(meetingSeriesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/meeting-series/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(meetingSeriesTable).where(eq(meetingSeriesTable.id, id));
  res.sendStatus(204);
});

// ----- Agendas -----

router.get(
  "/meeting-series/:id/agendas",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select()
      .from(meetingAgendasTable)
      .where(eq(meetingAgendasTable.seriesId, id))
      .orderBy(desc(meetingAgendasTable.createdAt));
    res.json(rows);
  }
);

router.post(
  "/meeting-series/:id/agendas",
  async (req, res): Promise<void> => {
    const seriesId = Number(req.params.id);
    if (!Number.isFinite(seriesId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (!(await seriesExists(seriesId))) {
      res.status(404).json({ error: "Series not found" });
      return;
    }
    const providedName = String(req.body?.name ?? "").trim();
    const name =
      providedName ||
      `Weekly Agenda — ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    const [row] = await db
      .insert(meetingAgendasTable)
      .values({ seriesId, name, sectionData: {} })
      .returning();

    // Auto-sync: pull all incomplete action items from prior agendas in this
    // series into the new agenda so they continue to appear until closed.
    const priorAgendas = await db
      .select({ id: meetingAgendasTable.id })
      .from(meetingAgendasTable)
      .where(
        and(
          eq(meetingAgendasTable.seriesId, seriesId),
          lt(meetingAgendasTable.id, row.id)
        )
      );
    if (priorAgendas.length > 0) {
      const priorIds = priorAgendas.map((a) => a.id);
      await db
        .update(meetingActionItemsTable)
        .set({ agendaId: row.id })
        .where(
          and(
            inArray(meetingActionItemsTable.agendaId, priorIds),
            eq(meetingActionItemsTable.completed, false)
          )
        );
    }

    res.status(201).json(row);
  }
);

router.get("/meeting-agendas/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select()
    .from(meetingAgendasTable)
    .where(eq(meetingAgendasTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.patch("/meeting-agendas/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const ALLOWED_SECTION_KEYS = new Set([
    "iceBreaker",
    "winsShoutouts",
    "scoreCard",
    "desiredFuture",
    "closeTheLoop",
  ]);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof req.body?.name === "string") updates.name = req.body.name;
  if (req.body?.sectionData && typeof req.body.sectionData === "object") {
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.body.sectionData)) {
      if (ALLOWED_SECTION_KEYS.has(k) && typeof v === "string") {
        filtered[k] = v;
      }
    }
    // Atomic JSONB merge in SQL to avoid lost-update races with concurrent autosaves
    updates.sectionData = sql`COALESCE(${meetingAgendasTable.sectionData}, '{}'::jsonb) || ${JSON.stringify(filtered)}::jsonb`;
  }
  const [row] = await db
    .update(meetingAgendasTable)
    .set(updates)
    .where(eq(meetingAgendasTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/meeting-agendas/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(meetingAgendasTable).where(eq(meetingAgendasTable.id, id));
  res.sendStatus(204);
});

// ----- Key Topics -----

router.get(
  "/meeting-agendas/:id/key-topics",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select()
      .from(meetingKeyTopicsTable)
      .where(eq(meetingKeyTopicsTable.agendaId, id))
      .orderBy(asc(meetingKeyTopicsTable.sortOrder), asc(meetingKeyTopicsTable.id));
    res.json(rows);
  }
);

router.post(
  "/meeting-agendas/:id/key-topics",
  async (req, res): Promise<void> => {
    const agendaId = Number(req.params.id);
    if (!Number.isFinite(agendaId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (!(await agendaExists(agendaId))) {
      res.status(404).json({ error: "Agenda not found" });
      return;
    }
    const coreIssue = String(req.body?.coreIssue ?? "").trim();
    if (!coreIssue) {
      res.status(400).json({ error: "Core issue is required" });
      return;
    }
    const owner =
      typeof req.body?.owner === "string" ? req.body.owner : null;
    const [row] = await db
      .insert(meetingKeyTopicsTable)
      .values({ agendaId, coreIssue, owner })
      .returning();
    res.status(201).json(row);
  }
);

router.patch("/meeting-key-topics/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (typeof req.body?.coreIssue === "string")
    updates.coreIssue = req.body.coreIssue;
  if (typeof req.body?.owner === "string") updates.owner = req.body.owner;
  if (typeof req.body?.notes === "string") updates.notes = req.body.notes;
  if (typeof req.body?.resolved === "boolean")
    updates.resolved = req.body.resolved;
  const [row] = await db
    .update(meetingKeyTopicsTable)
    .set(updates)
    .where(eq(meetingKeyTopicsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/meeting-key-topics/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(meetingKeyTopicsTable).where(eq(meetingKeyTopicsTable.id, id));
  res.sendStatus(204);
});

// ----- Action Items -----

router.get(
  "/meeting-agendas/:id/action-items",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select()
      .from(meetingActionItemsTable)
      .where(eq(meetingActionItemsTable.agendaId, id))
      .orderBy(asc(meetingActionItemsTable.sortOrder), asc(meetingActionItemsTable.id));
    res.json(rows);
  }
);

router.post(
  "/meeting-agendas/:id/action-items",
  async (req, res): Promise<void> => {
    const agendaId = Number(req.params.id);
    if (!Number.isFinite(agendaId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (!(await agendaExists(agendaId))) {
      res.status(404).json({ error: "Agenda not found" });
      return;
    }
    const item = String(req.body?.item ?? "").trim();
    if (!item) {
      res.status(400).json({ error: "Item is required" });
      return;
    }
    const owner = typeof req.body?.owner === "string" ? req.body.owner : null;
    const dueDate =
      typeof req.body?.dueDate === "string" ? req.body.dueDate : null;
    const isDailyTop3 = Boolean(req.body?.isDailyTop3);
    const notes = typeof req.body?.notes === "string" ? req.body.notes : null;
    const [row] = await db
      .insert(meetingActionItemsTable)
      .values({ agendaId, item, owner, dueDate, isDailyTop3, notes })
      .returning();
    res.status(201).json(row);
  }
);

router.patch(
  "/meeting-action-items/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const updates: Record<string, unknown> = {};
    if (typeof req.body?.item === "string") updates.item = req.body.item;
    if (typeof req.body?.owner === "string") updates.owner = req.body.owner;
    if (typeof req.body?.dueDate === "string")
      updates.dueDate = req.body.dueDate;
    if (typeof req.body?.isDailyTop3 === "boolean")
      updates.isDailyTop3 = req.body.isDailyTop3;
    if (typeof req.body?.notes === "string") updates.notes = req.body.notes;
    if (typeof req.body?.completed === "boolean")
      updates.completed = req.body.completed;
    const [row] = await db
      .update(meetingActionItemsTable)
      .set(updates)
      .where(eq(meetingActionItemsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  }
);

router.delete(
  "/meeting-action-items/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(meetingActionItemsTable)
      .where(eq(meetingActionItemsTable.id, id));
    res.sendStatus(204);
  }
);

export default router;

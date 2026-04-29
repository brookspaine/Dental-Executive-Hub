import { Router, type IRouter } from "express";
import { eq, asc, desc, sql, and, lt, inArray, or } from "drizzle-orm";
import {
  db,
  meetingSeriesTable,
  meetingSeriesMembersTable,
  teamMembersTable,
  meetingAgendasTable,
  meetingKeyTopicsTable,
  meetingActionItemsTable,
  seatTasksTable,
  orgChartSeatsTable,
} from "@workspace/db";

/**
 * Replace this series' team-member roster inside a transaction. Also
 * refreshes the legacy `members jsonb` array on `meeting_series` so any
 * code path still reading the cached display strings stays in sync. When
 * `memberIds` is empty, the roster is cleared.
 */
async function syncSeriesMembers(
  seriesId: number,
  memberIds: number[],
): Promise<string[]> {
  return db.transaction(async (tx) => {
    await tx
      .delete(meetingSeriesMembersTable)
      .where(eq(meetingSeriesMembersTable.seriesId, seriesId));
    let resolvedNames: string[] = [];
    if (memberIds.length > 0) {
      const rows = await tx
        .select({
          id: teamMembersTable.id,
          name: teamMembersTable.name,
        })
        .from(teamMembersTable)
        .where(inArray(teamMembersTable.id, memberIds));
      const byId = new Map(rows.map((r) => [r.id, r.name]));
      // Preserve the order the client sent so the picker remains stable.
      const valuesToInsert = memberIds
        .filter((id) => byId.has(id))
        .map((id, i) => ({
          seriesId,
          teamMemberId: id,
          position: i,
        }));
      if (valuesToInsert.length > 0) {
        await tx.insert(meetingSeriesMembersTable).values(valuesToInsert);
      }
      resolvedNames = memberIds
        .map((id) => byId.get(id))
        .filter((n): n is string => Boolean(n));
    }
    await tx
      .update(meetingSeriesTable)
      .set({ members: resolvedNames })
      .where(eq(meetingSeriesTable.id, seriesId));
    return resolvedNames;
  });
}

async function loadMemberIds(seriesId: number): Promise<number[]> {
  const rows = await db
    .select({ teamMemberId: meetingSeriesMembersTable.teamMemberId })
    .from(meetingSeriesMembersTable)
    .where(eq(meetingSeriesMembersTable.seriesId, seriesId))
    .orderBy(asc(meetingSeriesMembersTable.position), asc(meetingSeriesMembersTable.id));
  return rows.map((r) => r.teamMemberId);
}

function parseMemberIds(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const out: number[] = [];
  for (const v of input) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isInteger(n) && n > 0) out.push(n);
  }
  return out;
}

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

type AgendaActionItem =
  | {
      source: "meeting";
      id: number;
      item: string;
      owner: string | null;
      dueDate: string | null;
      isDailyTop3: boolean;
      notes: string | null;
      completed: boolean;
      seatTitle: string | null;
    }
  | {
      source: "seatTask";
      id: number;
      item: string;
      owner: string | null;
      dueDate: string | null;
      isDailyTop3: false;
      notes: string | null;
      completed: boolean;
      seatTitle: string;
    };

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
  const memberIds = parseMemberIds(req.body?.memberIds);
  // Legacy support: the old client sent strings; we still accept them but
  // prefer memberIds when both are present.
  const legacyMembers = Array.isArray(req.body?.members)
    ? (req.body.members as unknown[]).map((m) => String(m)).filter(Boolean)
    : [];
  const desiredFuture =
    typeof req.body?.desiredFuture === "string" ? req.body.desiredFuture : null;
  const desiredFutureStatus =
    typeof req.body?.desiredFutureStatus === "string"
      ? req.body.desiredFutureStatus
      : "on-pace";
  const organization =
    typeof req.body?.organization === "string" && req.body.organization.trim()
      ? req.body.organization.trim()
      : null;

  const [row] = await db
    .insert(meetingSeriesTable)
    .values({
      name,
      members: legacyMembers,
      desiredFuture,
      desiredFutureStatus,
      organization,
    })
    .returning();
  // Mirror the PATCH semantics: when `memberIds` is present at all
  // (even as an empty array) it wins over the legacy `members` strings
  // and rewrites both the join table and the cached jsonb. Only skip
  // the sync when the caller did not include `memberIds` at all.
  if (memberIds !== null) {
    await syncSeriesMembers(row.id, memberIds);
  }
  // Read back the persisted IDs so the response only contains members
  // that actually exist in team_members (syncSeriesMembers silently
  // drops unknown ids; echoing the raw input would lie about what was
  // saved).
  const finalMemberIds =
    memberIds !== null ? await loadMemberIds(row.id) : [];
  // Re-read the row so the caller sees the legacy `members` jsonb that
  // was rewritten inside syncSeriesMembers (the initial insert used the
  // legacy strings, which may have been overwritten with the resolved
  // names from team_members).
  const [refreshed] = await db
    .select()
    .from(meetingSeriesTable)
    .where(eq(meetingSeriesTable.id, row.id));
  res.status(201).json({ ...(refreshed ?? row), memberIds: finalMemberIds });
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
  const memberIds = await loadMemberIds(id);
  res.json({ ...row, memberIds });
});

router.patch("/meeting-series/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const memberIds = parseMemberIds(req.body?.memberIds);

  const updates: Record<string, unknown> = {};
  if (typeof req.body?.name === "string") updates.name = req.body.name;
  // Legacy: a string-only members payload still works. If memberIds is
  // also present it wins (and syncSeriesMembers will overwrite this).
  if (Array.isArray(req.body?.members) && memberIds === null)
    updates.members = (req.body.members as unknown[])
      .map((m) => String(m))
      .filter(Boolean);
  if (typeof req.body?.desiredFuture === "string")
    updates.desiredFuture = req.body.desiredFuture;
  if (typeof req.body?.desiredFutureStatus === "string")
    updates.desiredFutureStatus = req.body.desiredFutureStatus;
  if (typeof req.body?.organization === "string")
    updates.organization = req.body.organization.trim() || null;
  if (req.body?.organization === null) updates.organization = null;

  let row;
  if (Object.keys(updates).length > 0) {
    [row] = await db
      .update(meetingSeriesTable)
      .set(updates)
      .where(eq(meetingSeriesTable.id, id))
      .returning();
  } else {
    [row] = await db
      .select()
      .from(meetingSeriesTable)
      .where(eq(meetingSeriesTable.id, id));
  }
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (memberIds !== null) {
    await syncSeriesMembers(id, memberIds);
  }
  // Always read back from the join table so the response reflects what
  // is actually persisted (unknown ids are silently dropped during
  // sync; we must not echo them).
  const finalMemberIds = await loadMemberIds(id);
  // Re-read the legacy `members` field in case syncSeriesMembers updated it.
  const [refreshed] = await db
    .select()
    .from(meetingSeriesTable)
    .where(eq(meetingSeriesTable.id, id));
  res.json({ ...refreshed, memberIds: finalMemberIds });
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
    const [agenda] = await db
      .select()
      .from(meetingAgendasTable)
      .where(eq(meetingAgendasTable.id, id));
    if (!agenda) {
      res.status(404).json({ error: "Agenda not found" });
      return;
    }
    const meetingRows = await db
      .select()
      .from(meetingActionItemsTable)
      .where(eq(meetingActionItemsTable.agendaId, id))
      .orderBy(
        asc(meetingActionItemsTable.sortOrder),
        asc(meetingActionItemsTable.id)
      );
    const meetingItems = meetingRows.map((r) => ({
      source: "meeting" as const,
      id: r.id,
      item: r.item,
      owner: r.owner,
      dueDate: r.dueDate,
      isDailyTop3: r.isDailyTop3,
      notes: r.notes,
      completed: r.completed,
      seatTitle: null as string | null,
    }));

    // Merge in seat tasks from the org chart for any team member of this
    // series. Match either the task's assignee or the seat's named occupant.
    const [series] = await db
      .select({ members: meetingSeriesTable.members })
      .from(meetingSeriesTable)
      .where(eq(meetingSeriesTable.id, agenda.seriesId));
    const members = (series?.members ?? []).filter(Boolean);
    let seatItems: AgendaActionItem[] = [];
    if (members.length > 0) {
      const seatRows = await db
        .select({
          id: seatTasksTable.id,
          title: seatTasksTable.title,
          description: seatTasksTable.description,
          assignee: seatTasksTable.assignee,
          dueDate: seatTasksTable.dueDate,
          completed: seatTasksTable.completed,
          seatTitle: orgChartSeatsTable.title,
          seatName: orgChartSeatsTable.name,
        })
        .from(seatTasksTable)
        .innerJoin(
          orgChartSeatsTable,
          eq(seatTasksTable.seatId, orgChartSeatsTable.id)
        )
        .where(
          and(
            eq(seatTasksTable.completed, false),
            or(
              inArray(seatTasksTable.assignee, members),
              inArray(orgChartSeatsTable.name, members)
            )
          )
        )
        .orderBy(asc(seatTasksTable.id));
      seatItems = seatRows.map((r) => ({
        source: "seatTask" as const,
        id: r.id,
        item: r.title,
        owner: r.assignee ?? r.seatName ?? null,
        dueDate: r.dueDate,
        isDailyTop3: false,
        notes: r.description,
        completed: r.completed,
        seatTitle: r.seatTitle,
      }));
    }

    res.json([...meetingItems, ...seatItems]);
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

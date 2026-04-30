import { Router, type IRouter } from "express";
import { eq, asc, desc, sql, and, lt, inArray, or } from "drizzle-orm";
import {
  db,
  meetingSeriesTable,
  meetingSeriesMembersTable,
  teamMembersTable,
  meetingAgendasTable,
  meetingKeyTopicsTable,
  actionItemsTable,
  seatTasksTable,
  orgChartSeatsTable,
} from "@workspace/db";

/**
 * Replace this series' team-member roster inside a transaction. Returns
 * the resolved member names in roster order (used to project `members`
 * onto the response).
 */
async function syncSeriesMembers(
  seriesId: number,
  memberIds: number[],
): Promise<string[]> {
  return db.transaction(async (tx) => {
    await tx
      .delete(meetingSeriesMembersTable)
      .where(eq(meetingSeriesMembersTable.seriesId, seriesId));
    if (memberIds.length === 0) return [];
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
    return memberIds
      .map((id) => byId.get(id))
      .filter((n): n is string => Boolean(n));
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

/**
 * Read the current roster as display names, in roster order. This is the
 * source of `members: string[]` on the response; the column on
 * meeting_series itself is gone.
 */
async function loadMemberNames(seriesId: number): Promise<string[]> {
  const rows = await db
    .select({ name: teamMembersTable.name })
    .from(meetingSeriesMembersTable)
    .innerJoin(
      teamMembersTable,
      eq(teamMembersTable.id, meetingSeriesMembersTable.teamMemberId),
    )
    .where(eq(meetingSeriesMembersTable.seriesId, seriesId))
    .orderBy(asc(meetingSeriesMembersTable.position), asc(meetingSeriesMembersTable.id));
  return rows.map((r) => r.name);
}

function parseMemberIds(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const out: number[] = [];
  const seen = new Set<number>();
  for (const v of input) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isInteger(n) && n > 0 && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

/**
 * Returns the subset of `ids` that don't exist in `team_members`.
 * Caller treats a non-empty result as a 400.
 */
async function findUnknownTeamMemberIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(inArray(teamMembersTable.id, ids));
  const known = new Set(rows.map((r) => r.id));
  return ids.filter((id) => !known.has(id));
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
  // Project the roster onto each series as both `memberIds` (canonical)
  // and `members: string[]` (back-compat for the existing avatar row).
  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [memberIds, members] = await Promise.all([
        loadMemberIds(r.id),
        loadMemberNames(r.id),
      ]);
      return { ...r, memberIds, members };
    }),
  );
  res.json(enriched);
});

router.post("/meeting-series", async (req, res): Promise<void> => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const memberIds = parseMemberIds(req.body?.memberIds);
  if (memberIds !== null) {
    const unknown = await findUnknownTeamMemberIds(memberIds);
    if (unknown.length > 0) {
      res.status(400).json({
        error: `Unknown team member id(s): ${unknown.join(", ")}`,
      });
      return;
    }
  }
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
      desiredFuture,
      desiredFutureStatus,
      organization,
    })
    .returning();
  if (memberIds !== null) {
    await syncSeriesMembers(row.id, memberIds);
  }
  const [finalMemberIds, finalMemberNames] = await Promise.all([
    loadMemberIds(row.id),
    loadMemberNames(row.id),
  ]);
  res.status(201).json({
    ...row,
    memberIds: finalMemberIds,
    members: finalMemberNames,
  });
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
  const [memberIds, members] = await Promise.all([
    loadMemberIds(id),
    loadMemberNames(id),
  ]);
  res.json({ ...row, memberIds, members });
});

router.patch("/meeting-series/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const memberIds = parseMemberIds(req.body?.memberIds);
  if (memberIds !== null) {
    const unknown = await findUnknownTeamMemberIds(memberIds);
    if (unknown.length > 0) {
      res.status(400).json({
        error: `Unknown team member id(s): ${unknown.join(", ")}`,
      });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (typeof req.body?.name === "string") updates.name = req.body.name;
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
  const [finalMemberIds, finalMemberNames] = await Promise.all([
    loadMemberIds(id),
    loadMemberNames(id),
  ]);
  res.json({
    ...row,
    memberIds: finalMemberIds,
    members: finalMemberNames,
  });
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
      // Carry over any incomplete leadership-meeting items from prior
      // agendas. They live in the canonical `action_items` table now
      // (Phase 4) and are filtered by `sourceKind` so we don't sweep up
      // unrelated action items that happen to share an agenda id.
      await db
        .update(actionItemsTable)
        .set({ agendaId: row.id })
        .where(
          and(
            inArray(actionItemsTable.agendaId, priorIds),
            eq(actionItemsTable.sourceKind, "leadership_meeting"),
            eq(actionItemsTable.done, false)
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
    /**
     * Phase 4: meeting items now live in the canonical `action_items`
     * table tagged with `agendaId`. We project them onto the legacy
     * AgendaActionItem shape so the existing UI keeps working — `id` is
     * an action_items id (the UI uses it for PATCH/DELETE against
     * `/api/action-items/:id`), and `notes` is flattened from the jsonb
     * note array down to its first label so the agenda's text-only
     * notes input continues to round-trip cleanly.
     */
    const meetingRows = await db
      .select()
      .from(actionItemsTable)
      .where(
        and(
          eq(actionItemsTable.agendaId, id),
          // Only the meeting's own action items belong on this card.
          // Phase 5 key-topic items will share the same agenda_id but
          // belong on a separate surface, so we narrow by sourceKind to
          // keep the views isolated even before that work lands.
          eq(actionItemsTable.sourceKind, "leadership_meeting"),
        ),
      )
      .orderBy(asc(actionItemsTable.position), asc(actionItemsTable.id));
    const meetingItems = meetingRows.map((r) => ({
      source: "meeting" as const,
      id: r.id,
      item: r.title,
      owner: r.ownerName,
      dueDate: r.dueByFull || null,
      isDailyTop3: r.starred,
      notes: r.notes?.[0]?.label ?? null,
      completed: r.done,
      seatTitle: null as string | null,
    }));

    // Merge in seat tasks from the org chart for any team member of this
    // series. Match either the task's assignee or the seat's named occupant.
    // Roster comes from the canonical join table now — the legacy
    // `meeting_series.members` jsonb has been retired.
    const members = await loadMemberNames(agenda.seriesId);
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

/**
 * Format an ISO date string ("YYYY-MM-DD") into the short "Mon DD"
 * label used everywhere else for action item due dates (e.g. "Apr 23").
 * Returns the em-dash placeholder when the input is empty or unparseable.
 * Parses the date components manually to avoid the timezone shift you
 * get from `new Date("2026-04-23")` (UTC midnight) on locales west of
 * UTC, which would render as the previous day.
 */
function formatDueByShort(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) return trimmed;
  const [, , monthStr, dayStr] = m;
  const monthIdx = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (monthIdx < 0 || monthIdx > 11 || !day) return trimmed;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[monthIdx]} ${day}`;
}

function initialsForName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, 3)
    .join("");
}

/**
 * Best-effort lookup of a team member by display name. The agenda UI
 * still types owners as plain strings (e.g. "Brooks Paine"), so when we
 * upgrade those into canonical action_items rows we try to attach an
 * `ownerTeamMemberId` for stable identity. If the name doesn't match
 * any team member we fall back to the denormalized name + initials —
 * same fallback Phase 1 used for legacy action items.
 */
async function lookupTeamMemberByName(
  name: string,
): Promise<{ id: number; name: string } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const [row] = await db
    .select({ id: teamMembersTable.id, name: teamMembersTable.name })
    .from(teamMembersTable)
    .where(sql`lower(${teamMembersTable.name}) = lower(${trimmed})`)
    .limit(1);
  return row ?? null;
}

router.post(
  "/meeting-agendas/:id/action-items",
  async (req, res): Promise<void> => {
    const agendaId = Number(req.params.id);
    if (!Number.isFinite(agendaId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [agenda] = await db
      .select({
        id: meetingAgendasTable.id,
        seriesId: meetingAgendasTable.seriesId,
      })
      .from(meetingAgendasTable)
      .where(eq(meetingAgendasTable.id, agendaId));
    if (!agenda) {
      res.status(404).json({ error: "Agenda not found" });
      return;
    }
    const item = String(req.body?.item ?? "").trim();
    if (!item) {
      res.status(400).json({ error: "Item is required" });
      return;
    }
    const ownerInput =
      typeof req.body?.owner === "string" ? req.body.owner.trim() : "";
    const dueDate =
      typeof req.body?.dueDate === "string" ? req.body.dueDate : "";
    const isDailyTop3 = Boolean(req.body?.isDailyTop3);
    const notesText =
      typeof req.body?.notes === "string" ? req.body.notes.trim() : "";

    // Resolve the series name once so the canonical `source` column
    // displays a useful label everywhere (sidebar, exports, etc.).
    const [series] = await db
      .select({ name: meetingSeriesTable.name })
      .from(meetingSeriesTable)
      .where(eq(meetingSeriesTable.id, agenda.seriesId));

    let ownerTeamMemberId: number | null = null;
    let ownerName = ownerInput;
    if (ownerInput) {
      const tm = await lookupTeamMemberByName(ownerInput);
      if (tm) {
        ownerTeamMemberId = tm.id;
        ownerName = tm.name;
      }
    }
    if (!ownerName) ownerName = req.authedUser?.name ?? "Unassigned";
    const ownerInitials = initialsForName(ownerName);

    const [row] = await db
      .insert(actionItemsTable)
      .values({
        title: item,
        source: series?.name ?? "Leadership Meeting",
        ownerUserId: null,
        ownerTeamMemberId,
        ownerName,
        ownerInitials,
        dueBy: formatDueByShort(dueDate),
        dueByFull: dueDate,
        notes: notesText ? [{ label: notesText }] : null,
        starred: isDailyTop3,
        done: false,
        sourceKind: "leadership_meeting",
        agendaId,
      })
      .returning();

    // Project back into the legacy AgendaActionItem shape that the UI
    // already understands; the existing query invalidation will refetch
    // the GET above which uses the same projection.
    res.status(201).json({
      source: "meeting",
      id: row.id,
      item: row.title,
      owner: row.ownerName,
      dueDate: row.dueByFull || null,
      isDailyTop3: row.starred,
      notes: row.notes?.[0]?.label ?? null,
      completed: row.done,
      seatTitle: null,
    });
  }
);

export default router;

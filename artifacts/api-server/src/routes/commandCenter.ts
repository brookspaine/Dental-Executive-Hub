import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  ccDirectReportsTable,
  ccProjectsTable,
  ccLifeAreasTable,
  ccTaskSectionsTable,
  ccTasksTable,
  ccBrainDumpTable,
  ccTop3Table,
  futureTodosTable,
} from "@workspace/db";

const router: IRouter = Router();

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

const PARENT_TYPES = ["life_area", "direct_report", "project"] as const;
type ParentType = (typeof PARENT_TYPES)[number];

const TASK_STATUSES = ["not_started", "in_progress", "completed"] as const;

const SEED_LIFE_AREAS = [
  { name: "Health & Fitness", accentColor: "#7fb069", sortOrder: 0 },
  { name: "Finance", accentColor: "#3a7d5e", sortOrder: 1 },
  { name: "Relationships", accentColor: "#c97064", sortOrder: 2 },
  { name: "Personal Growth", accentColor: "#d6a45b", sortOrder: 3 },
  { name: "Home & Environment", accentColor: "#6a8caf", sortOrder: 4 },
];

function todayDateString(): string {
  // YYYY-MM-DD in server local time. Good enough for single-user tool.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

let taskStatusBackfilled = false;
async function ensureTaskStatusBackfilled(): Promise<void> {
  if (taskStatusBackfilled) return;
  taskStatusBackfilled = true;
  await db
    .update(ccTasksTable)
    .set({ status: "completed" })
    .where(and(eq(ccTasksTable.done, true), eq(ccTasksTable.status, "not_started")));
}

async function ensureLifeAreasSeeded(): Promise<void> {
  const existing = await db.select({ id: ccLifeAreasTable.id }).from(ccLifeAreasTable).limit(1);
  if (existing.length > 0) return;
  await db.insert(ccLifeAreasTable).values(SEED_LIFE_AREAS);
}

async function ensureTop3Slots(): Promise<void> {
  const today = todayDateString();
  // Race-safe seed: rely on the unique index on slot.
  for (const slot of [1, 2, 3]) {
    await db
      .insert(ccTop3Table)
      .values({ slot, text: "", date: today })
      .onConflictDoNothing({ target: ccTop3Table.slot });
  }
}

/* -------------------------------------------------------------------------- */
/* Top 3                                                                      */
/* -------------------------------------------------------------------------- */

router.get("/command-center/top3", async (_req, res): Promise<void> => {
  await ensureTop3Slots();
  const rows = await db.select().from(ccTop3Table).orderBy(asc(ccTop3Table.slot));
  res.json(rows);
});

router.put("/command-center/top3/:slot", async (req, res): Promise<void> => {
  const slot = z.coerce.number().int().min(1).max(3).safeParse(req.params.slot);
  const body = z
    .object({ text: z.string().optional(), done: z.boolean().optional() })
    .safeParse(req.body);
  if (!slot.success || !body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await ensureTop3Slots();
  const patch: { text?: string; done?: boolean; date: string } = {
    date: todayDateString(),
  };
  if (body.data.text !== undefined) patch.text = body.data.text;
  if (body.data.done !== undefined) patch.done = body.data.done;
  const [row] = await db
    .update(ccTop3Table)
    .set(patch)
    .where(eq(ccTop3Table.slot, slot.data))
    .returning();
  res.json(row);
});

/* -------------------------------------------------------------------------- */
/* Direct Reports                                                             */
/* -------------------------------------------------------------------------- */

router.get("/command-center/direct-reports", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ccDirectReportsTable)
    .orderBy(asc(ccDirectReportsTable.sortOrder), asc(ccDirectReportsTable.id));
  res.json(rows);
});

router.post("/command-center/direct-reports", async (req, res): Promise<void> => {
  const body = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .insert(ccDirectReportsTable)
    .values({ name: body.data.name })
    .returning();
  res.status(201).json(row);
});

router.patch("/command-center/direct-reports/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({ name: z.string().min(1).optional(), collapsed: z.boolean().optional() })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccDirectReportsTable)
    .set(body.data)
    .where(eq(ccDirectReportsTable.id, id.data))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/command-center/direct-reports/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await db
    .delete(ccTasksTable)
    .where(and(eq(ccTasksTable.parentType, "direct_report"), eq(ccTasksTable.parentId, id.data)));
  // Clear ownership references on tasks owned by this DR (e.g. project tasks)
  await db
    .update(ccTasksTable)
    .set({ ownerDirectReportId: null })
    .where(eq(ccTasksTable.ownerDirectReportId, id.data));
  await db.delete(ccDirectReportsTable).where(eq(ccDirectReportsTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

const PROJECT_STATUSES = ["active", "on_hold", "complete"] as const;

router.get("/command-center/projects", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ccProjectsTable)
    .orderBy(asc(ccProjectsTable.sortOrder), asc(ccProjectsTable.id));
  res.json(rows);
});

router.post("/command-center/projects", async (req, res): Promise<void> => {
  const body = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .insert(ccProjectsTable)
    .values({ name: body.data.name, status: "active" })
    .returning();
  res.status(201).json(row);
});

router.patch("/command-center/projects/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      name: z.string().min(1).optional(),
      status: z.enum(PROJECT_STATUSES).optional(),
      collapsed: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccProjectsTable)
    .set(body.data)
    .where(eq(ccProjectsTable.id, id.data))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/command-center/projects/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await db
    .delete(ccTasksTable)
    .where(and(eq(ccTasksTable.parentType, "project"), eq(ccTasksTable.parentId, id.data)));
  await db.delete(ccProjectsTable).where(eq(ccProjectsTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Life Areas (seeded)                                                        */
/* -------------------------------------------------------------------------- */

router.get("/command-center/life-areas", async (_req, res): Promise<void> => {
  await ensureLifeAreasSeeded();
  const rows = await db
    .select()
    .from(ccLifeAreasTable)
    .orderBy(asc(ccLifeAreasTable.sortOrder), asc(ccLifeAreasTable.id));
  res.json(rows);
});

router.patch("/command-center/life-areas/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({ name: z.string().min(1).optional(), collapsed: z.boolean().optional() })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccLifeAreasTable)
    .set(body.data)
    .where(eq(ccLifeAreasTable.id, id.data))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

router.get("/command-center/tasks", async (req, res): Promise<void> => {
  await ensureTaskStatusBackfilled();
  const q = z
    .object({
      parentType: z.enum(PARENT_TYPES).optional(),
      parentId: z.coerce.number().int().optional(),
    })
    .safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: "invalid query" });
    return;
  }
  // Special case: a direct report's task list also includes project tasks
  // they own (ownerDirectReportId === parentId).
  if (
    q.data.parentType === "direct_report" &&
    q.data.parentId !== undefined
  ) {
    const rows = await db
      .select()
      .from(ccTasksTable)
      .where(
        or(
          and(
            eq(ccTasksTable.parentType, "direct_report"),
            eq(ccTasksTable.parentId, q.data.parentId),
          ),
          eq(ccTasksTable.ownerDirectReportId, q.data.parentId),
        ),
      )
      .orderBy(asc(ccTasksTable.sortOrder), asc(ccTasksTable.id));
    res.json(rows);
    return;
  }
  const conds = [];
  if (q.data.parentType) conds.push(eq(ccTasksTable.parentType, q.data.parentType));
  if (q.data.parentId !== undefined) conds.push(eq(ccTasksTable.parentId, q.data.parentId));
  const rows = await db
    .select()
    .from(ccTasksTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(ccTasksTable.sortOrder), asc(ccTasksTable.id));
  res.json(rows);
});

router.post("/command-center/tasks", async (req, res): Promise<void> => {
  const body = z
    .object({
      parentType: z.enum(PARENT_TYPES),
      parentId: z.number().int(),
      sectionId: z.number().int().nullable().optional(),
      ownerDirectReportId: z.number().int().nullable().optional(),
      text: z.string().min(1),
      status: z.enum(TASK_STATUSES).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const insertData = {
    ...body.data,
    done:
      body.data.status === "completed"
        ? true
        : body.data.status !== undefined
          ? false
          : undefined,
  };
  const [row] = await db.insert(ccTasksTable).values(insertData).returning();
  res.status(201).json(row);
});

router.patch("/command-center/tasks/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      text: z.string().min(1).optional(),
      done: z.boolean().optional(),
      status: z.enum(TASK_STATUSES).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      sectionId: z.number().int().nullable().optional(),
      ownerDirectReportId: z.number().int().nullable().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const patch: Record<string, unknown> = { ...body.data };
  if (patch.status === "completed") patch.done = true;
  else if (patch.status !== undefined) patch.done = false;
  else if (patch.done === true) patch.status = "completed";
  else if (patch.done === false) patch.status = "not_started";
  const [row] = await db
    .update(ccTasksTable)
    .set(patch)
    .where(eq(ccTasksTable.id, id.data))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/command-center/tasks/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await db.delete(ccTasksTable).where(eq(ccTasksTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Task Sections                                                              */
/* -------------------------------------------------------------------------- */

router.get("/command-center/task-sections", async (req, res): Promise<void> => {
  const q = z
    .object({
      parentType: z.enum(PARENT_TYPES).optional(),
      parentId: z.coerce.number().int().optional(),
    })
    .safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: "invalid query" });
    return;
  }
  const conds = [];
  if (q.data.parentType) conds.push(eq(ccTaskSectionsTable.parentType, q.data.parentType));
  if (q.data.parentId !== undefined) conds.push(eq(ccTaskSectionsTable.parentId, q.data.parentId));
  const rows = await db
    .select()
    .from(ccTaskSectionsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(ccTaskSectionsTable.sortOrder), asc(ccTaskSectionsTable.id));
  res.json(rows);
});

router.post("/command-center/task-sections", async (req, res): Promise<void> => {
  const body = z
    .object({
      parentType: z.enum(PARENT_TYPES),
      parentId: z.number().int(),
      name: z.string().min(1),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  // Place new sections at the end.
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${ccTaskSectionsTable.sortOrder}), -1)` })
    .from(ccTaskSectionsTable)
    .where(
      and(
        eq(ccTaskSectionsTable.parentType, body.data.parentType),
        eq(ccTaskSectionsTable.parentId, body.data.parentId),
      ),
    );
  const [row] = await db
    .insert(ccTaskSectionsTable)
    .values({ ...body.data, sortOrder: Number(maxOrder) + 1 })
    .returning();
  res.status(201).json(row);
});

router.patch("/command-center/task-sections/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      name: z.string().min(1).optional(),
      collapsed: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccTaskSectionsTable)
    .set(body.data)
    .where(eq(ccTaskSectionsTable.id, id.data))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/command-center/task-sections/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  // Detach tasks (move to Untitled) rather than deleting them.
  await db
    .update(ccTasksTable)
    .set({ sectionId: null })
    .where(eq(ccTasksTable.sectionId, id.data));
  await db.delete(ccTaskSectionsTable).where(eq(ccTaskSectionsTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Brain Dump                                                                 */
/* -------------------------------------------------------------------------- */

const BRAIN_DUMP_FILTERS = ["inbox", "reference", "someday", "processed", "all"] as const;

router.get("/command-center/brain-dump", async (req, res): Promise<void> => {
  const filter = z
    .enum(BRAIN_DUMP_FILTERS)
    .catch("inbox")
    .parse(req.query.filter ?? "inbox");

  const base = db.select().from(ccBrainDumpTable);
  const where =
    filter === "inbox"
      ? sql`${ccBrainDumpTable.outcome} IS NULL`
      : filter === "reference"
        ? eq(ccBrainDumpTable.outcome, "reference")
        : filter === "someday"
          ? eq(ccBrainDumpTable.outcome, "someday")
          : filter === "processed"
            ? sql`${ccBrainDumpTable.outcome} IS NOT NULL AND ${ccBrainDumpTable.outcome} NOT IN ('reference','someday')`
            : undefined;

  const rows = await (where ? base.where(where) : base).orderBy(
    desc(ccBrainDumpTable.createdAt),
  );
  res.json(rows);
});

router.post("/command-center/brain-dump", async (req, res): Promise<void> => {
  const body = z.object({ text: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db.insert(ccBrainDumpTable).values({ text: body.data.text }).returning();
  res.status(201).json(row);
});

/* GTD process: stamp an outcome + optionally create a routed item.
   Outcomes that don't create anything: trash, reference, someday, done_now.
   Outcomes that create a task: delegated (DR), project (project), today (top3 slot), backlog (future_todo). */
const PROCESS_OUTCOMES = [
  "trash",
  "reference",
  "someday",
  "done_now",
  "delegated",
  "project",
  "today",
  "backlog",
] as const;

router.post("/command-center/brain-dump/:id/process", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      outcome: z.enum(PROCESS_OUTCOMES),
      text: z.string().min(1).optional(),
      directReportId: z.number().int().optional(),
      projectId: z.number().int().optional(),
      ownerDirectReportId: z.number().int().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      slot: z.number().int().min(1).max(3).optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }

  const [entry] = await db
    .select()
    .from(ccBrainDumpTable)
    .where(eq(ccBrainDumpTable.id, id.data));
  if (!entry) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const taskText = body.data.text?.trim() || entry.text;
  let routedTaskId: number | null = null;
  let routedTaskType: string | null = null;

  if (body.data.outcome === "delegated") {
    if (body.data.directReportId == null) {
      res.status(400).json({ error: "directReportId required for delegated outcome" });
      return;
    }
    const [t] = await db
      .insert(ccTasksTable)
      .values({
        parentType: "direct_report",
        parentId: body.data.directReportId,
        text: taskText,
        dueDate: body.data.dueDate ?? null,
      })
      .returning();
    routedTaskId = t.id;
    routedTaskType = "cc_task";
  } else if (body.data.outcome === "project") {
    if (body.data.projectId == null) {
      res.status(400).json({ error: "projectId required for project outcome" });
      return;
    }
    const [t] = await db
      .insert(ccTasksTable)
      .values({
        parentType: "project",
        parentId: body.data.projectId,
        text: taskText,
        dueDate: body.data.dueDate ?? null,
        ownerDirectReportId: body.data.ownerDirectReportId ?? null,
      })
      .returning();
    routedTaskId = t.id;
    routedTaskType = "cc_task";
  } else if (body.data.outcome === "today") {
    if (body.data.slot == null) {
      res.status(400).json({ error: "slot required for today outcome" });
      return;
    }
    // Snapshot the prior slot so undo can restore it
    const [prior] = await db
      .select()
      .from(ccTop3Table)
      .where(eq(ccTop3Table.slot, body.data.slot));
    await db
      .insert(ccTop3Table)
      .values({ slot: body.data.slot, text: taskText })
      .onConflictDoUpdate({
        target: ccTop3Table.slot,
        set: { text: taskText, done: false },
      });
    routedTaskType = "cc_top3";
    // Stash the slot + previous text/done as JSON for undo
    await db
      .update(ccBrainDumpTable)
      .set({
        routedSlot: body.data.slot,
        routedSnapshot: prior
          ? JSON.stringify({ text: prior.text, done: prior.done })
          : JSON.stringify({ text: "", done: false }),
      })
      .where(eq(ccBrainDumpTable.id, id.data));
  } else if (body.data.outcome === "backlog") {
    const [t] = await db
      .insert(futureTodosTable)
      .values({ title: taskText, sortOrder: 0 })
      .returning();
    routedTaskId = t.id;
    routedTaskType = "future_todo";
  }

  const [updated] = await db
    .update(ccBrainDumpTable)
    .set({
      outcome: body.data.outcome,
      processedAt: new Date(),
      routedTaskId,
      routedTaskType,
    })
    .where(eq(ccBrainDumpTable.id, id.data))
    .returning();
  res.json(updated);
});

router.post("/command-center/brain-dump/:id/unprocess", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [entry] = await db
    .select()
    .from(ccBrainDumpTable)
    .where(eq(ccBrainDumpTable.id, id.data));
  if (!entry) {
    res.status(404).json({ error: "not found" });
    return;
  }
  // Best-effort: remove the routed item we created
  if (entry.routedTaskType === "cc_task" && entry.routedTaskId != null) {
    await db.delete(ccTasksTable).where(eq(ccTasksTable.id, entry.routedTaskId));
  } else if (entry.routedTaskType === "future_todo" && entry.routedTaskId != null) {
    await db.delete(futureTodosTable).where(eq(futureTodosTable.id, entry.routedTaskId));
  } else if (entry.routedTaskType === "cc_top3" && entry.routedSlot != null) {
    // Restore the prior Big-3 slot from snapshot (or clear if there was none)
    let snap: { text: string; done: boolean } = { text: "", done: false };
    if (entry.routedSnapshot) {
      try {
        const parsed = JSON.parse(entry.routedSnapshot);
        if (typeof parsed?.text === "string") snap.text = parsed.text;
        if (typeof parsed?.done === "boolean") snap.done = parsed.done;
      } catch {
        // fall through to defaults
      }
    }
    await db
      .update(ccTop3Table)
      .set({ text: snap.text, done: snap.done })
      .where(eq(ccTop3Table.slot, entry.routedSlot));
  }
  const [updated] = await db
    .update(ccBrainDumpTable)
    .set({
      outcome: null,
      processedAt: null,
      routedTaskId: null,
      routedTaskType: null,
      routedSlot: null,
      routedSnapshot: null,
    })
    .where(eq(ccBrainDumpTable.id, id.data))
    .returning();
  res.json(updated);
});

router.patch("/command-center/brain-dump/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z.object({ text: z.string().min(1) }).safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccBrainDumpTable)
    .set(body.data)
    .where(eq(ccBrainDumpTable.id, id.data))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/command-center/brain-dump/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await db.delete(ccBrainDumpTable).where(eq(ccBrainDumpTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Overview (stats + snapshot)                                                */
/* -------------------------------------------------------------------------- */

type SnapshotGroup = {
  parentType: ParentType;
  parentId: number;
  parentName: string;
  tasks: Array<{ id: number; text: string }>;
};

router.get("/command-center/overview", async (_req, res): Promise<void> => {
  await ensureLifeAreasSeeded();
  await ensureTop3Slots();

  const [top3, lifeAreas, directReports, projects, brainDumpCountRow, openTasks] =
    await Promise.all([
      db.select().from(ccTop3Table).orderBy(asc(ccTop3Table.slot)),
      db.select().from(ccLifeAreasTable).orderBy(asc(ccLifeAreasTable.sortOrder)),
      db.select().from(ccDirectReportsTable).orderBy(asc(ccDirectReportsTable.sortOrder)),
      db.select().from(ccProjectsTable).orderBy(asc(ccProjectsTable.sortOrder)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(ccBrainDumpTable),
      db
        .select()
        .from(ccTasksTable)
        .where(eq(ccTasksTable.done, false))
        .orderBy(asc(ccTasksTable.sortOrder), asc(ccTasksTable.id)),
    ]);

  const counts = { life_area: 0, direct_report: 0, project: 0 } as Record<ParentType, number>;
  for (const t of openTasks) {
    if (t.parentType in counts) counts[t.parentType as ParentType]++;
  }

  const nameLookup = new Map<string, string>();
  for (const x of lifeAreas) nameLookup.set(`life_area:${x.id}`, x.name);
  for (const x of directReports) nameLookup.set(`direct_report:${x.id}`, x.name);
  for (const x of projects) nameLookup.set(`project:${x.id}`, x.name);

  // Snapshot: up to 2 open tasks per (parentType, parentId)
  const grouped = new Map<string, SnapshotGroup>();
  for (const t of openTasks) {
    const key = `${t.parentType}:${t.parentId}`;
    const parentName = nameLookup.get(key);
    if (!parentName) continue;
    let g = grouped.get(key);
    if (!g) {
      g = {
        parentType: t.parentType as ParentType,
        parentId: t.parentId,
        parentName,
        tasks: [],
      };
      grouped.set(key, g);
    }
    if (g.tasks.length < 2) g.tasks.push({ id: t.id, text: t.text });
  }

  res.json({
    top3,
    stats: {
      openLifeTasks: counts.life_area,
      openTeamItems: counts.direct_report,
      openProjectTasks: counts.project,
      brainDumpCount: brainDumpCountRow[0]?.count ?? 0,
    },
    snapshot: Array.from(grouped.values()),
  });
});

export default router;

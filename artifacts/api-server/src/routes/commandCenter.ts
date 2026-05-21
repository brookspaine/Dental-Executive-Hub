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
import { getBusinessId } from "../lib/businessScope";

/**
 * Shared Command Center router. Mounted under both `/command-center`
 * (with `fromHeader()` middleware) and `/urgent-dental` (with
 * `fixed(2)` middleware) so the two surfaces share data, scoped by business.
 */
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

const seededLifeAreasForBusiness = new Set<number>();
async function ensureLifeAreasSeeded(businessId: number): Promise<void> {
  if (seededLifeAreasForBusiness.has(businessId)) return;
  const existing = await db
    .select({ id: ccLifeAreasTable.id })
    .from(ccLifeAreasTable)
    .where(eq(ccLifeAreasTable.businessId, businessId))
    .limit(1);
  if (existing.length === 0) {
    await db
      .insert(ccLifeAreasTable)
      .values(SEED_LIFE_AREAS.map((a) => ({ ...a, businessId })));
  }
  seededLifeAreasForBusiness.add(businessId);
}

async function ensureTop3Slots(businessId: number): Promise<void> {
  const today = todayDateString();
  for (const slot of [1, 2, 3]) {
    await db
      .insert(ccTop3Table)
      .values({ slot, text: "", date: today, businessId })
      .onConflictDoNothing({ target: [ccTop3Table.businessId, ccTop3Table.slot] });
  }
}

/** Verify a parent id belongs to the current business — guards cross-business writes. */
async function parentInBusiness(
  parentType: ParentType,
  parentId: number,
  businessId: number,
): Promise<boolean> {
  const table =
    parentType === "direct_report"
      ? ccDirectReportsTable
      : parentType === "project"
        ? ccProjectsTable
        : ccLifeAreasTable;
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, parentId), eq(table.businessId, businessId)))
    .limit(1);
  return rows.length > 0;
}

/** Fetch a task only if its parent belongs to the current business. */
async function taskInBusiness(taskId: number, businessId: number) {
  const [row] = await db
    .select({ task: ccTasksTable })
    .from(ccTasksTable)
    .where(eq(ccTasksTable.id, taskId))
    .limit(1);
  if (!row) return null;
  const ok = await parentInBusiness(
    row.task.parentType as ParentType,
    row.task.parentId,
    businessId,
  );
  return ok ? row.task : null;
}

/** Fetch a task section only if its parent belongs to the current business. */
async function sectionInBusiness(sectionId: number, businessId: number) {
  const [row] = await db
    .select({ section: ccTaskSectionsTable })
    .from(ccTaskSectionsTable)
    .where(eq(ccTaskSectionsTable.id, sectionId))
    .limit(1);
  if (!row) return null;
  const ok = await parentInBusiness(
    row.section.parentType as ParentType,
    row.section.parentId,
    businessId,
  );
  return ok ? row.section : null;
}

/* -------------------------------------------------------------------------- */
/* Top 3                                                                      */
/* -------------------------------------------------------------------------- */

router.get("/top3", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  await ensureTop3Slots(businessId);
  const rows = await db
    .select()
    .from(ccTop3Table)
    .where(eq(ccTop3Table.businessId, businessId))
    .orderBy(asc(ccTop3Table.slot));
  res.json(rows);
});

router.put("/top3/:slot", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const slot = z.coerce.number().int().min(1).max(3).safeParse(req.params.slot);
  const body = z
    .object({ text: z.string().optional(), done: z.boolean().optional() })
    .safeParse(req.body);
  if (!slot.success || !body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await ensureTop3Slots(businessId);
  const patch: { text?: string; done?: boolean; date: string } = {
    date: todayDateString(),
  };
  if (body.data.text !== undefined) patch.text = body.data.text;
  if (body.data.done !== undefined) patch.done = body.data.done;
  const [row] = await db
    .update(ccTop3Table)
    .set(patch)
    .where(and(eq(ccTop3Table.slot, slot.data), eq(ccTop3Table.businessId, businessId)))
    .returning();
  res.json(row);
});

/* -------------------------------------------------------------------------- */
/* Direct Reports                                                             */
/* -------------------------------------------------------------------------- */

router.get("/direct-reports", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const rows = await db
    .select()
    .from(ccDirectReportsTable)
    .where(eq(ccDirectReportsTable.businessId, businessId))
    .orderBy(asc(ccDirectReportsTable.sortOrder), asc(ccDirectReportsTable.id));
  res.json(rows);
});

router.post("/direct-reports", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const body = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .insert(ccDirectReportsTable)
    .values({ name: body.data.name, businessId })
    .returning();
  res.status(201).json(row);
});

router.patch("/direct-reports/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      name: z.string().min(1).optional(),
      collapsed: z.boolean().optional(),
      businessId: z.number().int().positive().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccDirectReportsTable)
    .set(body.data)
    .where(
      and(eq(ccDirectReportsTable.id, id.data), eq(ccDirectReportsTable.businessId, businessId)),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/direct-reports/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  // Guard: only operate if DR belongs to current business
  const owned = await parentInBusiness("direct_report", id.data, businessId);
  if (!owned) {
    res.sendStatus(204);
    return;
  }
  await db
    .delete(ccTasksTable)
    .where(and(eq(ccTasksTable.parentType, "direct_report"), eq(ccTasksTable.parentId, id.data)));
  // Scope owner-null cleanup to project tasks in this business.
  const businessProjects = await db
    .select({ id: ccProjectsTable.id })
    .from(ccProjectsTable)
    .where(eq(ccProjectsTable.businessId, businessId));
  if (businessProjects.length > 0) {
    await db
      .update(ccTasksTable)
      .set({ ownerDirectReportId: null })
      .where(
        and(
          eq(ccTasksTable.ownerDirectReportId, id.data),
          eq(ccTasksTable.parentType, "project"),
          inArray(ccTasksTable.parentId, businessProjects.map((p) => p.id)),
        ),
      );
  }
  await db.delete(ccDirectReportsTable).where(eq(ccDirectReportsTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

const PROJECT_STATUSES = ["active", "on_hold", "complete"] as const;

router.get("/projects", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const rows = await db
    .select()
    .from(ccProjectsTable)
    .where(eq(ccProjectsTable.businessId, businessId))
    .orderBy(asc(ccProjectsTable.sortOrder), asc(ccProjectsTable.id));
  res.json(rows);
});

router.post("/projects", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const body = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .insert(ccProjectsTable)
    .values({ name: body.data.name, status: "active", businessId })
    .returning();
  res.status(201).json(row);
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      name: z.string().min(1).optional(),
      status: z.enum(PROJECT_STATUSES).optional(),
      collapsed: z.boolean().optional(),
      businessId: z.number().int().positive().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccProjectsTable)
    .set(body.data)
    .where(and(eq(ccProjectsTable.id, id.data), eq(ccProjectsTable.businessId, businessId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const owned = await parentInBusiness("project", id.data, businessId);
  if (!owned) {
    res.sendStatus(204);
    return;
  }
  await db
    .delete(ccTasksTable)
    .where(and(eq(ccTasksTable.parentType, "project"), eq(ccTasksTable.parentId, id.data)));
  await db.delete(ccProjectsTable).where(eq(ccProjectsTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Life Areas                                                                 */
/* -------------------------------------------------------------------------- */

router.get("/life-areas", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  await ensureLifeAreasSeeded(businessId);
  const rows = await db
    .select()
    .from(ccLifeAreasTable)
    .where(eq(ccLifeAreasTable.businessId, businessId))
    .orderBy(asc(ccLifeAreasTable.sortOrder), asc(ccLifeAreasTable.id));
  res.json(rows);
});

router.patch("/life-areas/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      name: z.string().min(1).optional(),
      collapsed: z.boolean().optional(),
      businessId: z.number().int().positive().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccLifeAreasTable)
    .set(body.data)
    .where(and(eq(ccLifeAreasTable.id, id.data), eq(ccLifeAreasTable.businessId, businessId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

/* -------------------------------------------------------------------------- */
/* Tasks (business inherited from parent — no business_id column on tasks)    */
/* -------------------------------------------------------------------------- */

router.get("/tasks", async (req, res): Promise<void> => {
  await ensureTaskStatusBackfilled();
  const businessId = getBusinessId(req);
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
  // If filtering by a specific parent, verify it belongs to this business first.
  if (q.data.parentType && q.data.parentId !== undefined) {
    const ok = await parentInBusiness(q.data.parentType, q.data.parentId, businessId);
    if (!ok) {
      res.json([]);
      return;
    }
  }
  // Direct-report tab: tasks owned by parent OR project tasks owned by this person.
  if (q.data.parentType === "direct_report" && q.data.parentId !== undefined) {
    // Scope owned project tasks to projects in the current business.
    const businessProjects = await db
      .select({ id: ccProjectsTable.id })
      .from(ccProjectsTable)
      .where(eq(ccProjectsTable.businessId, businessId));
    const projectIds = businessProjects.map((p) => p.id);
    const rows = await db
      .select()
      .from(ccTasksTable)
      .where(
        or(
          and(
            eq(ccTasksTable.parentType, "direct_report"),
            eq(ccTasksTable.parentId, q.data.parentId),
          ),
          projectIds.length
            ? and(
                eq(ccTasksTable.ownerDirectReportId, q.data.parentId),
                eq(ccTasksTable.parentType, "project"),
                inArray(ccTasksTable.parentId, projectIds),
              )
            : sql`false`,
        ),
      )
      .orderBy(asc(ccTasksTable.sortOrder), asc(ccTasksTable.id));
    res.json(rows);
    return;
  }
  // General case: business-scope via parent join per parent type.
  const conds = [];
  if (q.data.parentType) conds.push(eq(ccTasksTable.parentType, q.data.parentType));
  if (q.data.parentId !== undefined) conds.push(eq(ccTasksTable.parentId, q.data.parentId));
  // Restrict to parents in this business across all three parent types.
  const [drIds, projIds, laIds] = await Promise.all([
    db.select({ id: ccDirectReportsTable.id }).from(ccDirectReportsTable)
      .where(eq(ccDirectReportsTable.businessId, businessId)),
    db.select({ id: ccProjectsTable.id }).from(ccProjectsTable)
      .where(eq(ccProjectsTable.businessId, businessId)),
    db.select({ id: ccLifeAreasTable.id }).from(ccLifeAreasTable)
      .where(eq(ccLifeAreasTable.businessId, businessId)),
  ]);
  const businessParentCond = or(
    drIds.length
      ? and(eq(ccTasksTable.parentType, "direct_report"), inArray(ccTasksTable.parentId, drIds.map((r) => r.id)))
      : sql`false`,
    projIds.length
      ? and(eq(ccTasksTable.parentType, "project"), inArray(ccTasksTable.parentId, projIds.map((r) => r.id)))
      : sql`false`,
    laIds.length
      ? and(eq(ccTasksTable.parentType, "life_area"), inArray(ccTasksTable.parentId, laIds.map((r) => r.id)))
      : sql`false`,
  );
  conds.push(businessParentCond);
  const rows = await db
    .select()
    .from(ccTasksTable)
    .where(and(...conds))
    .orderBy(asc(ccTasksTable.sortOrder), asc(ccTasksTable.id));
  res.json(rows);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
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
  // Cross-business guard: only allow attaching tasks to a parent in the current business.
  const ok = await parentInBusiness(body.data.parentType, body.data.parentId, businessId);
  if (!ok) {
    res.status(403).json({ error: "parent not in current business" });
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

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
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
  const existing = await taskInBusiness(id.data, businessId);
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  // Guard cross-business owner reassignment.
  if (body.data.ownerDirectReportId != null) {
    const ok = await parentInBusiness("direct_report", body.data.ownerDirectReportId, businessId);
    if (!ok) {
      res.status(403).json({ error: "owner not in current business" });
      return;
    }
  }
  // Guard cross-business section reassignment.
  if (body.data.sectionId != null) {
    const sec = await sectionInBusiness(body.data.sectionId, businessId);
    if (!sec) {
      res.status(403).json({ error: "section not in current business" });
      return;
    }
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
  res.json(row);
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const existing = await taskInBusiness(id.data, businessId);
  if (!existing) {
    res.sendStatus(204);
    return;
  }
  await db.delete(ccTasksTable).where(eq(ccTasksTable.id, id.data));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Task Sections                                                              */
/* -------------------------------------------------------------------------- */

router.get("/task-sections", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
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
  if (q.data.parentType && q.data.parentId !== undefined) {
    const ok = await parentInBusiness(q.data.parentType, q.data.parentId, businessId);
    if (!ok) {
      res.json([]);
      return;
    }
  }
  const conds = [];
  if (q.data.parentType) conds.push(eq(ccTaskSectionsTable.parentType, q.data.parentType));
  if (q.data.parentId !== undefined) conds.push(eq(ccTaskSectionsTable.parentId, q.data.parentId));
  // Always restrict to parents in this business.
  const [drIds, projIds, laIds] = await Promise.all([
    db.select({ id: ccDirectReportsTable.id }).from(ccDirectReportsTable)
      .where(eq(ccDirectReportsTable.businessId, businessId)),
    db.select({ id: ccProjectsTable.id }).from(ccProjectsTable)
      .where(eq(ccProjectsTable.businessId, businessId)),
    db.select({ id: ccLifeAreasTable.id }).from(ccLifeAreasTable)
      .where(eq(ccLifeAreasTable.businessId, businessId)),
  ]);
  conds.push(
    or(
      drIds.length
        ? and(eq(ccTaskSectionsTable.parentType, "direct_report"), inArray(ccTaskSectionsTable.parentId, drIds.map((r) => r.id)))
        : sql`false`,
      projIds.length
        ? and(eq(ccTaskSectionsTable.parentType, "project"), inArray(ccTaskSectionsTable.parentId, projIds.map((r) => r.id)))
        : sql`false`,
      laIds.length
        ? and(eq(ccTaskSectionsTable.parentType, "life_area"), inArray(ccTaskSectionsTable.parentId, laIds.map((r) => r.id)))
        : sql`false`,
    ),
  );
  const rows = await db
    .select()
    .from(ccTaskSectionsTable)
    .where(and(...conds))
    .orderBy(asc(ccTaskSectionsTable.sortOrder), asc(ccTaskSectionsTable.id));
  res.json(rows);
});

router.post("/task-sections", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
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
  const ok = await parentInBusiness(body.data.parentType, body.data.parentId, businessId);
  if (!ok) {
    res.status(403).json({ error: "parent not in current business" });
    return;
  }
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

router.patch("/task-sections/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
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
  const existing = await sectionInBusiness(id.data, businessId);
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const [row] = await db
    .update(ccTaskSectionsTable)
    .set(body.data)
    .where(eq(ccTaskSectionsTable.id, id.data))
    .returning();
  res.json(row);
});

router.delete("/task-sections/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const existing = await sectionInBusiness(id.data, businessId);
  if (!existing) {
    res.sendStatus(204);
    return;
  }
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

router.get("/brain-dump", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const filter = z
    .enum(BRAIN_DUMP_FILTERS)
    .catch("inbox")
    .parse(req.query.filter ?? "inbox");

  const businessCond = eq(ccBrainDumpTable.businessId, businessId);
  const filterCond =
    filter === "inbox"
      ? sql`${ccBrainDumpTable.outcome} IS NULL`
      : filter === "reference"
        ? eq(ccBrainDumpTable.outcome, "reference")
        : filter === "someday"
          ? eq(ccBrainDumpTable.outcome, "someday")
          : filter === "processed"
            ? sql`${ccBrainDumpTable.outcome} IS NOT NULL AND ${ccBrainDumpTable.outcome} NOT IN ('reference','someday')`
            : undefined;

  const where = filterCond ? and(businessCond, filterCond) : businessCond;

  const rows = await db
    .select()
    .from(ccBrainDumpTable)
    .where(where)
    .orderBy(desc(ccBrainDumpTable.createdAt));
  res.json(rows);
});

router.post("/brain-dump", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const body = z.object({ text: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .insert(ccBrainDumpTable)
    .values({ text: body.data.text, businessId })
    .returning();
  res.status(201).json(row);
});

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

router.post("/brain-dump/:id/process", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
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
    .where(and(eq(ccBrainDumpTable.id, id.data), eq(ccBrainDumpTable.businessId, businessId)));
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
    const drOk = await parentInBusiness("direct_report", body.data.directReportId, businessId);
    if (!drOk) {
      res.status(403).json({ error: "direct report not in current business" });
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
    const projOk = await parentInBusiness("project", body.data.projectId, businessId);
    if (!projOk) {
      res.status(403).json({ error: "project not in current business" });
      return;
    }
    if (body.data.ownerDirectReportId != null) {
      const ownerOk = await parentInBusiness(
        "direct_report",
        body.data.ownerDirectReportId,
        businessId,
      );
      if (!ownerOk) {
        res.status(403).json({ error: "owner not in current business" });
        return;
      }
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
    const [prior] = await db
      .select()
      .from(ccTop3Table)
      .where(
        and(eq(ccTop3Table.slot, body.data.slot), eq(ccTop3Table.businessId, businessId)),
      );
    await db
      .insert(ccTop3Table)
      .values({ slot: body.data.slot, text: taskText, businessId })
      .onConflictDoUpdate({
        target: [ccTop3Table.businessId, ccTop3Table.slot],
        set: { text: taskText, done: false },
      });
    routedTaskType = "cc_top3";
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
      .values({ title: taskText, sortOrder: 0, businessId })
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

router.post("/brain-dump/:id/unprocess", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [entry] = await db
    .select()
    .from(ccBrainDumpTable)
    .where(and(eq(ccBrainDumpTable.id, id.data), eq(ccBrainDumpTable.businessId, businessId)));
  if (!entry) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (entry.routedTaskType === "cc_task" && entry.routedTaskId != null) {
    // Only delete the routed task if its parent still belongs to this business
    // (guards against deleting another business's data after re-tagging).
    const routed = await taskInBusiness(entry.routedTaskId, businessId);
    if (routed) {
      await db.delete(ccTasksTable).where(eq(ccTasksTable.id, entry.routedTaskId));
    }
  } else if (entry.routedTaskType === "future_todo" && entry.routedTaskId != null) {
    await db
      .delete(futureTodosTable)
      .where(
        and(
          eq(futureTodosTable.id, entry.routedTaskId),
          eq(futureTodosTable.businessId, businessId),
        ),
      );
  } else if (entry.routedTaskType === "cc_top3" && entry.routedSlot != null) {
    let snap: { text: string; done: boolean } = { text: "", done: false };
    if (entry.routedSnapshot) {
      try {
        const parsed = JSON.parse(entry.routedSnapshot);
        if (typeof parsed?.text === "string") snap.text = parsed.text;
        if (typeof parsed?.done === "boolean") snap.done = parsed.done;
      } catch {
        /* keep defaults */
      }
    }
    await db
      .update(ccTop3Table)
      .set({ text: snap.text, done: snap.done })
      .where(
        and(eq(ccTop3Table.slot, entry.routedSlot), eq(ccTop3Table.businessId, businessId)),
      );
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

router.patch("/brain-dump/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      text: z.string().min(1).optional(),
      businessId: z.number().int().positive().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccBrainDumpTable)
    .set(body.data)
    .where(and(eq(ccBrainDumpTable.id, id.data), eq(ccBrainDumpTable.businessId, businessId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/brain-dump/:id", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  const id = z.coerce.number().int().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await db
    .delete(ccBrainDumpTable)
    .where(and(eq(ccBrainDumpTable.id, id.data), eq(ccBrainDumpTable.businessId, businessId)));
  res.sendStatus(204);
});

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

type SnapshotGroup = {
  parentType: ParentType;
  parentId: number;
  parentName: string;
  tasks: Array<{ id: number; text: string }>;
};

router.get("/overview", async (req, res): Promise<void> => {
  const businessId = getBusinessId(req);
  await ensureLifeAreasSeeded(businessId);
  await ensureTop3Slots(businessId);

  const [top3, lifeAreas, directReports, projects, brainDumpCountRow] = await Promise.all([
    db
      .select()
      .from(ccTop3Table)
      .where(eq(ccTop3Table.businessId, businessId))
      .orderBy(asc(ccTop3Table.slot)),
    db
      .select()
      .from(ccLifeAreasTable)
      .where(eq(ccLifeAreasTable.businessId, businessId))
      .orderBy(asc(ccLifeAreasTable.sortOrder)),
    db
      .select()
      .from(ccDirectReportsTable)
      .where(eq(ccDirectReportsTable.businessId, businessId))
      .orderBy(asc(ccDirectReportsTable.sortOrder)),
    db
      .select()
      .from(ccProjectsTable)
      .where(eq(ccProjectsTable.businessId, businessId))
      .orderBy(asc(ccProjectsTable.sortOrder)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(ccBrainDumpTable)
      .where(eq(ccBrainDumpTable.businessId, businessId)),
  ]);

  // Now fetch only tasks belonging to in-business parents.
  const parentKeys: Array<{ type: ParentType; ids: number[] }> = [
    { type: "life_area", ids: lifeAreas.map((x) => x.id) },
    { type: "direct_report", ids: directReports.map((x) => x.id) },
    { type: "project", ids: projects.map((x) => x.id) },
  ];

  let openTasks: Array<typeof ccTasksTable.$inferSelect> = [];
  const orConds = parentKeys
    .filter((k) => k.ids.length > 0)
    .map((k) =>
      and(
        eq(ccTasksTable.parentType, k.type),
        sql`${ccTasksTable.parentId} IN (${sql.join(
          k.ids.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    );
  if (orConds.length > 0) {
    openTasks = await db
      .select()
      .from(ccTasksTable)
      .where(and(eq(ccTasksTable.done, false), or(...orConds)))
      .orderBy(asc(ccTasksTable.sortOrder), asc(ccTasksTable.id));
  }

  const counts = { life_area: 0, direct_report: 0, project: 0 } as Record<ParentType, number>;
  for (const t of openTasks) {
    if (t.parentType in counts) counts[t.parentType as ParentType]++;
  }

  const nameLookup = new Map<string, string>();
  for (const x of lifeAreas) nameLookup.set(`life_area:${x.id}`, x.name);
  for (const x of directReports) nameLookup.set(`direct_report:${x.id}`, x.name);
  for (const x of projects) nameLookup.set(`project:${x.id}`, x.name);

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

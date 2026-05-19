import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  ccDirectReportsTable,
  ccProjectsTable,
  ccLifeAreasTable,
  ccTasksTable,
  ccBrainDumpTable,
  ccTop3Table,
} from "@workspace/db";

const router: IRouter = Router();

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

const PARENT_TYPES = ["life_area", "direct_report", "project"] as const;
type ParentType = (typeof PARENT_TYPES)[number];

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
  const rows = await db.select().from(ccTop3Table);
  for (const r of rows) {
    if (r.date !== today) {
      await db
        .update(ccTop3Table)
        .set({ text: "", date: today })
        .where(eq(ccTop3Table.id, r.id));
    }
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
  const body = z.object({ text: z.string() }).safeParse(req.body);
  if (!slot.success || !body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  await ensureTop3Slots();
  const [row] = await db
    .update(ccTop3Table)
    .set({ text: body.data.text, date: todayDateString() })
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
      text: z.string().min(1),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db.insert(ccTasksTable).values(body.data).returning();
  res.status(201).json(row);
});

router.patch("/command-center/tasks/:id", async (req, res): Promise<void> => {
  const id = z.coerce.number().int().safeParse(req.params.id);
  const body = z
    .object({
      text: z.string().min(1).optional(),
      done: z.boolean().optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    })
    .safeParse(req.body);
  if (!id.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const [row] = await db
    .update(ccTasksTable)
    .set(body.data)
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
/* Brain Dump                                                                 */
/* -------------------------------------------------------------------------- */

router.get("/command-center/brain-dump", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ccBrainDumpTable)
    .orderBy(desc(ccBrainDumpTable.createdAt));
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

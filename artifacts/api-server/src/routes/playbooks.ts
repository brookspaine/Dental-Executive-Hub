import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, playbooksTable } from "@workspace/db";
import {
  CreatePlaybookBody,
  UpdatePlaybookBody,
  UpdatePlaybookParams,
  ListPlaybooksResponse,
  UpdatePlaybookResponse,
} from "@workspace/api-zod";
import { ensureSeeded as ensureRolesAndPlaybooksSeeded } from "./roles.js";

const router: IRouter = Router();

function serializeRow(row: typeof playbooksTable.$inferSelect) {
  return {
    ...row,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/playbooks", async (_req, res): Promise<void> => {
  await ensureRolesAndPlaybooksSeeded();
  const items = await db
    .select()
    .from(playbooksTable)
    .orderBy(asc(playbooksTable.id));
  res.json(ListPlaybooksResponse.parse(items.map(serializeRow)));
});

router.get("/playbooks/:id", async (req, res): Promise<void> => {
  await ensureRolesAndPlaybooksSeeded();
  const params = UpdatePlaybookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .select()
    .from(playbooksTable)
    .where(eq(playbooksTable.id, params.data.id))
    .limit(1);
  if (!item) {
    res.status(404).json({ error: "Playbook not found" });
    return;
  }
  res.json(UpdatePlaybookResponse.parse(serializeRow(item)));
});

router.post("/playbooks", async (req, res): Promise<void> => {
  const parsed = CreatePlaybookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [item] = await db
    .insert(playbooksTable)
    .values({
      title: data.title,
      category: data.category ?? "Operational Process",
      purpose: data.purpose ?? "",
      whenToUse: data.whenToUse ?? "",
      steps: data.steps ?? [],
      decisionPoints: data.decisionPoints ?? "",
      commonPitfalls: data.commonPitfalls ?? "",
      relatedPlaybookIds: data.relatedPlaybookIds ?? [],
      roleIds: data.roleIds ?? [],
      lastReviewedBy: data.lastReviewedBy ?? "",
      lastReviewedAt: new Date(),
    })
    .returning();
  res.status(201).json(UpdatePlaybookResponse.parse(serializeRow(item)));
});

router.patch("/playbooks/:id", async (req, res): Promise<void> => {
  const params = UpdatePlaybookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePlaybookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(playbooksTable)
    .where(eq(playbooksTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Playbook not found" });
    return;
  }
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }
  updates.lastReviewedAt = new Date();
  updates.updatedAt = new Date();
  const [item] = await db
    .update(playbooksTable)
    .set(updates)
    .where(eq(playbooksTable.id, params.data.id))
    .returning();
  res.json(UpdatePlaybookResponse.parse(serializeRow(item)));
});

router.delete("/playbooks/:id", async (req, res): Promise<void> => {
  const params = UpdatePlaybookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .delete(playbooksTable)
    .where(eq(playbooksTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Playbook not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

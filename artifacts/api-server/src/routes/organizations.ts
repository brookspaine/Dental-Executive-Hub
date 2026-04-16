import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, organizationsTable, activityTable, directReportsTable } from "@workspace/db";
import {
  CreateOrganizationBody,
  GetOrganizationParams,
  GetOrganizationResponse,
  UpdateOrganizationParams,
  UpdateOrganizationBody,
  UpdateOrganizationResponse,
  DeleteOrganizationParams,
  ListOrganizationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/organizations", async (_req, res): Promise<void> => {
  const orgs = await db
    .select()
    .from(organizationsTable)
    .orderBy(organizationsTable.name);
  const mapped = orgs.map((o) => ({
    ...o,
    category: o.category ?? "edge",
    phone: o.phone ?? undefined,
    email: o.email ?? undefined,
  }));
  res.json(ListOrganizationsResponse.parse(mapped));
});

router.post("/organizations", async (req, res): Promise<void> => {
  const parsed = CreateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [org] = await db
    .insert(organizationsTable)
    .values(parsed.data)
    .returning();

  await db.insert(activityTable).values({
    type: "org_updated",
    message: `New location "${org.name}" was added`,
    entityName: org.name,
  });

  res.status(201).json(GetOrganizationResponse.parse({
    ...org,
    category: org.category ?? "edge",
    phone: org.phone ?? undefined,
    email: org.email ?? undefined,
  }));
});

router.get("/organizations/:id", async (req, res): Promise<void> => {
  const params = GetOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, params.data.id));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json(GetOrganizationResponse.parse({
    ...org,
    category: org.category ?? "edge",
    phone: org.phone ?? undefined,
    email: org.email ?? undefined,
  }));
});

router.patch("/organizations/:id", async (req, res): Promise<void> => {
  const params = UpdateOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [org] = await db
    .update(organizationsTable)
    .set(parsed.data)
    .where(eq(organizationsTable.id, params.data.id))
    .returning();

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  await db.insert(activityTable).values({
    type: "org_updated",
    message: `Location "${org.name}" was updated`,
    entityName: org.name,
  });

  res.json(UpdateOrganizationResponse.parse({
    ...org,
    category: org.category ?? "edge",
    phone: org.phone ?? undefined,
    email: org.email ?? undefined,
  }));
});

router.delete("/organizations/:id", async (req, res): Promise<void> => {
  const params = DeleteOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .update(directReportsTable)
    .set({ organizationId: null })
    .where(eq(directReportsTable.organizationId, params.data.id));

  const [org] = await db
    .delete(organizationsTable)
    .where(eq(organizationsTable.id, params.data.id))
    .returning();

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

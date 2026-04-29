import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  directReportsTable,
  organizationsTable,
  activityTable,
  viewAsMeGrantsTable,
  additionalViewersTable,
} from "@workspace/db";
import {
  CreateDirectReportBody,
  GetDirectReportParams,
  GetDirectReportResponse,
  UpdateDirectReportParams,
  UpdateDirectReportBody,
  UpdateDirectReportResponse,
  DeleteDirectReportParams,
  ListDirectReportsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const directReportSelect = {
  id: directReportsTable.id,
  name: directReportsTable.name,
  role: directReportsTable.role,
  email: directReportsTable.email,
  phone: directReportsTable.phone,
  organizationId: directReportsTable.organizationId,
  organization: directReportsTable.organization,
  organizationName: organizationsTable.name,
  status: directReportsTable.status,
  hireDate: directReportsTable.hireDate,
  performanceRating: directReportsTable.performanceRating,
  avatarUrl: directReportsTable.avatarUrl,
  createdAt: directReportsTable.createdAt,
};

function mapNulls(r: any) {
  const organization = r.organization ?? undefined;
  const joinedName = r.organizationName ?? undefined;
  return {
    ...r,
    phone: r.phone ?? undefined,
    organizationId: r.organizationId ?? undefined,
    organization,
    organizationName: organization ?? joinedName,
    hireDate: r.hireDate ?? undefined,
    performanceRating: r.performanceRating ?? undefined,
    avatarUrl: r.avatarUrl ?? undefined,
  };
}

router.get("/direct-reports", async (_req, res): Promise<void> => {
  const reports = await db
    .select(directReportSelect)
    .from(directReportsTable)
    .leftJoin(organizationsTable, eq(directReportsTable.organizationId, organizationsTable.id))
    .orderBy(directReportsTable.name);
  res.json(ListDirectReportsResponse.parse(reports.map(mapNulls)));
});

router.post("/direct-reports", async (req, res): Promise<void> => {
  const parsed = CreateDirectReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [report] = await db
    .insert(directReportsTable)
    .values({
      ...parsed.data,
      hireDate: parsed.data.hireDate?.toISOString().slice(0, 10),
    })
    .returning();

  await db.insert(activityTable).values({
    type: "report_added",
    message: `${report.name} was added as a direct report`,
    entityName: report.name,
  });

  const [full] = await db
    .select(directReportSelect)
    .from(directReportsTable)
    .leftJoin(organizationsTable, eq(directReportsTable.organizationId, organizationsTable.id))
    .where(eq(directReportsTable.id, report.id));

  res.status(201).json(GetDirectReportResponse.parse(mapNulls(full)));
});

router.get("/direct-reports/:id", async (req, res): Promise<void> => {
  const params = GetDirectReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .select(directReportSelect)
    .from(directReportsTable)
    .leftJoin(organizationsTable, eq(directReportsTable.organizationId, organizationsTable.id))
    .where(eq(directReportsTable.id, params.data.id));

  if (!report) {
    res.status(404).json({ error: "Direct report not found" });
    return;
  }

  res.json(GetDirectReportResponse.parse(mapNulls(report)));
});

router.patch("/direct-reports/:id", async (req, res): Promise<void> => {
  const params = UpdateDirectReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDirectReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(directReportsTable)
    .set({
      ...parsed.data,
      hireDate: parsed.data.hireDate?.toISOString().slice(0, 10),
    })
    .where(eq(directReportsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Direct report not found" });
    return;
  }

  const [full] = await db
    .select(directReportSelect)
    .from(directReportsTable)
    .leftJoin(organizationsTable, eq(directReportsTable.organizationId, organizationsTable.id))
    .where(eq(directReportsTable.id, params.data.id));

  res.json(UpdateDirectReportResponse.parse(mapNulls(full)));
});

router.get(
  "/direct-reports/:id/view-as-me-grants",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select({ granteeTeamMemberId: viewAsMeGrantsTable.granteeTeamMemberId })
      .from(viewAsMeGrantsTable)
      .where(eq(viewAsMeGrantsTable.teamMemberId, id));
    res.json(rows.map((r) => r.granteeTeamMemberId));
  },
);

router.post(
  "/direct-reports/:id/view-as-me-grants",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const granteeReportId = Number(req.body?.granteeReportId);
    if (!Number.isFinite(id) || !Number.isFinite(granteeReportId)) {
      res.status(400).json({ error: "Invalid id or granteeReportId" });
      return;
    }
    if (id === granteeReportId) {
      res
        .status(400)
        .json({ error: "Cannot grant View as Me access to self" });
      return;
    }
    await db
      .insert(viewAsMeGrantsTable)
      .values({ teamMemberId: id, granteeTeamMemberId: granteeReportId })
      .onConflictDoNothing();
    const rows = await db
      .select({ granteeTeamMemberId: viewAsMeGrantsTable.granteeTeamMemberId })
      .from(viewAsMeGrantsTable)
      .where(eq(viewAsMeGrantsTable.teamMemberId, id));
    res.status(201).json(rows.map((r) => r.granteeTeamMemberId));
  },
);

router.delete(
  "/direct-reports/:id/view-as-me-grants/:granteeReportId",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const granteeReportId = Number(req.params.granteeReportId);
    if (!Number.isFinite(id) || !Number.isFinite(granteeReportId)) {
      res.status(400).json({ error: "Invalid id or granteeReportId" });
      return;
    }
    await db
      .delete(viewAsMeGrantsTable)
      .where(
        and(
          eq(viewAsMeGrantsTable.teamMemberId, id),
          eq(viewAsMeGrantsTable.granteeTeamMemberId, granteeReportId),
        ),
      );
    res.sendStatus(204);
  },
);

router.get(
  "/direct-reports/:id/additional-viewers",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select({ viewerTeamMemberId: additionalViewersTable.viewerTeamMemberId })
      .from(additionalViewersTable)
      .where(eq(additionalViewersTable.teamMemberId, id));
    res.json(rows.map((r) => r.viewerTeamMemberId));
  },
);

router.post(
  "/direct-reports/:id/additional-viewers",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const viewerReportId = Number(req.body?.viewerReportId);
    if (!Number.isFinite(id) || !Number.isFinite(viewerReportId)) {
      res.status(400).json({ error: "Invalid id or viewerReportId" });
      return;
    }
    if (id === viewerReportId) {
      res
        .status(400)
        .json({ error: "Cannot add self as Additional Viewer" });
      return;
    }
    await db
      .insert(additionalViewersTable)
      .values({ teamMemberId: id, viewerTeamMemberId: viewerReportId })
      .onConflictDoNothing();
    const rows = await db
      .select({ viewerTeamMemberId: additionalViewersTable.viewerTeamMemberId })
      .from(additionalViewersTable)
      .where(eq(additionalViewersTable.teamMemberId, id));
    res.status(201).json(rows.map((r) => r.viewerTeamMemberId));
  },
);

router.delete(
  "/direct-reports/:id/additional-viewers/:viewerReportId",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const viewerReportId = Number(req.params.viewerReportId);
    if (!Number.isFinite(id) || !Number.isFinite(viewerReportId)) {
      res.status(400).json({ error: "Invalid id or viewerReportId" });
      return;
    }
    await db
      .delete(additionalViewersTable)
      .where(
        and(
          eq(additionalViewersTable.teamMemberId, id),
          eq(additionalViewersTable.viewerTeamMemberId, viewerReportId),
        ),
      );
    res.sendStatus(204);
  },
);

router.delete("/direct-reports/:id", async (req, res): Promise<void> => {
  const params = DeleteDirectReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .delete(directReportsTable)
    .where(eq(directReportsTable.id, params.data.id))
    .returning();

  if (!report) {
    res.status(404).json({ error: "Direct report not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

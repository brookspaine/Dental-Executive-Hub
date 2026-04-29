import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  directReportsTable,
  organizationsTable,
  activityTable,
  viewAsMeGrantsTable,
  additionalViewersTable,
  usersTable,
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
  managerId: directReportsTable.managerId,
  clerkUserId: directReportsTable.clerkUserId,
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
    // managerId / clerkUserId are intentionally surfaced as `null`
    // (not undefined) so clients can distinguish "no value set" from
    // "field absent in this response shape".
    managerId: r.managerId ?? null,
    clerkUserId: r.clerkUserId ?? null,
  };
}

/**
 * Walk a candidate manager chain to make sure assigning `candidateManagerId`
 * to `selfId` would not create a cycle (A reports to B reports to A).
 * Returns true if the assignment is safe.
 */
async function isManagerAssignmentSafe(
  selfId: number,
  candidateManagerId: number,
): Promise<boolean> {
  if (selfId === candidateManagerId) return false;
  let cursor: number | null = candidateManagerId;
  const seen = new Set<number>();
  while (cursor !== null) {
    if (cursor === selfId) return false;
    if (seen.has(cursor)) return false; // pre-existing cycle, defensively reject
    seen.add(cursor);
    const [row] = await db
      .select({ managerId: directReportsTable.managerId })
      .from(directReportsTable)
      .where(eq(directReportsTable.id, cursor));
    cursor = row?.managerId ?? null;
  }
  return true;
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

  // managerId on a brand-new row can't form a cycle with itself, but we
  // still want to make sure the candidate manager actually exists.
  if (typeof parsed.data.managerId === "number") {
    const [m] = await db
      .select({ id: directReportsTable.id })
      .from(directReportsTable)
      .where(eq(directReportsTable.id, parsed.data.managerId));
    if (!m) {
      res.status(400).json({ error: "managerId does not reference an existing team member" });
      return;
    }
  }

  // Validate clerkUserId (if provided): must reference an existing Clerk
  // user and must not already be linked to a different team member. We
  // pre-check rather than relying on the FK / unique-index error so the
  // client gets a meaningful 400/409 instead of a generic 500.
  if (typeof parsed.data.clerkUserId === "string" && parsed.data.clerkUserId.length > 0) {
    const [u] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.clerkUserId));
    if (!u) {
      res.status(400).json({ error: "clerkUserId does not reference an existing user" });
      return;
    }
    const [existing] = await db
      .select({ id: directReportsTable.id })
      .from(directReportsTable)
      .where(eq(directReportsTable.clerkUserId, parsed.data.clerkUserId));
    if (existing) {
      res
        .status(409)
        .json({ error: "Another team member is already linked to that account" });
      return;
    }
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

  // Validate managerId: must reference an existing team member and must
  // not introduce a cycle.
  if (typeof parsed.data.managerId === "number") {
    const [m] = await db
      .select({ id: directReportsTable.id })
      .from(directReportsTable)
      .where(eq(directReportsTable.id, parsed.data.managerId));
    if (!m) {
      res.status(400).json({ error: "managerId does not reference an existing team member" });
      return;
    }
    const safe = await isManagerAssignmentSafe(params.data.id, parsed.data.managerId);
    if (!safe) {
      res.status(400).json({
        error: "Cannot set manager: would create a reporting cycle",
      });
      return;
    }
  }

  // Validate clerkUserId: existence + uniqueness (skip if it's already
  // pointing at the same row, which is a no-op re-save).
  if (typeof parsed.data.clerkUserId === "string" && parsed.data.clerkUserId.length > 0) {
    const [u] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.clerkUserId));
    if (!u) {
      res.status(400).json({ error: "clerkUserId does not reference an existing user" });
      return;
    }
    const [existing] = await db
      .select({ id: directReportsTable.id })
      .from(directReportsTable)
      .where(eq(directReportsTable.clerkUserId, parsed.data.clerkUserId));
    if (existing && existing.id !== params.data.id) {
      res
        .status(409)
        .json({ error: "Another team member is already linked to that account" });
      return;
    }
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

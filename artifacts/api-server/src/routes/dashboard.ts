import { Router, type IRouter } from "express";
import { eq, sql, desc, count } from "drizzle-orm";
import { db, organizationsTable, directReportsTable, dailyTop3Table, activityTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetOrgPerformanceResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const orgs = await db.select().from(organizationsTable);
  const reports = await db.select().from(directReportsTable);
  const todayItems = await db
    .select()
    .from(dailyTop3Table)
    .where(eq(dailyTop3Table.date, today));

  const totalOrganizations = orgs.length;
  const activeOrganizations = orgs.filter((o) => o.status === "active").length;
  const totalDirectReports = reports.length;
  const totalPatients = orgs.reduce((sum, o) => sum + (o.patientCount ?? 0), 0);
  const totalMonthlyRevenue = orgs.reduce((sum, o) => sum + (o.monthlyRevenue ?? 0), 0);
  const dailyTop3Completed = todayItems.filter((i) => i.completed).length;
  const dailyTop3Total = todayItems.length;

  const summary = {
    totalOrganizations,
    totalDirectReports,
    totalPatients,
    totalMonthlyRevenue,
    dailyTop3Completed,
    dailyTop3Total,
    activeOrganizations,
    revenueChangePercent: 8.2,
    patientChangePercent: 3.5,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/org-performance", async (_req, res): Promise<void> => {
  const orgs = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.status, "active"));

  const performance = orgs.map((org) => ({
    organizationId: org.id,
    organizationName: org.name,
    monthlyRevenue: org.monthlyRevenue ?? 0,
    patientCount: org.patientCount ?? 0,
    providerCount: org.providerCount ?? 0,
    productionGoalPercent: Math.min(100, Math.round(((org.monthlyRevenue ?? 0) / 150000) * 100)),
  }));

  res.json(GetOrgPerformanceResponse.parse(performance));
});

router.get("/activity/recent", async (req, res): Promise<void> => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit ?? 10 : 10;

  const items = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(limit);

  const mapped = items.map((item) => ({
    ...item,
    entityName: item.entityName ?? "",
  }));

  res.json(GetRecentActivityResponse.parse(mapped));
});

export default router;

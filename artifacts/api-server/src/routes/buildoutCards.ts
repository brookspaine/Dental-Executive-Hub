import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, buildoutCardsTable } from "@workspace/db";
import {
  CreateBuildoutCardBody,
  UpdateBuildoutCardBody,
  UpdateBuildoutCardParams,
  DeleteBuildoutCardParams,
  AddBuildoutCardActivityBody,
  ListBuildoutCardsResponse,
  UpdateBuildoutCardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  waiting_on: "Waiting On",
  review: "Review",
  done: "Done",
};

const SEED_CARDS = [
  // ---------- Location ----------
  {
    title:
      "Resolve ECR Exhibit E \u201Cprimary or urgent care facility\u201D language",
    ownerName: "Brooks Paine",
    category: "Lease & Legal",
    businessArea: "Location",
    status: "in_progress",
    position: 0,
    definitionOfDone:
      "Exhibit E language deleted or amended to exclude emergency dental; confirmed in writing by Landlord counsel.",
    targetDoneDate: null as string | null,
    categoryFields: {
      counterpartyAndCounsel: "Landlord / Baker Donelson",
      documentReference: "ECR Exhibit E",
      positionAsk: "Strike or amend Exhibit E exclusivity language.",
      fallbackPosition: "Carve-out for emergency dental services.",
      adamWebbReviewStatus: "In Review",
    },
  },
  {
    title: "Transmit lease redline to Baker Donelson",
    ownerName: "Adam Webb",
    category: "Lease & Legal",
    businessArea: "Location",
    status: "waiting_on",
    position: 0,
    definitionOfDone: "Redline sent and receipt confirmed by Baker Donelson.",
    targetDoneDate: null as string | null,
    categoryFields: {
      counterpartyAndCounsel: "Baker Donelson",
      documentReference: "Lease Redline v3",
      positionAsk: "Send redline and request return by EOW.",
      fallbackPosition: "",
      adamWebbReviewStatus: "Returned",
    },
  },
  {
    title: "Submit DNR permit application for emergency dental use",
    ownerName: "Brooks Paine",
    category: "Permitting & DNR",
    businessArea: "Location",
    status: "backlog",
    position: 0,
    definitionOfDone: "DNR permit application submitted and confirmation # received.",
    targetDoneDate: null as string | null,
    categoryFields: {
      permitTypeAndAuthority: "DNR Use Permit / Tennessee DNR",
      applicationStatus: "Pre-Submittal",
      submissionDate: "",
      expectedDecisionDate: "",
      contingencyImpact: true,
    },
  },
  {
    title: "Resolve vinyl color spec on window signage with RSS",
    ownerName: "Brooks Paine",
    category: "Signage",
    businessArea: "Location",
    status: "in_progress",
    position: 0,
    definitionOfDone:
      "RSS confirms vinyl color spec matches EDG brand standard; sample approved.",
    targetDoneDate: null as string | null,
    categoryFields: {
      signType: "Window",
      vendorAndProposal: "RSS / Proposal #2026-118",
      permitStatus: "Not Required",
      landlordApprovalStatus: "Submitted",
      manufactureLeadTime: "3 weeks",
    },
  },
  // ---------- Operations ----------
  {
    title: "Issue PO for CBCT unit",
    ownerName: "Brooks Paine",
    category: "Equipment & IT",
    businessArea: "Operations",
    status: "backlog",
    position: 1,
    definitionOfDone: "PO issued, vendor acknowledgement received, deposit wired.",
    targetDoneDate: null as string | null,
    categoryFields: {
      equipmentCategory: "Imaging",
      vendorAndQuote: "Vatech / Quote #VQ-4421",
      leadTime: "10 weeks",
      installDependency: "Operatory rough-in complete",
      poStatus: "Quoted",
    },
  },
  {
    title: "Execute Treloar & Heisel professional liability binder",
    ownerName: "Brooks Paine",
    category: "Vendor Contracts",
    businessArea: "Operations",
    status: "backlog",
    position: 2,
    definitionOfDone:
      "Binder signed and returned; certificate of insurance issued naming EDG.",
    targetDoneDate: null as string | null,
    categoryFields: {
      vendorType: "Insurance",
      contractTermAndAutoRenewal: "12mo, auto-renew with 60-day notice",
      terminationRights: "30-day notice",
      adamWebbReviewRequired: true,
      counterpartyEntity: "Greyrock Dental Partners LLC",
    },
  },
  // ---------- Financials ----------
  {
    title: "Open Greyrock operating account at primary bank",
    ownerName: "Brooks Paine",
    category: "Banking & Treasury",
    businessArea: "Financials",
    status: "backlog",
    position: 0,
    definitionOfDone:
      "Operating account opened in Greyrock Dental Partners LLC name; signers configured; debit card and online banking active.",
    targetDoneDate: null as string | null,
    categoryFields: {},
  },
  {
    title: "Finalize pre-opening budget with Frank",
    ownerName: "Brooks Paine",
    category: "Budget & Forecasting",
    businessArea: "Financials",
    status: "in_progress",
    position: 0,
    definitionOfDone:
      "Pre-opening budget reviewed line-by-line with Frank; signed off; loaded into the financial model.",
    targetDoneDate: null as string | null,
    categoryFields: {},
  },
  // ---------- People ----------
  {
    title: "Draft EDGE Doctor Partner Track one-pager",
    ownerName: "Brooks Paine",
    category: "Doctor Recruiting (Partner Track)",
    businessArea: "People",
    status: "backlog",
    position: 0,
    definitionOfDone:
      "One-page recruiting doc explaining the EDGE Partner Track economics, vesting, and culture; reviewed by Adam Webb.",
    targetDoneDate: null as string | null,
    categoryFields: {},
  },
  {
    title: "Define first clinical hire job description and comp range",
    ownerName: "Brooks Paine",
    category: "Clinical Staff Hiring",
    businessArea: "People",
    status: "backlog",
    position: 1,
    definitionOfDone:
      "Job description, scope, and salary band finalized for the first clinical hire; ready to post.",
    targetDoneDate: null as string | null,
    categoryFields: {},
  },
];

let seedAttempted = false;

async function ensureSeeded(): Promise<void> {
  if (seedAttempted) return;
  await db.transaction(async (tx) => {
    // Serialize concurrent seed attempts across the whole cluster.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('buildout_cards_seed'))`,
    );
    const existing = await tx
      .select({ id: buildoutCardsTable.id })
      .from(buildoutCardsTable)
      .limit(1);
    if (existing.length > 0) return;
    await tx.insert(buildoutCardsTable).values(
      SEED_CARDS.map((c) => ({
        ...c,
        waitingSince: c.status === "waiting_on" ? new Date() : null,
        activityLog: [
          {
            timestamp: new Date().toISOString(),
            text: "Card created.",
          },
        ],
      })),
    );
  });
  // Only mark attempted after a successful run, so transient failures retry.
  seedAttempted = true;
}

function serializeRow(row: typeof buildoutCardsTable.$inferSelect) {
  return {
    ...row,
    categoryFields: row.categoryFields ?? null,
    activityLog: row.activityLog ?? [],
    waitingSince: row.waitingSince ? row.waitingSince.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function appendActivitySql(entries: Array<{ timestamp: string; text: string }>) {
  // Atomic JSONB concatenation that avoids read-modify-write races.
  return sql`COALESCE(${buildoutCardsTable.activityLog}, '[]'::jsonb) || ${JSON.stringify(entries)}::jsonb`;
}

router.get("/buildout-cards", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const items = await db
    .select()
    .from(buildoutCardsTable)
    .orderBy(asc(buildoutCardsTable.position), asc(buildoutCardsTable.id));
  res.json(ListBuildoutCardsResponse.parse(items.map(serializeRow)));
});

router.get("/buildout-cards/:id", async (req, res): Promise<void> => {
  const params = UpdateBuildoutCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .select()
    .from(buildoutCardsTable)
    .where(eq(buildoutCardsTable.id, params.data.id))
    .limit(1);
  if (!item) {
    res.status(404).json({ error: "Buildout card not found" });
    return;
  }
  res.json(UpdateBuildoutCardResponse.parse(serializeRow(item)));
});

router.post("/buildout-cards", async (req, res): Promise<void> => {
  const parsed = CreateBuildoutCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const status = data.status ?? "backlog";
  const [item] = await db
    .insert(buildoutCardsTable)
    .values({
      ...data,
      status,
      categoryFields: data.categoryFields ?? null,
      activityLog: [
        {
          timestamp: new Date().toISOString(),
          text: "Card created.",
        },
      ],
      waitingSince: status === "waiting_on" ? new Date() : null,
    })
    .returning();

  res.status(201).json(UpdateBuildoutCardResponse.parse(serializeRow(item)));
});

router.patch("/buildout-cards/:id", async (req, res): Promise<void> => {
  const params = UpdateBuildoutCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBuildoutCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(buildoutCardsTable)
    .where(eq(buildoutCardsTable.id, params.data.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Buildout card not found" });
    return;
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  if ("categoryFields" in parsed.data) {
    updates.categoryFields = parsed.data.categoryFields ?? null;
  }
  if ("status" in parsed.data && parsed.data.status) {
    if (parsed.data.status === "waiting_on" && existing.status !== "waiting_on") {
      updates.waitingSince = new Date();
    } else if (parsed.data.status !== "waiting_on") {
      updates.waitingSince = null;
    }
  }

  // Build automatic activity log entries for notable changes.
  const logEntries: Array<{ timestamp: string; text: string }> = [];
  const now = new Date().toISOString();
  if (
    "status" in parsed.data &&
    parsed.data.status &&
    parsed.data.status !== existing.status
  ) {
    const from = STATUS_LABELS[existing.status] ?? existing.status;
    const to = STATUS_LABELS[parsed.data.status] ?? parsed.data.status;
    logEntries.push({ timestamp: now, text: `Status changed: ${from} → ${to}` });
  }
  if (
    "businessArea" in parsed.data &&
    parsed.data.businessArea &&
    parsed.data.businessArea !== existing.businessArea
  ) {
    logEntries.push({
      timestamp: now,
      text: `Business area changed: ${existing.businessArea} → ${parsed.data.businessArea}`,
    });
  }
  // Detect non-status / non-area edits (the activity log entry above already
  // covers status & area moves — avoid logging "details updated" for those).
  const otherKeys = Object.keys(parsed.data).filter(
    (k) => k !== "status" && k !== "businessArea",
  );
  if (otherKeys.length > 0) {
    logEntries.push({ timestamp: now, text: "Card details updated." });
  }
  if (logEntries.length > 0) {
    updates.activityLog = appendActivitySql(logEntries);
  }

  const [item] = await db
    .update(buildoutCardsTable)
    .set(updates)
    .where(eq(buildoutCardsTable.id, params.data.id))
    .returning();

  res.json(UpdateBuildoutCardResponse.parse(serializeRow(item)));
});

router.post("/buildout-cards/:id/activity", async (req, res): Promise<void> => {
  const params = UpdateBuildoutCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddBuildoutCardActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const entry = { timestamp: new Date().toISOString(), text: parsed.data.text };
  const [item] = await db
    .update(buildoutCardsTable)
    .set({
      activityLog: appendActivitySql([entry]),
      updatedAt: new Date(),
    })
    .where(eq(buildoutCardsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Buildout card not found" });
    return;
  }

  res.json(UpdateBuildoutCardResponse.parse(serializeRow(item)));
});

router.delete("/buildout-cards/:id", async (req, res): Promise<void> => {
  const params = DeleteBuildoutCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(buildoutCardsTable)
    .where(eq(buildoutCardsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Buildout card not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

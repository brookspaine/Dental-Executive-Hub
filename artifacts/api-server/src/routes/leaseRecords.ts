import { Router, type IRouter } from "express";
import { eq, asc, and, inArray } from "drizzle-orm";
import {
  db,
  leaseRecordsTable,
  leaseDocumentsTable,
  organizationsTable,
} from "@workspace/db";
import {
  ListLeaseRecordsResponse,
  UpdateLeaseRecordParams,
  UpdateLeaseRecordBody,
  UpdateLeaseRecordResponse,
  ListLeaseDocumentsParams,
  ListLeaseDocumentsResponse,
  CreateLeaseDocumentParams,
  CreateLeaseDocumentBody,
  DeleteLeaseDocumentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Categories that get a lease record. Excludes "edge_dso" (the parent
 * entity) per the Lease Comparison Matrix spec.
 */
const SEED_CATEGORIES = ["edge", "urgent_dental"] as const;

function serializeLease(row: typeof leaseRecordsTable.$inferSelect) {
  return {
    ...row,
    personalGuarantors: row.personalGuarantors ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeDocument(row: typeof leaseDocumentsTable.$inferSelect) {
  return {
    ...row,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

/**
 * Idempotently ensures every EDGE / UD organization has a lease record.
 * Called on every list request so newly added locations show up in the
 * matrix automatically.
 */
async function ensureSeeded(): Promise<void> {
  const orgs = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(inArray(organizationsTable.category, [...SEED_CATEGORIES]));
  if (orgs.length === 0) return;

  const existing = await db
    .select({ organizationId: leaseRecordsTable.organizationId })
    .from(leaseRecordsTable)
    .where(
      inArray(
        leaseRecordsTable.organizationId,
        orgs.map((o) => o.id),
      ),
    );
  const existingSet = new Set(existing.map((r) => r.organizationId));

  const missing = orgs.filter((o) => !existingSet.has(o.id));
  if (missing.length === 0) return;

  await db
    .insert(leaseRecordsTable)
    .values(missing.map((o) => ({ organizationId: o.id })))
    .onConflictDoNothing({ target: leaseRecordsTable.organizationId });
}

router.get("/lease-records", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const items = await db
    .select()
    .from(leaseRecordsTable)
    .orderBy(asc(leaseRecordsTable.id));
  res.json(ListLeaseRecordsResponse.parse(items.map(serializeLease)));
});

router.patch("/lease-records/:id", async (req, res): Promise<void> => {
  const params = UpdateLeaseRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLeaseRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(leaseRecordsTable)
    .where(eq(leaseRecordsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Lease record not found" });
    return;
  }

  // Only the keys actually present in the body are written, so callers
  // can clear individual cells (send null) without touching others.
  const updates: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  const [item] = await db
    .update(leaseRecordsTable)
    .set(updates)
    .where(eq(leaseRecordsTable.id, params.data.id))
    .returning();

  res.json(UpdateLeaseRecordResponse.parse(serializeLease(item)));
});

router.get(
  "/lease-records/:id/documents",
  async (req, res): Promise<void> => {
    const params = ListLeaseDocumentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const items = await db
      .select()
      .from(leaseDocumentsTable)
      .where(eq(leaseDocumentsTable.leaseRecordId, params.data.id))
      .orderBy(asc(leaseDocumentsTable.uploadedAt));
    res.json(ListLeaseDocumentsResponse.parse(items.map(serializeDocument)));
  },
);

router.post(
  "/lease-records/:id/documents",
  async (req, res): Promise<void> => {
    const params = CreateLeaseDocumentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateLeaseDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Confirm the lease record exists before inserting (otherwise the FK
    // would reject with a less helpful 500).
    const [parent] = await db
      .select({ id: leaseRecordsTable.id })
      .from(leaseRecordsTable)
      .where(eq(leaseRecordsTable.id, params.data.id))
      .limit(1);
    if (!parent) {
      res.status(404).json({ error: "Lease record not found" });
      return;
    }

    const [item] = await db
      .insert(leaseDocumentsTable)
      .values({
        leaseRecordId: params.data.id,
        ...parsed.data,
      })
      .returning();

    res.status(201).json(serializeDocument(item));
  },
);

router.delete(
  "/lease-records/:id/documents/:docId",
  async (req, res): Promise<void> => {
    const params = DeleteLeaseDocumentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [item] = await db
      .delete(leaseDocumentsTable)
      .where(
        and(
          eq(leaseDocumentsTable.id, params.data.docId),
          eq(leaseDocumentsTable.leaseRecordId, params.data.id),
        ),
      )
      .returning();
    if (!item) {
      res.status(404).json({ error: "Lease document not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;

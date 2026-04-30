import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leaseToolkitTable } from "@workspace/db";
import { UpdateLeaseToolkitBody } from "@workspace/api-zod";

const router: IRouter = Router();

const SINGLETON_ID = 1;

const SEED_CONTENT = `# Lease Toolkit

Paste your toolkit content here. This section is editable — click the "Edit" button to modify it, then "Save" to persist.

Use this space for lease checklists, negotiation playbooks, vendor contacts, and anything else worth keeping next to the Lease Matrix.`;

/**
 * Read-or-seed the singleton document. We keep a single row at id=1 and
 * lazily create it on first access so a fresh database doesn't need a
 * dedicated seed step.
 */
async function loadOrSeed() {
  const [existing] = await db
    .select()
    .from(leaseToolkitTable)
    .where(eq(leaseToolkitTable.id, SINGLETON_ID));
  if (existing) return existing;
  const [created] = await db
    .insert(leaseToolkitTable)
    .values({ id: SINGLETON_ID, content: SEED_CONTENT })
    .returning();
  return created;
}

router.get("/lease-toolkit", async (_req, res): Promise<void> => {
  const doc = await loadOrSeed();
  res.json({
    id: doc.id,
    content: doc.content,
    updatedAt: doc.updatedAt.toISOString(),
  });
});

router.put("/lease-toolkit", async (req, res): Promise<void> => {
  const parsed = UpdateLeaseToolkitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Make sure the row exists, then update it. Insert-on-conflict keeps
  // this idempotent even if two clients race the very first save.
  await loadOrSeed();
  const [updated] = await db
    .update(leaseToolkitTable)
    .set({ content: parsed.data.content, updatedAt: new Date() })
    .where(eq(leaseToolkitTable.id, SINGLETON_ID))
    .returning();
  res.json({
    id: updated.id,
    content: updated.content,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;

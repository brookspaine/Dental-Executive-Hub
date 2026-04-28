import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, actionItemsTable } from "@workspace/db";
import {
  CreateActionItemBody,
  UpdateActionItemBody,
  UpdateActionItemParams,
  DeleteActionItemParams,
  ImportActionItemsBody,
  ListActionItemsResponse,
  UpdateActionItemResponse,
} from "@workspace/api-zod";

/**
 * `requireAuth` is mounted on the whole `/api` router in `app.ts`, so
 * every handler here can rely on `req.authedUser` being set without
 * adding the middleware per-route.
 */

const router: IRouter = Router();

const SEED_OWNER = { name: "Brooks Paine", initials: "BP" };

const SAMPLE_SEED = [
  {
    title: "Check out the Leadership Team Meeting tool.",
    source: "Setup Journey",
    ownerName: SEED_OWNER.name,
    ownerInitials: SEED_OWNER.initials,
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
    notes: [{ label: "Review your agenda." }],
    position: 0,
  },
  {
    title: "Decide the details for your strategy meeting.",
    source: "Setup Journey",
    ownerName: SEED_OWNER.name,
    ownerInitials: SEED_OWNER.initials,
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
    position: 1,
  },
  {
    title: "Strategy Meeting Prep: Plan your talking points.",
    source: "Setup Journey",
    ownerName: SEED_OWNER.name,
    ownerInitials: SEED_OWNER.initials,
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
    position: 2,
  },
  {
    title: "Strategy Meeting Prep: Review your numbers.",
    source: "Setup Journey",
    ownerName: SEED_OWNER.name,
    ownerInitials: SEED_OWNER.initials,
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
    position: 3,
  },
  {
    title: "Invite Your Team to Elite.",
    source: "Setup Journey",
    ownerName: SEED_OWNER.name,
    ownerInitials: SEED_OWNER.initials,
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
    position: 4,
  },
  {
    title: "Host the Annual Strategy meeting.",
    source: "Setup Journey",
    ownerName: SEED_OWNER.name,
    ownerInitials: SEED_OWNER.initials,
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
    position: 5,
  },
];

let seedAttempted = false;

async function ensureSeeded(): Promise<void> {
  if (seedAttempted) return;
  seedAttempted = true;
  const existing = await db.select({ id: actionItemsTable.id }).from(actionItemsTable).limit(1);
  if (existing.length > 0) return;
  await db.insert(actionItemsTable).values(SAMPLE_SEED);
}

function serializeRow(row: typeof actionItemsTable.$inferSelect) {
  return {
    ...row,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/action-items", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const items = await db
    .select()
    .from(actionItemsTable)
    .orderBy(asc(actionItemsTable.position), asc(actionItemsTable.id));
  res.json(ListActionItemsResponse.parse(items.map(serializeRow)));
});

router.post("/action-items", async (req, res): Promise<void> => {
  const parsed = CreateActionItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const me = req.authedUser!;

  /**
   * Owner resolution rules:
   *   - If the body explicitly provides an owner (name + initials), trust
   *     it. This is what the UI sends when assigning an item to a
   *     teammate via the picker.
   *   - If the body's owner matches the signed-in user (or no owner is
   *     set), default to the authenticated identity. We always set
   *     `ownerUserId` in that case so future renames don't break the
   *     reassignment.
   *   - When `ownerUserId` is provided in the body and matches the
   *     signed-in user, we still re-derive the canonical name + initials
   *     from the session so the client can't impersonate someone else.
   */
  const bodyHasOwnerName =
    typeof parsed.data.ownerName === "string" &&
    parsed.data.ownerName.trim().length > 0;
  const bodyHasOwnerInitials =
    typeof parsed.data.ownerInitials === "string" &&
    parsed.data.ownerInitials.trim().length > 0;
  const bodyOwnerUserId = parsed.data.ownerUserId ?? null;

  const isSelf =
    !bodyHasOwnerName ||
    bodyOwnerUserId === me.id ||
    parsed.data.ownerName!.trim().toLowerCase() === me.name.trim().toLowerCase();

  const ownerUserId = isSelf ? me.id : bodyOwnerUserId;
  const ownerName = isSelf
    ? me.name
    : (parsed.data.ownerName as string);
  const ownerInitials = isSelf
    ? me.initials
    : bodyHasOwnerInitials
      ? (parsed.data.ownerInitials as string)
      : me.initials;

  const [item] = await db
    .insert(actionItemsTable)
    .values({
      title: parsed.data.title,
      source: parsed.data.source,
      ownerUserId,
      ownerName,
      ownerInitials,
      dueBy: parsed.data.dueBy ?? "—",
      dueByFull: parsed.data.dueByFull ?? "",
      notes: parsed.data.notes ?? null,
      starred: parsed.data.starred ?? false,
      done: parsed.data.done ?? false,
      position: parsed.data.position ?? 0,
    })
    .returning();

  res.status(201).json(UpdateActionItemResponse.parse(serializeRow(item)));
});

router.post(
  "/action-items/import",
  async (req, res): Promise<void> => {
    const parsed = ImportActionItemsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    await ensureSeeded();

    const me = req.authedUser!;

    if (parsed.data.items.length > 0) {
      await db.insert(actionItemsTable).values(
        parsed.data.items.map((item) => {
          const hasName =
            typeof item.ownerName === "string" &&
            item.ownerName.trim().length > 0;
          const isSelf =
            !hasName ||
            item.ownerName!.trim().toLowerCase() ===
              me.name.trim().toLowerCase();
          return {
            title: item.title,
            source: item.source,
            ownerUserId: isSelf ? me.id : (item.ownerUserId ?? null),
            ownerName: isSelf ? me.name : (item.ownerName as string),
            ownerInitials: isSelf
              ? me.initials
              : (item.ownerInitials ?? me.initials),
            dueBy: item.dueBy ?? "—",
            dueByFull: item.dueByFull ?? "",
            notes: item.notes ?? null,
            starred: item.starred ?? false,
            done: item.done ?? false,
            position: item.position ?? 0,
          };
        }),
      );
    }

    const items = await db
      .select()
      .from(actionItemsTable)
      .orderBy(asc(actionItemsTable.position), asc(actionItemsTable.id));
    res.json(ListActionItemsResponse.parse(items.map(serializeRow)));
  },
);

router.patch(
  "/action-items/:id",
  async (req, res): Promise<void> => {
    const params = UpdateActionItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateActionItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: new Date(),
    };
    if ("notes" in parsed.data) {
      updates.notes = parsed.data.notes ?? null;
    }
    /**
     * If the owner is being changed and the new owner matches the
     * signed-in user, attach their stable user id so future renames
     * still resolve to them.
     */
    const me = req.authedUser!;
    if (
      typeof parsed.data.ownerName === "string" &&
      parsed.data.ownerName.trim().toLowerCase() ===
        me.name.trim().toLowerCase() &&
      !("ownerUserId" in parsed.data)
    ) {
      updates.ownerUserId = me.id;
    }

    const [item] = await db
      .update(actionItemsTable)
      .set(updates)
      .where(eq(actionItemsTable.id, params.data.id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Action item not found" });
      return;
    }

    res.json(UpdateActionItemResponse.parse(serializeRow(item)));
  },
);

router.delete("/action-items/:id", async (req, res): Promise<void> => {
  const params = DeleteActionItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(actionItemsTable)
    .where(eq(actionItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Action item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

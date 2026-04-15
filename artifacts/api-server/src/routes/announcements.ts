import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable, activityTable } from "@workspace/db";
import {
  CreateAnnouncementBody,
  DeleteAnnouncementParams,
  ListAnnouncementsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/announcements", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.createdAt));
  res.json(ListAnnouncementsResponse.parse(items));
});

router.post("/announcements", async (req, res): Promise<void> => {
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(announcementsTable)
    .values(parsed.data)
    .returning();

  await db.insert(activityTable).values({
    type: "announcement",
    message: `New announcement: "${item.title}"`,
    entityName: item.title,
  });

  res.status(201).json(item);
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const params = DeleteAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(announcementsTable)
    .where(eq(announcementsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

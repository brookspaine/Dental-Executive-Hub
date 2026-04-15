import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, idealWeekRitualsTable, idealWeekCompletionsTable } from "@workspace/db";
import {
  ListIdealWeekRitualsResponse,
  UpdateIdealWeekRitualParams,
  UpdateIdealWeekRitualBody,
  UpdateIdealWeekRitualResponse,
  ListIdealWeekCompletionsResponse,
  ToggleIdealWeekCompletionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ideal-week/rituals", async (_req, res): Promise<void> => {
  const rituals = await db
    .select()
    .from(idealWeekRitualsTable)
    .orderBy(idealWeekRitualsTable.sortOrder);
  res.json(ListIdealWeekRitualsResponse.parse(rituals));
});

router.patch("/ideal-week/rituals/:id", async (req, res): Promise<void> => {
  const params = UpdateIdealWeekRitualParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateIdealWeekRitualBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ritual] = await db
    .update(idealWeekRitualsTable)
    .set(parsed.data)
    .where(eq(idealWeekRitualsTable.id, params.data.id))
    .returning();

  if (!ritual) {
    res.status(404).json({ error: "Ritual not found" });
    return;
  }

  res.json(UpdateIdealWeekRitualResponse.parse(ritual));
});

router.get("/ideal-week/completions", async (req, res): Promise<void> => {
  const date = req.query.date as string | undefined;
  if (!date) {
    res.status(400).json({ error: "date query parameter is required" });
    return;
  }

  const completions = await db
    .select()
    .from(idealWeekCompletionsTable)
    .where(eq(idealWeekCompletionsTable.date, date));

  res.json(ListIdealWeekCompletionsResponse.parse(completions));
});

router.post("/ideal-week/completions/toggle", async (req, res): Promise<void> => {
  const { ritualId, date, completed } = req.body;
  if (!ritualId || !date || typeof completed !== "boolean") {
    res.status(400).json({ error: "ritualId, date, and completed are required" });
    return;
  }

  const dateStr = typeof date === "string" ? date : new Date(date).toISOString().split("T")[0];

  const existing = await db
    .select()
    .from(idealWeekCompletionsTable)
    .where(
      and(
        eq(idealWeekCompletionsTable.ritualId, ritualId),
        eq(idealWeekCompletionsTable.date, dateStr)
      )
    );

  let completion;
  if (existing.length > 0) {
    [completion] = await db
      .update(idealWeekCompletionsTable)
      .set({ completed })
      .where(eq(idealWeekCompletionsTable.id, existing[0].id))
      .returning();
  } else {
    [completion] = await db
      .insert(idealWeekCompletionsTable)
      .values({
        ritualId,
        date: dateStr,
        completed,
      })
      .returning();
  }

  res.json(ToggleIdealWeekCompletionResponse.parse(completion));
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, idealWeekRitualsTable, idealWeekCompletionsTable, weeklyTop3Table, morningRitualCompletionsTable, journalResponsesTable } from "@workspace/db";
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
  const endDate = req.query.endDate as string | undefined;
  if (!date) {
    res.status(400).json({ error: "date query parameter is required" });
    return;
  }

  let completions;
  if (endDate) {
    completions = await db
      .select()
      .from(idealWeekCompletionsTable)
      .where(
        and(
          gte(idealWeekCompletionsTable.date, date),
          lte(idealWeekCompletionsTable.date, endDate)
        )
      );
  } else {
    completions = await db
      .select()
      .from(idealWeekCompletionsTable)
      .where(eq(idealWeekCompletionsTable.date, date));
  }

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

router.get("/ideal-week/weekly-top3", async (req, res): Promise<void> => {
  const weekStart = req.query.weekStart as string | undefined;
  if (!weekStart) {
    res.status(400).json({ error: "weekStart query parameter is required" });
    return;
  }
  const items = await db
    .select()
    .from(weeklyTop3Table)
    .where(eq(weeklyTop3Table.weekStart, weekStart))
    .orderBy(weeklyTop3Table.priority);
  res.json(items);
});

router.post("/ideal-week/weekly-top3", async (req, res): Promise<void> => {
  const { title, priority, weekStart } = req.body;
  if (!title || priority == null || !weekStart) {
    res.status(400).json({ error: "title, priority, and weekStart are required" });
    return;
  }
  const [item] = await db
    .insert(weeklyTop3Table)
    .values({ title, priority, weekStart })
    .returning();
  res.status(201).json(item);
});

router.patch("/ideal-week/weekly-top3/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const updates: Record<string, any> = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.completed !== undefined) updates.completed = req.body.completed;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [item] = await db
    .update(weeklyTop3Table)
    .set(updates)
    .where(eq(weeklyTop3Table.id, id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
});

router.delete("/ideal-week/weekly-top3/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [item] = await db
    .delete(weeklyTop3Table)
    .where(eq(weeklyTop3Table.id, id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/ideal-week/morning-ritual", async (req, res): Promise<void> => {
  const date = req.query.date as string | undefined;
  if (!date) {
    res.status(400).json({ error: "date query parameter is required" });
    return;
  }
  const completions = await db
    .select()
    .from(morningRitualCompletionsTable)
    .where(eq(morningRitualCompletionsTable.date, date));
  res.json(completions);
});

router.post("/ideal-week/morning-ritual/toggle", async (req, res): Promise<void> => {
  const { itemKey, date, completed } = req.body;
  if (!itemKey || !date || typeof completed !== "boolean") {
    res.status(400).json({ error: "itemKey, date, and completed are required" });
    return;
  }
  const existing = await db
    .select()
    .from(morningRitualCompletionsTable)
    .where(
      and(
        eq(morningRitualCompletionsTable.itemKey, itemKey),
        eq(morningRitualCompletionsTable.date, date)
      )
    );
  let result;
  if (existing.length > 0) {
    [result] = await db
      .update(morningRitualCompletionsTable)
      .set({ completed })
      .where(eq(morningRitualCompletionsTable.id, existing[0].id))
      .returning();
  } else {
    [result] = await db
      .insert(morningRitualCompletionsTable)
      .values({ itemKey, date, completed })
      .returning();
  }
  res.json(result);
});

router.get("/ideal-week/journal", async (req, res): Promise<void> => {
  const date = req.query.date as string | undefined;
  if (!date) {
    res.status(400).json({ error: "date query parameter is required" });
    return;
  }
  const responses = await db
    .select()
    .from(journalResponsesTable)
    .where(eq(journalResponsesTable.date, date));
  res.json(responses);
});

router.post("/ideal-week/journal", async (req, res): Promise<void> => {
  const { promptKey, date, response } = req.body;
  if (!promptKey || !date || typeof response !== "string") {
    res.status(400).json({ error: "promptKey, date, and response are required" });
    return;
  }
  const existing = await db
    .select()
    .from(journalResponsesTable)
    .where(
      and(
        eq(journalResponsesTable.promptKey, promptKey),
        eq(journalResponsesTable.date, date)
      )
    );
  let result;
  if (existing.length > 0) {
    [result] = await db
      .update(journalResponsesTable)
      .set({ response })
      .where(eq(journalResponsesTable.id, existing[0].id))
      .returning();
  } else {
    [result] = await db
      .insert(journalResponsesTable)
      .values({ promptKey, date, response })
      .returning();
  }
  res.json(result);
});

export default router;

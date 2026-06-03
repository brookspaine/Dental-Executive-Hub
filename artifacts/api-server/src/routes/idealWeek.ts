import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, idealWeekRitualsTable, idealWeekCompletionsTable, weeklyTop3Table, morningRitualCompletionsTable, journalResponsesTable, ritualItemsTable, scheduleBlocksTable, readingListTable, boardMembersTable } from "@workspace/db";
import type { ScheduleBlock } from "@workspace/db";
import { asc } from "drizzle-orm";
import {
  ListIdealWeekRitualsResponse,
  UpdateIdealWeekRitualParams,
  UpdateIdealWeekRitualBody,
  UpdateIdealWeekRitualResponse,
  ListIdealWeekCompletionsResponse,
  ToggleIdealWeekCompletionResponse,
  CreateScheduleBlockBody,
  UpdateScheduleBlockBody,
  UpdateScheduleBlockParams,
  DeleteScheduleBlockParams,
} from "@workspace/api-zod";

const DAY_ORDER: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const DEFAULT_SCHEDULE_BLOCKS = [
  { day: "Mon", start: 6, duration: 1.5, label: "Morning Ritual", category: "morning", sortOrder: 0 },
  { day: "Mon", start: 7.5, duration: 1, label: "Daily Planning Ritual", category: "startup", sortOrder: 1 },
  { day: "Mon", start: 8.5, duration: 0.5, label: "Morning Huddle", category: "meeting", sortOrder: 2 },
  { day: "Mon", start: 9, duration: 3, label: "Patient Care", category: "patient", sortOrder: 3 },
  { day: "Mon", start: 12, duration: 4, label: "Patient Care", category: "patient", sortOrder: 4 },
  { day: "Mon", start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown", sortOrder: 5 },
  { day: "Mon", start: 17, duration: 2, label: "Family & Dinner", category: "family", sortOrder: 6 },
  { day: "Mon", start: 19, duration: 1, label: "Evening Ritual", category: "evening", sortOrder: 7 },
  { day: "Tue", start: 6, duration: 1.5, label: "Morning Ritual", category: "morning", sortOrder: 0 },
  { day: "Tue", start: 7.5, duration: 1, label: "Daily Planning Ritual", category: "startup", sortOrder: 1 },
  { day: "Tue", start: 8.5, duration: 1.5, label: "Weekly Review", category: "review", sortOrder: 2 },
  { day: "Tue", start: 10, duration: 2, label: "Deepwork", category: "deepwork", sortOrder: 3 },
  { day: "Tue", start: 12, duration: 3.5, label: "Deepwork", category: "deepwork", sortOrder: 4 },
  { day: "Tue", start: 15.5, duration: 0.5, label: "Execution Block", category: "executive", sortOrder: 5 },
  { day: "Tue", start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown", sortOrder: 6 },
  { day: "Tue", start: 17, duration: 2, label: "Family & Dinner", category: "family", sortOrder: 7 },
  { day: "Tue", start: 19, duration: 1, label: "Evening Ritual", category: "evening", sortOrder: 8 },
  { day: "Wed", start: 6, duration: 1.5, label: "Morning Ritual", category: "morning", sortOrder: 0 },
  { day: "Wed", start: 7.5, duration: 1, label: "Daily Planning Ritual", category: "startup", sortOrder: 1 },
  { day: "Wed", start: 8.5, duration: 1.5, label: "Deepwork", category: "deepwork", sortOrder: 2 },
  { day: "Wed", start: 10, duration: 0.5, label: "UC Meeting", category: "meeting", sortOrder: 3 },
  { day: "Wed", start: 10.5, duration: 1.5, label: "Deepwork", category: "deepwork", sortOrder: 4 },
  { day: "Wed", start: 12, duration: 3, label: "Deepwork", category: "deepwork", sortOrder: 5 },
  { day: "Wed", start: 15, duration: 1, label: "Execution Block", category: "executive", sortOrder: 6 },
  { day: "Wed", start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown", sortOrder: 7 },
  { day: "Wed", start: 17, duration: 1, label: "Workout", category: "workout", sortOrder: 8 },
  { day: "Wed", start: 18, duration: 1, label: "Dinner", category: "family", sortOrder: 9 },
  { day: "Wed", start: 19, duration: 1, label: "Evening Ritual", category: "evening", sortOrder: 10 },
  { day: "Thu", start: 6, duration: 1.5, label: "Morning Ritual", category: "morning", sortOrder: 0 },
  { day: "Thu", start: 7.5, duration: 1, label: "Daily Planning Ritual", category: "startup", sortOrder: 1 },
  { day: "Thu", start: 8.5, duration: 0.5, label: "Morning Huddle", category: "meeting", sortOrder: 2 },
  { day: "Thu", start: 9, duration: 3, label: "Patient Care", category: "patient", sortOrder: 3 },
  { day: "Thu", start: 12, duration: 1, label: "Deepwork", category: "deepwork", sortOrder: 4 },
  { day: "Thu", start: 13, duration: 2, label: "Execution Block", category: "executive", sortOrder: 5 },
  { day: "Thu", start: 15, duration: 1, label: "Execution Block", category: "executive", sortOrder: 6 },
  { day: "Thu", start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown", sortOrder: 7 },
  { day: "Thu", start: 17, duration: 2, label: "Family & Dinner", category: "family", sortOrder: 8 },
  { day: "Thu", start: 19, duration: 1, label: "Evening Ritual", category: "evening", sortOrder: 9 },
  { day: "Fri", start: 6, duration: 1.5, label: "Morning Ritual", category: "morning", sortOrder: 0 },
  { day: "Fri", start: 7.5, duration: 1, label: "Daily Planning Ritual", category: "startup", sortOrder: 1 },
  { day: "Fri", start: 8.5, duration: 0.5, label: "Morning Huddle", category: "meeting", sortOrder: 2 },
  { day: "Fri", start: 9, duration: 3, label: "Patient Care", category: "patient", sortOrder: 3 },
  { day: "Fri", start: 12, duration: 3, label: "Patient Care", category: "patient", sortOrder: 4 },
  { day: "Fri", start: 15, duration: 1, label: "Shutdown Ritual", category: "shutdown", sortOrder: 5 },
  { day: "Fri", start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown", sortOrder: 6 },
  { day: "Fri", start: 17, duration: 2, label: "Family & Dinner", category: "family", sortOrder: 7 },
  { day: "Fri", start: 19, duration: 1, label: "Evening Ritual", category: "evening", sortOrder: 8 },
  { day: "Sat", start: 6, duration: 1, label: "Morning Ritual", category: "morning", sortOrder: 0 },
  { day: "Sat", start: 7, duration: 0.5, label: "Daily Planning Ritual", category: "startup", sortOrder: 1 },
  { day: "Sat", start: 7.5, duration: 1, label: "Workout", category: "workout", sortOrder: 2 },
  { day: "Sat", start: 8.5, duration: 3.5, label: "Patient Care", category: "patient", sortOrder: 3 },
  { day: "Sat", start: 12, duration: 3, label: "Patient Care", category: "patient", sortOrder: 4 },
  { day: "Sat", start: 15, duration: 2, label: "Family Time", category: "family", sortOrder: 5 },
  { day: "Sat", start: 17, duration: 2, label: "Family & Dinner", category: "family", sortOrder: 6 },
  { day: "Sat", start: 19, duration: 1, label: "Evening Ritual", category: "evening", sortOrder: 7 },
  { day: "Sun", start: 6, duration: 1.5, label: "Morning Ritual", category: "morning", sortOrder: 0 },
  { day: "Sun", start: 7.5, duration: 1, label: "Daily Planning Ritual", category: "startup", sortOrder: 1 },
  { day: "Sun", start: 8.5, duration: 3.5, label: "Patient Care", category: "patient", sortOrder: 2 },
  { day: "Sun", start: 12, duration: 2, label: "Deepwork", category: "deepwork", sortOrder: 3 },
  { day: "Sun", start: 14, duration: 2, label: "Shutdown Ritual", category: "shutdown", sortOrder: 4 },
  { day: "Sun", start: 16, duration: 1, label: "Family Outing", category: "family", sortOrder: 5 },
  { day: "Sun", start: 17, duration: 2, label: "Family & Dinner", category: "family", sortOrder: 6 },
  { day: "Sun", start: 19, duration: 1, label: "Evening Ritual", category: "evening", sortOrder: 7 },
];

const router: IRouter = Router();

function sortBlocksByDayAndStart(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return blocks.sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return a.start - b.start;
  });
}

router.get("/ideal-week/schedule-blocks", async (_req, res): Promise<void> => {
  let blocks = await db
    .select()
    .from(scheduleBlocksTable);

  if (blocks.length === 0) {
    try {
      blocks = await db
        .insert(scheduleBlocksTable)
        .values(DEFAULT_SCHEDULE_BLOCKS)
        .returning();
    } catch {
      blocks = await db
        .select()
        .from(scheduleBlocksTable);
    }
  }

  res.json(sortBlocksByDayAndStart(blocks));
});

router.post("/ideal-week/schedule-blocks", async (req, res): Promise<void> => {
  const parsed = CreateScheduleBlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [block] = await db
    .insert(scheduleBlocksTable)
    .values({ ...parsed.data, sortOrder: parsed.data.sortOrder ?? 0 })
    .returning();
  res.status(201).json(block);
});

router.patch("/ideal-week/schedule-blocks/:id", async (req, res): Promise<void> => {
  const params = UpdateScheduleBlockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateScheduleBlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { day, start, duration, label, category, sortOrder } = parsed.data;
  const updates: Partial<Pick<ScheduleBlock, "day" | "start" | "duration" | "label" | "category" | "sortOrder">> = {};
  if (day !== undefined) updates.day = day;
  if (start !== undefined) updates.start = start;
  if (duration !== undefined) updates.duration = duration;
  if (label !== undefined) updates.label = label;
  if (category !== undefined) updates.category = category;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const id = params.data.id;

  const [block] = await db
    .update(scheduleBlocksTable)
    .set(updates)
    .where(eq(scheduleBlocksTable.id, id))
    .returning();

  if (!block) {
    res.status(404).json({ error: "Block not found" });
    return;
  }

  res.json(block);
});

router.delete("/ideal-week/schedule-blocks/:id", async (req, res): Promise<void> => {
  const params = DeleteScheduleBlockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [block] = await db
    .delete(scheduleBlocksTable)
    .where(eq(scheduleBlocksTable.id, params.data.id))
    .returning();
  if (!block) {
    res.status(404).json({ error: "Block not found" });
    return;
  }
  res.sendStatus(204);
});

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

router.get("/ideal-week/weekly-top3", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(weeklyTop3Table)
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
  // Return one response per promptKey: today's value if it exists,
  // otherwise the most recent prior response (carried-forward until edited).
  const rows = await db
    .select()
    .from(journalResponsesTable)
    .where(lte(journalResponsesTable.date, date))
    .orderBy(desc(journalResponsesTable.date), desc(journalResponsesTable.id));
  const seen = new Set<string>();
  const latest: typeof rows = [];
  for (const r of rows) {
    if (seen.has(r.promptKey)) continue;
    seen.add(r.promptKey);
    latest.push(r);
  }
  res.json(latest);
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

const DEFAULT_RITUAL_ITEMS: Record<string, string[]> = {
  morning: [
    "Daily Devotional",
    "Morning Journal Questions",
    "Get it out on paper (process thoughts, decisions, think, etc)",
    "Mindful Breathing/Meditation (Calm App)",
    "Read (15 min) – personal growth and develop wisdom",
  ],
  startup: [
    "Daily Brainwashing Sheet or Words of Wisdom",
    "Review Living Your Best Year Ever",
    "Set Big 3",
    "Block Deep Work session(s)",
    "Time Journal catch-up",
    "If I decide it's important → Reply to Emails\n(be timely, reply quickly, don't do other's jobs for them)",
  ],
  shutdown: [
    "Clear Inbox and capture open loops",
    "Time Journal",
    "Evening Ritual Reflection",
    "Disconnect and Intentionally Switch to Family Time",
  ],
  weekly_review: [
    "Review schedule and energy last week and compare to intentions",
    "Total up time journal activities and put into spreadsheet",
    "Read Epic Year",
    "AMS",
    "Review Vision Board & Read Goals",
  ],
  monthly_review: [
    "Monthly Personal Assessment",
    "Personal Finances/Wealth Review\n(pay CC, transfer $ to savings, Investments: HSA, brokerage)",
    "Review Vision Board & Read Goals",
  ],
  quarterly_review: [
    "Quarterly AMS",
    "Read Epic Year",
    "Review Vision Board and Goals",
    "Change Habits to focus on",
    "Review Book Takeaways from Books Read that Quarter\nhttps://docs.google.com/document/d/1W7XKQzw5akO3_Tyis5NsK5gEcvSh0Bkp0I1KKnJtjr8/edit?usp=sharing",
  ],
  anchor_meetings: [
    "Recurring Meetings, typically the who's that execute your core businesses",
  ],
  deepwork: [
    "Get the big stuff done",
    "Don't get distracted by what you \"feel\" like doing",
  ],
  execution_block: [
    "Who, not how",
    "GSD (The right shit done)",
  ],
  family_friends: [
    "phone away",
    "intentional energy",
    "focus on Mariah and Callen",
  ],
  patient_care: [
    "BBB - Be brief, be brilliant, be done",
    "Patience in endo",
    "People see compassion and care",
  ],
  brainwashing: [
    "Whatever anyone says or does, assume positive intent.",
    "5 C's — Clarity, Commitment, Consistency, Consequences, Cut-Ties.",
    "Empower others, not Enable. Drive accountability by asking questions.",
    "Clear, Concise, Compelling (no \"I think, just, like\"), Charisma, Composure, Conversation — 6 C's of Communication.",
    "1) Should we do this? 2) Delete 3) Optimize 4) Accelerate 5) Automate.",
    "Doing imperfectly is better than not doing at all. Initiation → Consistency → Intensity.",
    "Management Debt — if you don't say anything, don't expect them to do anything.",
    "Seek first to understand. Be the last in the room to speak. Sit in the gap.",
    "PCS — Problem, Consequence, Solution Leader.",
    "\"Tough-minded on standards and tender-hearted with people.\"",
    "Know your audience. Ask more questions, ask better questions.",
    "Put yourself in the other person's shoes, then you'll know how to best influence them.",
    "Have the team \"Make it Their Own,\" and when implementing, make it YOUR own (frameworks).",
    "Gratitude = Abundance Minded.",
    "Nothing about life is fair. Deal with it as it is.",
    "BBB — efficiency and speed in procedures for freedom.",
  ],
};

router.get("/ideal-week/ritual-items", async (req, res): Promise<void> => {
  const category = req.query.category as string;
  if (!category) {
    res.status(400).json({ error: "category query param required" });
    return;
  }
  let items = await db
    .select()
    .from(ritualItemsTable)
    .where(eq(ritualItemsTable.category, category))
    .orderBy(asc(ritualItemsTable.sortOrder));

  if (items.length === 0 && DEFAULT_RITUAL_ITEMS[category]) {
    const defaults = DEFAULT_RITUAL_ITEMS[category];
    const inserted = await db
      .insert(ritualItemsTable)
      .values(defaults.map((label, i) => ({ category, label, sortOrder: i })))
      .returning();
    items = inserted.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  res.json(items);
});

router.post("/ideal-week/ritual-items", async (req, res): Promise<void> => {
  const { category, label, sortOrder } = req.body;
  if (!category || !label) {
    res.status(400).json({ error: "category and label required" });
    return;
  }
  const [item] = await db
    .insert(ritualItemsTable)
    .values({ category, label, sortOrder: sortOrder ?? 0 })
    .returning();
  res.json(item);
});

router.patch("/ideal-week/ritual-items/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const updates: Record<string, any> = {};
  if (req.body.label !== undefined) updates.label = req.body.label;
  if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;

  const [item] = await db
    .update(ritualItemsTable)
    .set(updates)
    .where(eq(ritualItemsTable.id, id))
    .returning();
  res.json(item);
});

router.delete("/ideal-week/ritual-items/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(ritualItemsTable).where(eq(ritualItemsTable.id, id));
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Personal Board of Directors — collage of board-member photos
// ---------------------------------------------------------------------------

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

const clampBoardField = (key: string, value: number): number => {
  switch (key) {
    case "x":
    case "y":
      return Math.round(clamp(value, 0, 5000));
    case "size":
      return Math.round(clamp(value, 24, 400));
    case "focalX":
    case "focalY":
      return clamp(value, 0, 100);
    case "zoom":
      return clamp(value, 0.5, 5);
    default:
      return value;
  }
};

router.get("/ideal-week/board-members", async (_req, res): Promise<void> => {
  const members = await db
    .select()
    .from(boardMembersTable)
    .orderBy(asc(boardMembersTable.sortOrder), asc(boardMembersTable.id));
  res.json(members);
});

router.post("/ideal-week/board-members", async (req, res): Promise<void> => {
  const { objectPath, name, x, y, size, focalX, focalY, zoom, sortOrder } =
    req.body ?? {};
  if (!objectPath || typeof objectPath !== "string") {
    res.status(400).json({ error: "objectPath required" });
    return;
  }
  const [member] = await db
    .insert(boardMembersTable)
    .values({
      objectPath,
      name: typeof name === "string" ? name : null,
      ...(typeof x === "number" ? { x: clampBoardField("x", x) } : {}),
      ...(typeof y === "number" ? { y: clampBoardField("y", y) } : {}),
      ...(typeof size === "number" ? { size: clampBoardField("size", size) } : {}),
      ...(typeof focalX === "number" ? { focalX: clampBoardField("focalX", focalX) } : {}),
      ...(typeof focalY === "number" ? { focalY: clampBoardField("focalY", focalY) } : {}),
      ...(typeof zoom === "number" ? { zoom: clampBoardField("zoom", zoom) } : {}),
      ...(typeof sortOrder === "number" ? { sortOrder: Math.round(sortOrder) } : {}),
    })
    .returning();
  res.json(member);
});

router.patch("/ideal-week/board-members/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  const b = req.body ?? {};
  if (typeof b.name === "string" || b.name === null) updates.name = b.name;
  if (typeof b.x === "number") updates.x = clampBoardField("x", b.x);
  if (typeof b.y === "number") updates.y = clampBoardField("y", b.y);
  if (typeof b.size === "number") updates.size = clampBoardField("size", b.size);
  if (typeof b.focalX === "number") updates.focalX = clampBoardField("focalX", b.focalX);
  if (typeof b.focalY === "number") updates.focalY = clampBoardField("focalY", b.focalY);
  if (typeof b.zoom === "number") updates.zoom = clampBoardField("zoom", b.zoom);
  if (typeof b.sortOrder === "number") updates.sortOrder = Math.round(b.sortOrder);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "no valid fields to update" });
    return;
  }

  const [member] = await db
    .update(boardMembersTable)
    .set(updates)
    .where(eq(boardMembersTable.id, id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "board member not found" });
    return;
  }
  res.json(member);
});

router.delete("/ideal-week/board-members/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(boardMembersTable).where(eq(boardMembersTable.id, id));
  res.json({ success: true });
});

const DEFAULT_READING_LIST = [
  "How to Win Friends and Influence People",
  "Shoe Dog",
  "No Ego",
  "Living Your Best Year Ever",
  "The Hard Thing About Hard Things - Ben Horowitz",
  "What You Do Is Who You Are - Ben Horowitz",
  "The One Page Marketing Plan - Allan Nib",
  "Who's Got Your Back?",
  "Tribes - We Need You to Lead Us",
  "Thinking Fast and Slow - Daniel Kahneman",
  "Shaka - How to Be Free",
  "Shaka - Righting My Wrongs",
  "The Weirdest People in the World",
  "Man's Search for Meaning - Viktor Frankl",
  "John Maxwell - 5 Levels of Leadership",
  "Outliers - Malcolm Gladwell",
  "Desire to Win/Succeed - Malcolm Gladwell",
  "Ben Horowitz Books/Insights",
  "Inner Excellence",
  "Building an Elite Organization",
  "The Richest Man in Babylon",
  "Deepwork",
  "The Obstacle Is the Way",
  "Drive - Daniel Pink",
  "Art of Learning",
  "Contagious",
  "Mind Gym",
  "Positive Intelligence",
  "The Infinite Game - Simon Sinek",
  "Thou Shall Prosper",
  "No Bullshit Leadership",
  "Crucial Accountability and Crucial Conversations",
  "The Compound Effect - Darren Hardy",
  "Empire Building - Adam Coffee",
  "Noise - Daniel Kahneman",
];

router.get("/ideal-week/reading-list", async (_req, res): Promise<void> => {
  let items = await db.select().from(readingListTable).orderBy(asc(readingListTable.sortOrder));
  if (items.length === 0) {
    try {
      const rows = DEFAULT_READING_LIST.map((title, i) => ({ title, sortOrder: i }));
      items = await db.insert(readingListTable).values(rows).returning();
    } catch {
      items = await db.select().from(readingListTable).orderBy(asc(readingListTable.sortOrder));
    }
  }
  res.json(items);
});

router.post("/ideal-week/reading-list", async (req, res): Promise<void> => {
  const { title } = req.body;
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const maxOrder = await db.select().from(readingListTable).orderBy(asc(readingListTable.sortOrder));
  const sortOrder = maxOrder.length > 0 ? Math.max(...maxOrder.map(r => r.sortOrder)) + 1 : 0;
  const [item] = await db.insert(readingListTable).values({ title, sortOrder }).returning();
  res.json(item);
});

router.patch("/ideal-week/reading-list/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const updates: Partial<{ title: string; completed: boolean }> = {};
  if (typeof req.body.title === "string") updates.title = req.body.title;
  if (typeof req.body.completed === "boolean") updates.completed = req.body.completed;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "nothing to update" });
    return;
  }
  const [item] = await db.update(readingListTable)
    .set(updates)
    .where(eq(readingListTable.id, id))
    .returning();
  res.json(item);
});

router.delete("/ideal-week/reading-list/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(readingListTable).where(eq(readingListTable.id, id));
  res.json({ success: true });
});

// Google Calendar integration via Replit Connectors
router.get("/ideal-week/calendar-events", async (req, res): Promise<void> => {
  try {
    const connectors = new ReplitConnectors();
    const timeMin = (req.query.timeMin as string) || new Date().toISOString();
    const timeMax = (req.query.timeMax as string) || new Date(Date.now() + 7 * 86400000).toISOString();

    const listRes = await connectors.proxy("google-calendar", "/calendar/v3/users/me/calendarList", {
      method: "GET",
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("Calendar list error:", listRes.status, errText.slice(0, 200));
      res.status(502).json({ error: `Google Calendar returned ${listRes.status}` });
      return;
    }

    const calListData = await listRes.json() as { items?: { id: string; summary: string; backgroundColor?: string }[] };
    const excludedCalendars = [
      "Staff - URGENT DENTAL",
      "Holidays in United States",
      "Brooks's SportsLink Calendar",
    ];
    const calendars = (calListData.items || []).filter(c => !excludedCalendars.includes(c.summary));

    const allEvents: {
      id: string;
      summary: string;
      start: string;
      end: string;
      calendarName: string;
      calendarColor: string;
    }[] = [];

    for (const cal of calendars) {
      try {
        const params = new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "100",
        });
        const eventsRes = await connectors.proxy(
          "google-calendar",
          `/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
          { method: "GET" }
        );
        if (!eventsRes.ok) continue;
        const eventsData = await eventsRes.json() as {
          items?: {
            id: string;
            summary?: string;
            start?: { dateTime?: string; date?: string };
            end?: { dateTime?: string; date?: string };
          }[];
        };
        for (const ev of eventsData.items || []) {
          if (!ev.start) continue;
          allEvents.push({
            id: ev.id,
            summary: ev.summary || "(No title)",
            start: ev.start.dateTime || ev.start.date || "",
            end: ev.end?.dateTime || ev.end?.date || "",
            calendarName: cal.summary,
            calendarColor: cal.backgroundColor || "#039be5",
          });
        }
      } catch {
        // skip calendars that fail
      }
    }

    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    res.json({ calendars: calendars.map(c => ({ id: c.id, name: c.summary, color: c.backgroundColor })), events: allEvents });
  } catch (err: any) {
    console.error("Calendar events error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch calendar events" });
  }
});

export default router;

import { pgTable, text, serial, timestamp, integer, boolean, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const idealWeekRitualsTable = pgTable("ideal_week_rituals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const idealWeekCompletionsTable = pgTable("ideal_week_completions", {
  id: serial("id").primaryKey(),
  ritualId: integer("ritual_id").notNull(),
  date: text("date").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scheduleBlocksTable = pgTable("schedule_blocks", {
  id: serial("id").primaryKey(),
  day: text("day").notNull(),
  start: real("start").notNull(),
  duration: real("duration").notNull(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIdealWeekRitualSchema = createInsertSchema(idealWeekRitualsTable).omit({ id: true, createdAt: true });
export type InsertIdealWeekRitual = z.infer<typeof insertIdealWeekRitualSchema>;
export type IdealWeekRitual = typeof idealWeekRitualsTable.$inferSelect;
export type IdealWeekCompletion = typeof idealWeekCompletionsTable.$inferSelect;
export type ScheduleBlock = typeof scheduleBlocksTable.$inferSelect;

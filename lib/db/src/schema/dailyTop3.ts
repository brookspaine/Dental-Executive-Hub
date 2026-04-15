import { pgTable, text, serial, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyTop3Table = pgTable("daily_top3", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  priority: integer("priority").notNull(),
  date: date("date", { mode: "string" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyTop3Schema = createInsertSchema(dailyTop3Table).omit({ id: true, createdAt: true });
export type InsertDailyTop3 = z.infer<typeof insertDailyTop3Schema>;
export type DailyTop3 = typeof dailyTop3Table.$inferSelect;

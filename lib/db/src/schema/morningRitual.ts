import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const morningRitualCompletionsTable = pgTable("morning_ritual_completions", {
  id: serial("id").primaryKey(),
  itemKey: text("item_key").notNull(),
  date: text("date").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

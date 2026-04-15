import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const weeklyTop3Table = pgTable("weekly_top3", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: integer("priority").notNull(),
  weekStart: text("week_start").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

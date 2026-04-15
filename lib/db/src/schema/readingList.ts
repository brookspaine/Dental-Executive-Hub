import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const readingListTable = pgTable("reading_list", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

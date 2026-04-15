import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const ritualItemsTable = pgTable("ritual_items", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

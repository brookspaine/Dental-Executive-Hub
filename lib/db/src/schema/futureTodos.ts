import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const futureTodosTable = pgTable("future_todos", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type FutureTodo = typeof futureTodosTable.$inferSelect;

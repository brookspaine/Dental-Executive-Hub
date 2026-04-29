import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { orgChartSeatsTable } from "./orgChartSeats";

export const seatTasksTable = pgTable("seat_tasks", {
  id: serial("id").primaryKey(),
  seatId: integer("seat_id")
    .notNull()
    .references(() => orgChartSeatsTable.id, { onDelete: "cascade" }),
  keyResultId: integer("key_result_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  assignee: text("assignee"),
  dueDate: text("due_date"),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SeatTask = typeof seatTasksTable.$inferSelect;

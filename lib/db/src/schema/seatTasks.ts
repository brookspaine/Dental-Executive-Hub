import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { orgChartSeatsTable } from "./orgChartSeats";

export const seatTasksTable = pgTable("seat_tasks", {
  id: serial("id").primaryKey(),
  seatId: integer("seat_id")
    .notNull()
    .references(() => orgChartSeatsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  dueDate: text("due_date"),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SeatTask = typeof seatTasksTable.$inferSelect;

import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { orgChartSeatsTable } from "./orgChartSeats";

export const seatKeyResultsTable = pgTable("seat_key_results", {
  id: serial("id").primaryKey(),
  seatId: integer("seat_id")
    .notNull()
    .references(() => orgChartSeatsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SeatKeyResult = typeof seatKeyResultsTable.$inferSelect;

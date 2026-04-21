import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { orgChartSeatsTable } from "./orgChartSeats";

export const vendorPasswordsTable = pgTable("vendor_passwords", {
  id: serial("id").primaryKey(),
  seatId: integer("seat_id")
    .notNull()
    .references(() => orgChartSeatsTable.id, { onDelete: "cascade" }),
  vendorName: text("vendor_name").notNull(),
  username: text("username"),
  password: text("password"),
  url: text("url"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VendorPassword = typeof vendorPasswordsTable.$inferSelect;

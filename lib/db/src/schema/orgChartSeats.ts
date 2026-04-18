import { pgTable, text, serial, integer, timestamp, jsonb, type AnyPgColumn } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const orgChartSeatsTable = pgTable("org_chart_seats", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  parentSeatId: integer("parent_seat_id").references(
    (): AnyPgColumn => orgChartSeatsTable.id,
    { onDelete: "set null" }
  ),
  title: text("title").notNull(),
  name: text("name"),
  accountabilities: jsonb("accountabilities").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrgChartSeat = typeof orgChartSeatsTable.$inferSelect;

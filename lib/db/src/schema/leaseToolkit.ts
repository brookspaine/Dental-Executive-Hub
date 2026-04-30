import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

/**
 * Single-row document store for the editable "Lease Toolkit" section
 * under the EDGE Organizations page. The application always reads/writes
 * the row with id = 1 — this is intentionally not multi-tenant or
 * versioned because the toolkit is a single living document, not a list.
 */
export const leaseToolkitTable = pgTable("lease_toolkit", {
  id: serial("id").primaryKey(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LeaseToolkitDoc = typeof leaseToolkitTable.$inferSelect;

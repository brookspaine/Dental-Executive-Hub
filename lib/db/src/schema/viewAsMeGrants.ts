import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { directReportsTable } from "./directReports";

export const viewAsMeGrantsTable = pgTable(
  "direct_report_view_as_me_grants",
  {
    id: serial("id").primaryKey(),
    directReportId: integer("direct_report_id")
      .notNull()
      .references(() => directReportsTable.id, { onDelete: "cascade" }),
    granteeReportId: integer("grantee_report_id")
      .notNull()
      .references(() => directReportsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("view_as_me_grants_pair_unique").on(
      table.directReportId,
      table.granteeReportId,
    ),
  }),
);

export const insertViewAsMeGrantSchema = createInsertSchema(
  viewAsMeGrantsTable,
).omit({ id: true, createdAt: true });
export type InsertViewAsMeGrant = z.infer<typeof insertViewAsMeGrantSchema>;
export type ViewAsMeGrant = typeof viewAsMeGrantsTable.$inferSelect;

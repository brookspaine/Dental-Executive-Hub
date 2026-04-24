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

export const additionalViewersTable = pgTable(
  "direct_report_additional_viewers",
  {
    id: serial("id").primaryKey(),
    directReportId: integer("direct_report_id")
      .notNull()
      .references(() => directReportsTable.id, { onDelete: "cascade" }),
    viewerReportId: integer("viewer_report_id")
      .notNull()
      .references(() => directReportsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("additional_viewers_pair_unique").on(
      table.directReportId,
      table.viewerReportId,
    ),
  }),
);

export const insertAdditionalViewerSchema = createInsertSchema(
  additionalViewersTable,
).omit({ id: true, createdAt: true });
export type InsertAdditionalViewer = z.infer<
  typeof insertAdditionalViewerSchema
>;
export type AdditionalViewer = typeof additionalViewersTable.$inferSelect;

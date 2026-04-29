import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamMembersTable } from "./teamMembers";

export const additionalViewersTable = pgTable(
  "team_member_additional_viewers",
  {
    id: serial("id").primaryKey(),
    teamMemberId: integer("team_member_id")
      .notNull()
      .references(() => teamMembersTable.id, { onDelete: "cascade" }),
    viewerTeamMemberId: integer("viewer_team_member_id")
      .notNull()
      .references(() => teamMembersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("additional_viewers_pair_unique").on(
      table.teamMemberId,
      table.viewerTeamMemberId,
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

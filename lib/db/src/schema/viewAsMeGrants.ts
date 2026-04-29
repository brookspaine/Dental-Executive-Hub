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

export const viewAsMeGrantsTable = pgTable(
  "team_member_view_as_me_grants",
  {
    id: serial("id").primaryKey(),
    teamMemberId: integer("team_member_id")
      .notNull()
      .references(() => teamMembersTable.id, { onDelete: "cascade" }),
    granteeTeamMemberId: integer("grantee_team_member_id")
      .notNull()
      .references(() => teamMembersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("view_as_me_grants_pair_unique").on(
      table.teamMemberId,
      table.granteeTeamMemberId,
    ),
  }),
);

export const insertViewAsMeGrantSchema = createInsertSchema(
  viewAsMeGrantsTable,
).omit({ id: true, createdAt: true });
export type InsertViewAsMeGrant = z.infer<typeof insertViewAsMeGrantSchema>;
export type ViewAsMeGrant = typeof viewAsMeGrantsTable.$inferSelect;

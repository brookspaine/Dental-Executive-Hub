import {
  pgTable,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { teamMembersTable } from "./teamMembers";

/**
 * Reservation table for 1-on-1 meetings (Phase 4). The page itself is not
 * built yet — this table exists so `action_items.one_on_one_id` has
 * something to point at and so future 1-on-1 work can plug in without a
 * second migration. Both participants are canonical team_members; either
 * side can be deleted (set null) without losing the meeting record.
 */
export const oneOnOnesTable = pgTable("one_on_ones", {
  id: serial("id").primaryKey(),
  participantATeamMemberId: integer("participant_a_team_member_id").references(
    () => teamMembersTable.id,
    { onDelete: "set null" },
  ),
  participantBTeamMemberId: integer("participant_b_team_member_id").references(
    () => teamMembersTable.id,
    { onDelete: "set null" },
  ),
  heldAt: timestamp("held_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OneOnOneRow = typeof oneOnOnesTable.$inferSelect;

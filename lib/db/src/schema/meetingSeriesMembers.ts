import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { teamMembersTable } from "./teamMembers";
import { meetingSeriesTable } from "./leadershipMeetings";

/**
 * Join table linking a meeting series to its team-member attendees.
 *
 * Replaces the legacy `meeting_series.members jsonb<string[]>` array
 * with proper FK relationships so a renamed team member shows up
 * everywhere immediately. The legacy `members` jsonb column is still
 * read for back-compat until the full migration is done.
 */
export const meetingSeriesMembersTable = pgTable(
  "meeting_series_members",
  {
    id: serial("id").primaryKey(),
    seriesId: integer("series_id")
      .notNull()
      .references(() => meetingSeriesTable.id, { onDelete: "cascade" }),
    teamMemberId: integer("team_member_id")
      .notNull()
      .references(() => teamMembersTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("meeting_series_members_pair_unique").on(
      table.seriesId,
      table.teamMemberId,
    ),
  }),
);

export type MeetingSeriesMember = typeof meetingSeriesMembersTable.$inferSelect;

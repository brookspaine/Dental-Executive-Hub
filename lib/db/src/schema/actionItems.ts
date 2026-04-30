import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import {
  meetingAgendasTable,
  meetingKeyTopicsTable,
} from "./leadershipMeetings";
import { rolesTable } from "./roles";
import { oneOnOnesTable } from "./oneOnOnes";

export type ActionItemNoteJson = { label: string; href?: string };

/**
 * Canonical action-item source kinds (Phase 4). `source_kind` is a
 * denormalized discriminator so the sidebar can filter and render the
 * "Source" chip without joining four optional FKs. The matching FK column
 * (agenda_id / key_topic_id / seat_id / one_on_one_id) MUST be set when
 * source_kind != 'manual'.
 */
export const ACTION_ITEM_SOURCE_KINDS = [
  "manual",
  "leadership_meeting",
  "key_topic",
  "seat",
  "one_on_one",
] as const;
export type ActionItemSourceKind = (typeof ACTION_ITEM_SOURCE_KINDS)[number];

export const actionItemsTable = pgTable("action_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  /**
   * Optional FK to the canonical user identity. When set, the owner
   * survives display-name changes (rename of the teammate's profile).
   * Null for items assigned to teammates who have never signed in yet —
   * those continue to rely on the denormalized name + initials.
   */
  ownerUserId: text("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  /**
   * Canonical FK to the assignee team member. Preferred over
   * `ownerName`/`ownerInitials`, which are now denormalized display
   * caches that survive a member's display name change.
   */
  ownerTeamMemberId: integer("owner_team_member_id"),
  ownerName: text("owner_name").notNull(),
  ownerInitials: text("owner_initials").notNull(),
  dueBy: text("due_by").notNull().default("—"),
  dueByFull: text("due_by_full").notNull().default(""),
  notes: jsonb("notes").$type<ActionItemNoteJson[]>(),
  starred: boolean("starred").notNull().default(false),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
  /**
   * Phase 4: source FKs. Each is independent and nullable; at most one
   * will be set per row, with `sourceKind` telling the UI which one is
   * authoritative for the deep link / Source chip. On-delete set null so
   * the item survives the source being removed (it just becomes a manual
   * item the user can re-classify).
   */
  sourceKind: text("source_kind").notNull().default("manual"),
  agendaId: integer("agenda_id").references(() => meetingAgendasTable.id, {
    onDelete: "set null",
  }),
  keyTopicId: integer("key_topic_id").references(
    () => meetingKeyTopicsTable.id,
    { onDelete: "set null" },
  ),
  seatId: integer("seat_id").references(() => rolesTable.id, {
    onDelete: "set null",
  }),
  oneOnOneId: integer("one_on_one_id").references(() => oneOnOnesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ActionItemRow = typeof actionItemsTable.$inferSelect;

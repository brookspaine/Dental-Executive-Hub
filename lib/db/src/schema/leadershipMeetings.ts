import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
// `jsonb` import is retained because `sectionData` below still uses it.

/**
 * Meeting series. The roster used to live here as a `members jsonb`
 * array of display strings; that field has been retired in Phase 3 in
 * favor of the canonical `meeting_series_members` join table (see
 * `meetingSeriesMembersTable`). The API still surfaces a derived
 * `members: string[]` on responses for back-compat with existing UI.
 */
export const meetingSeriesTable = pgTable("meeting_series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organization: text("organization"),
  desiredFuture: text("desired_future"),
  desiredFutureStatus: text("desired_future_status").default("on-pace"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MeetingSeries = typeof meetingSeriesTable.$inferSelect;

export type AgendaSectionData = {
  iceBreaker?: string;
  winsShoutouts?: string;
  scoreCard?: string;
  desiredFuture?: string;
  closeTheLoop?: string;
};

export const meetingAgendasTable = pgTable("meeting_agendas", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id")
    .notNull()
    .references(() => meetingSeriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sectionData: jsonb("section_data")
    .$type<AgendaSectionData>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type MeetingAgenda = typeof meetingAgendasTable.$inferSelect;

export const meetingKeyTopicsTable = pgTable("meeting_key_topics", {
  id: serial("id").primaryKey(),
  agendaId: integer("agenda_id")
    .notNull()
    .references(() => meetingAgendasTable.id, { onDelete: "cascade" }),
  coreIssue: text("core_issue").notNull(),
  owner: text("owner"),
  notes: text("notes"),
  resolved: boolean("resolved").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MeetingKeyTopic = typeof meetingKeyTopicsTable.$inferSelect;

export const meetingActionItemsTable = pgTable("meeting_action_items", {
  id: serial("id").primaryKey(),
  agendaId: integer("agenda_id")
    .notNull()
    .references(() => meetingAgendasTable.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  owner: text("owner"),
  dueDate: text("due_date"),
  isDailyTop3: boolean("is_daily_top_3").notNull().default(false),
  notes: text("notes"),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MeetingActionItem = typeof meetingActionItemsTable.$inferSelect;

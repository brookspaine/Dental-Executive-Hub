import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* Direct Reports (people). business_ids is an array because a DR can be
   shared/mirrored across multiple businesses (e.g. Carrie works for both
   EDGE and Urgent Dental — edits in either surface are reflected in both). */
export const ccDirectReportsTable = pgTable("cc_direct_reports", {
  id: serial("id").primaryKey(),
  businessIds: integer("business_ids").array().notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  /* When true, the person is NOT rendered as a section in the Direct
     Reports list but IS still returned by GET /direct-reports so they
     remain selectable as an owner in task pickers (project + DR tasks). */
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcDirectReport = typeof ccDirectReportsTable.$inferSelect;

/* Projects — also multi-business (see ccDirectReportsTable). */
export const ccProjectsTable = pgTable("cc_projects", {
  id: serial("id").primaryKey(),
  businessIds: integer("business_ids").array().notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active | on_hold | complete
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcProject = typeof ccProjectsTable.$inferSelect;

/* Life Areas (seeded). Each life area carries the rich "yearly planning"
   context fields surfaced under each accordion: Identity, Why, How I Preserve,
   Feels Like — all free-form bullet lists. Outcome/Performance/Process goals
   live in `cc_life_area_goals`. */
export const ccLifeAreasTable = pgTable("cc_life_areas", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  accentColor: text("accent_color").notNull().default("#8a9a5b"),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  identity: text("identity").array().notNull().default(sql`'{}'::text[]`),
  why: text("why").array().notNull().default(sql`'{}'::text[]`),
  howIPreserve: text("how_i_preserve").array().notNull().default(sql`'{}'::text[]`),
  feelsLike: text("feels_like").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcLifeArea = typeof ccLifeAreasTable.$inferSelect;

/* Per-Life-Area structured goals (Outcome / Performance / Process Goals).
   Status uses the 4-state vocabulary from the legacy Best Year Ever planner:
   not_started | in_progress | launched | achieved. */
export const ccLifeAreaGoalsTable = pgTable("cc_life_area_goals", {
  id: serial("id").primaryKey(),
  lifeAreaId: integer("life_area_id").notNull(),
  goalType: text("goal_type").notNull(),
  // outcome | performance | process_continue | process_more_consistent | process_begin
  text: text("text").notNull(),
  status: text("status").notNull().default("not_started"),
  nextSteps: text("next_steps").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type CcLifeAreaGoal = typeof ccLifeAreaGoalsTable.$inferSelect;

/* Task sections — Asana-style named groups within a parent */
export const ccTaskSectionsTable = pgTable("cc_task_sections", {
  id: serial("id").primaryKey(),
  parentType: text("parent_type").notNull(),
  parentId: integer("parent_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcTaskSection = typeof ccTaskSectionsTable.$inferSelect;

/* Tasks (polymorphic parent — business inherited from parent container) */
export const ccTasksTable = pgTable(
  "cc_tasks",
  {
    id: serial("id").primaryKey(),
    parentType: text("parent_type").notNull(),
    parentId: integer("parent_id").notNull(),
    sectionId: integer("section_id"),
    ownerDirectReportId: integer("owner_direct_report_id"),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    status: text("status").notNull().default("not_started"),
    dueDate: date("due_date", { mode: "string" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
);
export type CcTask = typeof ccTasksTable.$inferSelect;

/* Brain Dump — each entry tagged with the business in scope when captured */
export const ccBrainDumpTable = pgTable("cc_brain_dump", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  text: text("text").notNull(),
  outcome: text("outcome"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  routedTaskId: integer("routed_task_id"),
  routedTaskType: text("routed_task_type"),
  routedSlot: integer("routed_slot"),
  routedSnapshot: text("routed_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type CcBrainDump = typeof ccBrainDumpTable.$inferSelect;

/* Today's Top 3 — 3 fixed slots per business */
export const ccTop3Table = pgTable(
  "cc_top3",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    slot: integer("slot").notNull(),
    text: text("text").notNull().default(""),
    done: boolean("done").notNull().default(false),
    date: date("date", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    businessSlotUnique: uniqueIndex("cc_top3_business_slot_unique").on(
      t.businessId,
      t.slot,
    ),
  }),
);
export type CcTop3 = typeof ccTop3Table.$inferSelect;

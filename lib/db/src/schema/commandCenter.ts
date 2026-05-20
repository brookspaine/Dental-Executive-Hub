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

/* Direct Reports (people) */
export const ccDirectReportsTable = pgTable("cc_direct_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcDirectReport = typeof ccDirectReportsTable.$inferSelect;

/* Projects */
export const ccProjectsTable = pgTable("cc_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active | on_hold | complete
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcProject = typeof ccProjectsTable.$inferSelect;

/* Life Areas (seeded) */
export const ccLifeAreasTable = pgTable("cc_life_areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accentColor: text("accent_color").notNull().default("#8a9a5b"),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcLifeArea = typeof ccLifeAreasTable.$inferSelect;

/* Task sections — Asana-style named groups within a parent */
export const ccTaskSectionsTable = pgTable("cc_task_sections", {
  id: serial("id").primaryKey(),
  parentType: text("parent_type").notNull(), // life_area | direct_report | project
  parentId: integer("parent_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type CcTaskSection = typeof ccTaskSectionsTable.$inferSelect;

/* Tasks (polymorphic parent) */
export const ccTasksTable = pgTable(
  "cc_tasks",
  {
    id: serial("id").primaryKey(),
    parentType: text("parent_type").notNull(), // life_area | direct_report | project
    parentId: integer("parent_id").notNull(),
    sectionId: integer("section_id"),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    status: text("status").notNull().default("not_started"), // not_started | in_progress | completed
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

/* Brain Dump */
export const ccBrainDumpTable = pgTable("cc_brain_dump", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type CcBrainDump = typeof ccBrainDumpTable.$inferSelect;

/* Today's Top 3 — 3 fixed slots, reset when date rolls over */
export const ccTop3Table = pgTable(
  "cc_top3",
  {
    id: serial("id").primaryKey(),
    slot: integer("slot").notNull(), // 1, 2, or 3
    text: text("text").notNull().default(""),
    date: date("date", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    slotUnique: uniqueIndex("cc_top3_slot_unique").on(t.slot),
  }),
);
export type CcTop3 = typeof ccTop3Table.$inferSelect;

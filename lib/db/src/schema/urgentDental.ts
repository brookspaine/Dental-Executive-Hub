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

export const udDirectReportsTable = pgTable("ud_direct_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type UdDirectReport = typeof udDirectReportsTable.$inferSelect;

export const udProjectsTable = pgTable("ud_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type UdProject = typeof udProjectsTable.$inferSelect;

export const udLifeAreasTable = pgTable("ud_life_areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accentColor: text("accent_color").notNull().default("#8a9a5b"),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type UdLifeArea = typeof udLifeAreasTable.$inferSelect;

export const udTaskSectionsTable = pgTable("ud_task_sections", {
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
export type UdTaskSection = typeof udTaskSectionsTable.$inferSelect;

export const udTasksTable = pgTable("ud_tasks", {
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
});
export type UdTask = typeof udTasksTable.$inferSelect;

export const udBrainDumpTable = pgTable("ud_brain_dump", {
  id: serial("id").primaryKey(),
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
export type UdBrainDump = typeof udBrainDumpTable.$inferSelect;

export const udTop3Table = pgTable(
  "ud_top3",
  {
    id: serial("id").primaryKey(),
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
    slotUnique: uniqueIndex("ud_top3_slot_unique").on(t.slot),
  }),
);
export type UdTop3 = typeof udTop3Table.$inferSelect;

export const udFutureTodosTable = pgTable("ud_future_todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type UdFutureTodo = typeof udFutureTodosTable.$inferSelect;

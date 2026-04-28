import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export type ActionItemNoteJson = { label: string; href?: string };

export const actionItemsTable = pgTable("action_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  ownerName: text("owner_name").notNull().default("Brooks Paine"),
  ownerInitials: text("owner_initials").notNull().default("BP"),
  dueBy: text("due_by").notNull().default("—"),
  dueByFull: text("due_by_full").notNull().default(""),
  notes: jsonb("notes").$type<ActionItemNoteJson[]>(),
  starred: boolean("starred").notNull().default(false),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ActionItemRow = typeof actionItemsTable.$inferSelect;

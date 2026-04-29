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

export type ActionItemNoteJson = { label: string; href?: string };

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
  ownerName: text("owner_name").notNull(),
  ownerInitials: text("owner_initials").notNull(),
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
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ActionItemRow = typeof actionItemsTable.$inferSelect;

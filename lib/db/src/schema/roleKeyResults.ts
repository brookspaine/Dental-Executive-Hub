import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { rolesTable } from "./roles";

export const roleKeyResultsTable = pgTable("role_key_results", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id")
    .notNull()
    .references(() => rolesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoleKeyResult = typeof roleKeyResultsTable.$inferSelect;

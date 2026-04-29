import {
  pgTable,
  text,
  serial,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export type PlaybookStep = {
  id: string;
  text: string;
};

export const playbooksTable = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("Operational Process"),
  purpose: text("purpose").notNull().default(""),
  whenToUse: text("when_to_use").notNull().default(""),
  steps: jsonb("steps").$type<PlaybookStep[]>().notNull().default([]),
  decisionPoints: text("decision_points").notNull().default(""),
  commonPitfalls: text("common_pitfalls").notNull().default(""),
  relatedPlaybookIds: jsonb("related_playbook_ids")
    .$type<number[]>()
    .notNull()
    .default([]),
  // Many-to-many to roles, denormalized as int[] for simple `roleId = ANY(...)`
  // queries when filtering the global library.
  roleIds: jsonb("role_ids").$type<number[]>().notNull().default([]),
  lastReviewedBy: text("last_reviewed_by").notNull().default(""),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PlaybookRow = typeof playbooksTable.$inferSelect;

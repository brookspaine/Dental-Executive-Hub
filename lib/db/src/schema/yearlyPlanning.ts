import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const yearlyPlanningSectionsTable = pgTable("yearly_planning_sections", {
  id: serial("id").primaryKey(),
  sectionKey: text("section_key").notNull().unique(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type YearlyPlanningSection =
  typeof yearlyPlanningSectionsTable.$inferSelect;

import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const weeklyReviewEntriesTable = pgTable(
  "weekly_review_entries",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    week: integer("week").notNull(),
    fieldKey: text("field_key").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    yearWeekFieldUnique: uniqueIndex("weekly_review_year_week_field_uniq").on(
      t.year,
      t.week,
      t.fieldKey,
    ),
  }),
);

export type WeeklyReviewEntry = typeof weeklyReviewEntriesTable.$inferSelect;

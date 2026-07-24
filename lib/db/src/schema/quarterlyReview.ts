import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

/* Per-field storage for the Quarterly Review, mirroring weekly_review_entries
   (year+week) with year+quarter instead. field_key covers both fixed reflect
   prompts and dynamic per-objective score keys (e.g. "score_123"). */
export const quarterlyReviewEntriesTable = pgTable(
  "quarterly_review_entries",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    quarter: integer("quarter").notNull(),
    fieldKey: text("field_key").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    yearQuarterFieldUnique: uniqueIndex("quarterly_review_year_quarter_field_uniq").on(
      t.year,
      t.quarter,
      t.fieldKey,
    ),
  }),
);

export type QuarterlyReviewEntry = typeof quarterlyReviewEntriesTable.$inferSelect;

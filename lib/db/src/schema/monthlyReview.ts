import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

/* Per-field storage for the Monthly Review, mirroring quarterly_review_entries
   (year+quarter) with year+month instead. field_key covers the personal-finance
   prompts and the light personal-assessment capture fields. */
export const monthlyReviewEntriesTable = pgTable(
  "monthly_review_entries",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    fieldKey: text("field_key").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    yearMonthFieldUnique: uniqueIndex("monthly_review_year_month_field_uniq").on(
      t.year,
      t.month,
      t.fieldKey,
    ),
  }),
);

export type MonthlyReviewEntry = typeof monthlyReviewEntriesTable.$inferSelect;

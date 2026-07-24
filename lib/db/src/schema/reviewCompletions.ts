import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/* Records that a recurring review was completed for a given period. This is
   what stops the review reminder pop-up until the next period.
   - kind: "weekly" | "quarterly"
   - period: ISO week (1-53) for weekly, quarter (1-4) for quarterly
   Due-ness is computed client-side from these rows; the server only stores
   the fact of completion (see the review reminder modal). */
export const reviewCompletionsTable = pgTable(
  "review_completions",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    year: integer("year").notNull(),
    period: integer("period").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    kindYearPeriodUnique: uniqueIndex("review_completions_kind_year_period_uniq").on(
      t.kind,
      t.year,
      t.period,
    ),
  }),
);

export type ReviewCompletion = typeof reviewCompletionsTable.$inferSelect;

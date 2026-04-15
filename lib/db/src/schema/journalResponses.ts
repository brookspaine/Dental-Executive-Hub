import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const journalResponsesTable = pgTable("journal_responses", {
  id: serial("id").primaryKey(),
  promptKey: text("prompt_key").notNull(),
  date: text("date").notNull(),
  response: text("response").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

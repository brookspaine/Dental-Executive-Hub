import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wisdomQuotesTable = pgTable("wisdom_quotes", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  author: text("author"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWisdomQuoteSchema = createInsertSchema(wisdomQuotesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWisdomQuote = z.infer<typeof insertWisdomQuoteSchema>;
export type WisdomQuote = typeof wisdomQuotesTable.$inferSelect;

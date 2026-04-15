import { pgTable, text, serial, timestamp, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const directReportsTable = pgTable("direct_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  organizationId: integer("organization_id").references(() => organizationsTable.id),
  status: text("status").notNull().default("active"),
  hireDate: date("hire_date", { mode: "string" }),
  performanceRating: real("performance_rating"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDirectReportSchema = createInsertSchema(directReportsTable).omit({ id: true, createdAt: true });
export type InsertDirectReport = z.infer<typeof insertDirectReportSchema>;
export type DirectReport = typeof directReportsTable.$inferSelect;

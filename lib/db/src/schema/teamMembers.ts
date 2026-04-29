import { pgTable, text, serial, timestamp, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

/**
 * Team members — the canonical "person" entity for the dashboard.
 *
 * One row per person who works at any EDGE/UD location (or is otherwise
 * managed in the org chart). This is the source of truth that downstream
 * tables (roles, action_items, meeting_series_members) reference by FK.
 *
 * Lineage: this table was renamed from `direct_reports` to `team_members`
 * via `pnpm --filter @workspace/scripts run rename:direct-reports`, which
 * issues idempotent `ALTER TABLE ... RENAME` statements. Backwards-compat
 * aliases (`directReportsTable`, `DirectReport`) are re-exported below so
 * legacy call-sites keep compiling while they're migrated.
 *
 * `organizationId` is the team member's primary location (single-location
 * for now; the design allows adding a separate join table later if
 * someone needs to be assigned to multiple locations).
 *
 * `clerkUserId` is nullable and links the team member to a Clerk
 * authenticated user when they actually sign in. A team member can exist
 * indefinitely without ever signing in.
 */
export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  organizationId: integer("organization_id").references(() => organizationsTable.id),
  /**
   * Free-text field that the existing UI uses as "Reports to" (the
   * manager's name). Kept as-is for now; once every team member is
   * created via the picker we can promote this to a proper FK
   * (`manager_id`) in a follow-up.
   */
  organization: text("organization"),
  status: text("status").notNull().default("active"),
  hireDate: date("hire_date", { mode: "string" }),
  performanceRating: real("performance_rating"),
  avatarUrl: text("avatar_url"),
  clerkUserId: text("clerk_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembersTable.$inferSelect;

/**
 * Backwards-compatible aliases. Existing code that imports
 * `directReportsTable` / `DirectReport` continues to compile while
 * call-sites are migrated. New code should import the team-member names.
 */
export const directReportsTable = teamMembersTable;
export const insertDirectReportSchema = insertTeamMemberSchema;
export type InsertDirectReport = InsertTeamMember;
export type DirectReport = TeamMember;

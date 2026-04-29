import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  real,
  date,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
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
   * Legacy free-text "Reports to" / business unit string. The canonical
   * manager link is `managerId` below; this string is preserved for
   * back-compat (existing UI fields, exports) and is allowed to drift
   * out of sync — `managerId` wins.
   */
  organization: text("organization"),
  /**
   * Self-FK to the team member this person reports to. Nullable (top
   * of the chart). On parent delete we set to NULL so deleting a
   * manager doesn't cascade through the org.
   */
  managerId: integer("manager_id").references((): AnyPgColumn => teamMembersTable.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("active"),
  hireDate: date("hire_date", { mode: "string" }),
  performanceRating: real("performance_rating"),
  avatarUrl: text("avatar_url"),
  // Nullable but unique: at most one team member can be linked to a given
  // Clerk user. The server also pre-validates existence + 409s on conflict
  // so callers get a friendly error instead of a raw DB constraint failure.
  clerkUserId: text("clerk_user_id")
    .references(() => usersTable.id, {
      onDelete: "set null",
    })
    .unique(),
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

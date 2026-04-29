import {
  pgTable,
  text,
  serial,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export type RoleChecklistItem = {
  id: string;
  task: string;
  estimatedMinutes: number;
  linkedPlaybookId: number | null;
  linkedDecisionId: string | null;
};

export type RoleChecklists = {
  startOfDay: RoleChecklistItem[];
  downtime: RoleChecklistItem[];
  endOfDay: RoleChecklistItem[];
};

export type RoleDecision = {
  id: string;
  decisionType: string;
  authorityLevel:
    | "Decide & Act"
    | "Decide & Inform"
    | "Recommend Only"
    | "Escalate";
  escalationToRoleId: number | null;
  boundaryConditions: string;
  linkedPlaybookId: number | null;
  category: "Clinical" | "Operational" | "Financial" | "People";
};

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  seatHolderName: text("seat_holder_name").notNull().default("Open"),
  seatHolderInitials: text("seat_holder_initials").notNull().default(""),
  reportsToRoleId: integer("reports_to_role_id"),
  organizationId: integer("organization_id"),
  businessArea: text("business_area").notNull().default("Operations"),
  tier: text("tier").notNull().default("Operations Support"),

  // Section 1: Purpose & Cultural Alignment
  purposeStatement: text("purpose_statement").notNull().default(""),
  missionAlignment: text("mission_alignment").notNull().default(""),
  culturalAlignment: text("cultural_alignment").notNull().default(""),
  vegStyleImpact: text("veg_style_impact").notNull().default(""),

  // Section 2: Key Results Area — bullet list of measurable outcomes,
  // mirroring the Practice Org Chart "Key Results Area" pattern.
  keyResultsArea: jsonb("key_results_area")
    .$type<string[]>()
    .notNull()
    .default([]),

  // Section 3: Daily Operations Protocol
  checklists: jsonb("checklists")
    .$type<RoleChecklists>()
    .notNull()
    .default({ startOfDay: [], downtime: [], endOfDay: [] }),

  // Section 4: Decisions to Own
  decisions: jsonb("decisions")
    .$type<RoleDecision[]>()
    .notNull()
    .default([]),

  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type RoleRow = typeof rolesTable.$inferSelect;

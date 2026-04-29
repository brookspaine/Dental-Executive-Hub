import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export type BuildoutActivityEntry = {
  timestamp: string;
  text: string;
};

export type BuildoutCategoryFields = Record<string, unknown>;

export const buildoutCardsTable = pgTable("buildout_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  ownerName: text("owner_name").notNull(),
  category: text("category").notNull(),
  businessArea: text("business_area").notNull().default("Operations"),
  status: text("status").notNull().default("backlog"),
  position: integer("position").notNull().default(0),
  organizationId: integer("organization_id"),
  kraLink: text("kra_link"),
  targetDoneDate: text("target_done_date"),
  definitionOfDone: text("definition_of_done").notNull().default(""),
  blocker: text("blocker"),
  escalationTrigger: text("escalation_trigger"),
  categoryFields: jsonb("category_fields").$type<BuildoutCategoryFields>(),
  activityLog: jsonb("activity_log").$type<BuildoutActivityEntry[]>(),
  waitingSince: timestamp("waiting_since", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BuildoutCardRow = typeof buildoutCardsTable.$inferSelect;

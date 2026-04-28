import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Users table — one row per authenticated person who has ever signed
 * into the dashboard. The primary key is Clerk's user id (a stable
 * external identifier) so the rest of the schema can reference it via
 * `text` foreign keys without depending on Clerk being online.
 *
 * The display fields (name, email, imageUrl) are denormalized copies of
 * the Clerk profile and are upserted on every authenticated request via
 * the `requireAuth` middleware. They power lookups (e.g. "owner_user_id")
 * after a teammate's display name changes.
 */
export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof usersTable.$inferSelect;

import { customType, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/* Uploaded files (board photos, lease documents) stored as rows so they
   survive redeploys — Railway containers have no persistent filesystem and
   the previous Replit object-storage backend is unreachable off-Replit.
   `path` is the public object path, e.g. "/objects/uploads/<uuid>". */
export const storedObjectsTable = pgTable("stored_objects", {
  path: text("path").primaryKey(),
  contentType: text("content_type").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type StoredObject = typeof storedObjectsTable.$inferSelect;

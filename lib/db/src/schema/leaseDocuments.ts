import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { leaseRecordsTable } from "./leaseRecords";

/**
 * Documents attached to a lease record. Free-form: each upload has a
 * user-supplied label and a "type" tag (Signed Lease, LOI, Amendment,
 * Exhibit, Side Letter, Guaranty, Signage Approval, Exclusive Recording,
 * Other). The actual file lives in object storage; we just persist its
 * /objects/... path.
 */
export const leaseDocumentsTable = pgTable("lease_documents", {
  id: serial("id").primaryKey(),
  leaseRecordId: integer("lease_record_id")
    .notNull()
    .references(() => leaseRecordsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  label: text("label").notNull(),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  contentType: text("content_type"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  uploadedByName: text("uploaded_by_name"),
});

export type LeaseDocumentRow = typeof leaseDocumentsTable.$inferSelect;

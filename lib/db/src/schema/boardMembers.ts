import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";

export const boardMembersTable = pgTable("board_members", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  name: text("name"),
  x: integer("x").notNull().default(8),
  y: integer("y").notNull().default(8),
  size: integer("size").notNull().default(96),
  focalX: real("focal_x").notNull().default(50),
  focalY: real("focal_y").notNull().default(50),
  zoom: real("zoom").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

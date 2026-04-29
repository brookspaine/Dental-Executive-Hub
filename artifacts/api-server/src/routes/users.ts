import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { ListUsersResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Read-only listing of Clerk-backed users. Drives the "Linked account"
 * picker on the Team Members edit dialog so we can attach a real Clerk
 * identity to a free-form team member row.
 */
router.get("/users", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      imageUrl: usersTable.imageUrl,
    })
    .from(usersTable)
    .orderBy(asc(usersTable.name));
  res.json(ListUsersResponse.parse(rows));
});

export default router;

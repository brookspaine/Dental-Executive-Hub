import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";

export type AuthedUser = {
  id: string;
  email: string | null;
  name: string;
  initials: string;
  imageUrl: string | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authedUser?: AuthedUser;
    }
  }
}

function deriveName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  emailAddresses?: { emailAddress: string }[];
}): string {
  const parts = [user.firstName ?? "", user.lastName ?? ""]
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (user.username && user.username.trim().length > 0) return user.username.trim();
  const email = user.emailAddresses?.[0]?.emailAddress;
  if (email) return email.split("@")[0];
  return "Teammate";
}

export function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Look up the signed-in Clerk user, upsert a row in the `users` table
 * with the latest profile snapshot, and attach `req.authedUser`. Returns
 * 401 if there is no valid session.
 *
 * The denormalized name/email/imageUrl columns let us render owners and
 * other identity fields without round-tripping to Clerk on every read.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const name = deriveName(user);
    const initials = deriveInitials(name);
    const email = user.emailAddresses?.[0]?.emailAddress ?? null;
    const imageUrl = user.imageUrl ?? null;

    await db
      .insert(usersTable)
      .values({ id: userId, name, email, imageUrl })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { name, email, imageUrl, updatedAt: new Date() },
      });

    req.authedUser = { id: userId, email, name, initials, imageUrl };
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to load user profile" });
  }
}

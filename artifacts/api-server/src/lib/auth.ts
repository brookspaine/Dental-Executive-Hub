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
 * AUTH IS CURRENTLY DISABLED while the app is being built — every
 * request is treated as the local "Dev User" and routes that depend on
 * `req.authedUser` continue to work unchanged.
 *
 * To re-enable real Clerk auth, restore the original implementation
 * (kept in git history): call `getAuth(req)`, 401 on missing userId,
 * upsert the real Clerk profile into `users`, and attach req.authedUser.
 */
const DEV_USER: AuthedUser = {
  id: "dev-user",
  name: "Dev User",
  initials: "DU",
  email: null,
  imageUrl: null,
};

let devUserSeeded = false;

async function ensureDevUserRow(): Promise<void> {
  if (devUserSeeded) return;
  try {
    await db
      .insert(usersTable)
      .values({
        id: DEV_USER.id,
        name: DEV_USER.name,
        email: DEV_USER.email,
        imageUrl: DEV_USER.imageUrl,
      })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { name: DEV_USER.name, updatedAt: new Date() },
      });
    devUserSeeded = true;
  } catch {
    // Leave devUserSeeded=false so the next request retries; routes that
    // need ownerUserId can fall back to null.
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  await ensureDevUserRow();
  req.authedUser = DEV_USER;
  next();
}

// Keep these imports referenced so re-enabling real auth is a one-line
// edit (no need to re-add imports).
void clerkClient;
void getAuth;

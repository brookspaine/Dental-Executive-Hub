import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useUser } from "@clerk/react";
import { getInitials } from "@/lib/current-user";

/**
 * The "active user" is the persona the dashboard is acting as for the
 * current browser session. It now mirrors the signed-in Clerk user so
 * every consumer (header, owner picker, action item ownership) sees a
 * consistent identity for the actual logged-in teammate.
 *
 * The context is intentionally a thin wrapper around `useUser` so the
 * rest of the codebase can stay agnostic of the auth provider. Until
 * Clerk has finished loading, we surface a placeholder value with an
 * empty `id`; downstream components should treat `id === ""` as
 * "auth not yet ready" and avoid using it as an FK.
 */
export type ActiveUser = {
  id: string;
  name: string;
  initials: string;
  title: string;
  imageUrl: string | null;
};

const PLACEHOLDER_ACTIVE_USER: ActiveUser = {
  id: "",
  name: "",
  initials: "",
  title: "",
  imageUrl: null,
};

type ActiveUserContextValue = {
  activeUser: ActiveUser;
};

const ActiveUserContext = createContext<ActiveUserContextValue | null>(null);

function pickName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: { emailAddress: string }[];
}): string {
  const parts = [user.firstName ?? "", user.lastName ?? ""]
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (user.username && user.username.trim().length > 0) {
    return user.username.trim();
  }
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    "";
  if (email) return email.split("@")[0];
  return "Teammate";
}

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();

  const value = useMemo<ActiveUserContextValue>(() => {
    if (!isLoaded || !user) {
      return { activeUser: PLACEHOLDER_ACTIVE_USER };
    }
    const name = pickName(user);
    return {
      activeUser: {
        id: user.id,
        name,
        initials: getInitials(name),
        title: (user.publicMetadata?.title as string | undefined) ?? "",
        imageUrl: user.imageUrl ?? null,
      },
    };
  }, [isLoaded, user]);

  return (
    <ActiveUserContext.Provider value={value}>
      {children}
    </ActiveUserContext.Provider>
  );
}

export function useActiveUser(): ActiveUserContextValue {
  const v = useContext(ActiveUserContext);
  if (!v) {
    throw new Error("useActiveUser must be used within ActiveUserProvider");
  }
  return v;
}

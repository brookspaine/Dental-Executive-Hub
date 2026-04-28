import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The "active user" is the persona the dashboard is acting as for the
 * current browser session. Until real authentication is wired up, we
 * persist this choice in localStorage so each browser/session can
 * represent a different teammate. The default is the CEO (Brooks
 * Paine) so existing single-user installs behave the same as before.
 *
 * This is intentionally a thin abstraction: when real auth lands, the
 * provider can be swapped to read from the auth session and `useActiveUser`
 * keeps its same contract for every consumer.
 */
export type ActiveUser = {
  name: string;
  initials: string;
  title: string;
};

const STORAGE_KEY = "dental-dashboard:active-user:v1";

export const DEFAULT_ACTIVE_USER: ActiveUser = {
  name: "Brooks Paine",
  initials: "BP",
  title: "Chief Executive Officer",
};

type ActiveUserContextValue = {
  activeUser: ActiveUser;
  setActiveUser: (next: ActiveUser) => void;
  resetActiveUser: () => void;
};

const ActiveUserContext = createContext<ActiveUserContextValue | null>(null);

function readStored(): ActiveUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.name === "string" &&
      parsed.name.trim().length > 0 &&
      typeof parsed.initials === "string" &&
      parsed.initials.trim().length > 0
    ) {
      return {
        name: parsed.name,
        initials: parsed.initials,
        title:
          typeof parsed.title === "string" && parsed.title.length > 0
            ? parsed.title
            : "",
      };
    }
  } catch {
    // ignore corrupted entries; fall back to default
  }
  return null;
}

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUserState] = useState<ActiveUser>(
    () => readStored() ?? DEFAULT_ACTIVE_USER,
  );

  const setActiveUser = useCallback((next: ActiveUser) => {
    setActiveUserState(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage may be unavailable; in-memory state is still updated
    }
  }, []);

  const resetActiveUser = useCallback(() => {
    setActiveUser(DEFAULT_ACTIVE_USER);
  }, [setActiveUser]);

  const value = useMemo<ActiveUserContextValue>(
    () => ({ activeUser, setActiveUser, resetActiveUser }),
    [activeUser, setActiveUser, resetActiveUser],
  );

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

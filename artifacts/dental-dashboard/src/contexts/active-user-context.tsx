import { createContext, useContext, type ReactNode } from "react";
export type ActiveUser = {
  id: string;
  name: string;
  initials: string;
  title: string;
  imageUrl: string | null;
};

const PLACEHOLDER_ACTIVE_USER: ActiveUser = {
  id: "dev-user",
  name: "Dev User",
  initials: "DU",
  title: "",
  imageUrl: null,
};

type ActiveUserContextValue = {
  activeUser: ActiveUser;
};

const ActiveUserContext = createContext<ActiveUserContextValue | null>(null);

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  return (
    <ActiveUserContext.Provider value={{ activeUser: PLACEHOLDER_ACTIVE_USER }}>
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

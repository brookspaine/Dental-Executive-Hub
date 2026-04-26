import { createContext, useContext, useState, ReactNode } from "react";

export type ActionItemNote = { label: string; href?: string };

export type ActionItem = {
  id: string;
  title: string;
  owner: { name: string; initials: string };
  source: string;
  dueBy: string;
  dueByFull: string;
  notes?: ActionItemNote[];
  starred?: boolean;
  done?: boolean;
};

const sampleItems: ActionItem[] = [
  {
    id: "1",
    title: "Check out the Leadership Team Meeting tool.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
    notes: [{ label: "Review your agenda." }],
  },
  {
    id: "2",
    title: "Decide the details for your strategy meeting.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
  },
  {
    id: "3",
    title: "Strategy Meeting Prep: Plan your talking points.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
  },
  {
    id: "4",
    title: "Strategy Meeting Prep: Review your numbers.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
  },
  {
    id: "5",
    title: "Invite Your Team to Elite.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
  },
  {
    id: "6",
    title: "Host the Annual Strategy meeting.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
    dueByFull: "4/23/2026",
  },
];

type ActionItemsContextValue = {
  items: ActionItem[];
  setItems: React.Dispatch<React.SetStateAction<ActionItem[]>>;
  addItem: (input: {
    title: string;
    source: string;
    dueDate?: string;
    notes?: string;
  }) => void;
  toggleDone: (id: string) => void;
  toggleStar: (id: string) => void;
  removeItem: (id: string) => void;
};

const ActionItemsContext = createContext<ActionItemsContextValue | null>(null);

export function ActionItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ActionItem[]>(sampleItems);

  const addItem: ActionItemsContextValue["addItem"] = ({
    title,
    source,
    dueDate,
    notes,
  }) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [
      ...prev,
      {
        id,
        title: trimmed,
        owner: { name: "Brooks Paine", initials: "BP" },
        source,
        dueBy: dueDate || "—",
        dueByFull: dueDate || "",
        notes: notes
          ? notes
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((label) => ({ label }))
          : undefined,
      },
    ]);
  };

  const toggleDone = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    );

  const toggleStar = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, starred: !i.starred } : i)),
    );

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <ActionItemsContext.Provider
      value={{ items, setItems, addItem, toggleDone, toggleStar, removeItem }}
    >
      {children}
    </ActionItemsContext.Provider>
  );
}

export function useActionItems() {
  const ctx = useContext(ActionItemsContext);
  if (!ctx) {
    throw new Error("useActionItems must be used within ActionItemsProvider");
  }
  return ctx;
}

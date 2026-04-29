import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListActionItems,
  useCreateActionItem,
  useUpdateActionItem,
  useDeleteActionItem,
  useImportActionItems,
  getListActionItemsQueryKey,
  type ActionItem as ApiActionItem,
  type CreateActionItemBody,
  type UpdateActionItemBody,
} from "@workspace/api-client-react";
import { useActiveUser } from "@/contexts/active-user-context";

const LEGACY_STORAGE_KEY = "dental-dashboard:action-items:v1";
const MIGRATION_FLAG_KEY = "dental-dashboard:action-items:migrated:v1";

export type ActionItemNote = { label: string; href?: string };

/**
 * Client-facing action item shape. The id is exposed as a string for backward
 * compatibility with components that previously used the local-storage store
 * (where ids were random string tokens). Internally we always carry the
 * numeric server id alongside it on the same object.
 */
export type ActionItem = {
  id: string;
  serverId: number;
  title: string;
  owner: { name: string; initials: string };
  source: string;
  dueBy: string;
  dueByFull: string;
  notes?: ActionItemNote[];
  starred?: boolean;
  done?: boolean;
};

type ActionItemsContextValue = {
  items: ActionItem[];
  isLoading: boolean;
  /**
   * Replace-style updater kept for compatibility with the existing
   * action-items page edit flow. It diffs the new list against the server
   * snapshot and issues update / create / delete calls as needed.
   */
  setItems: (
    updater: ActionItem[] | ((prev: ActionItem[]) => ActionItem[]),
  ) => void;
  addItem: (input: {
    title: string;
    source: string;
    ownerName: string;
    ownerInitials: string;
    dueDate?: string;
    notes?: string;
  }) => void;
  toggleDone: (id: string) => void;
  toggleStar: (id: string) => void;
  removeItem: (id: string) => void;
};

const ActionItemsContext = createContext<ActionItemsContextValue | null>(null);

function notesToString(notes?: ActionItemNote[]): string | null {
  if (!notes || notes.length === 0) return null;
  return JSON.stringify(notes);
}

function fromApi(item: ApiActionItem): ActionItem {
  return {
    id: String(item.id),
    serverId: item.id,
    title: item.title,
    owner: { name: item.ownerName, initials: item.ownerInitials },
    source: item.source,
    dueBy: item.dueBy,
    dueByFull: item.dueByFull,
    notes: item.notes ?? undefined,
    starred: item.starred,
    done: item.done,
  };
}

type LegacyItem = {
  id?: string;
  title?: string;
  owner?: { name?: string; initials?: string };
  source?: string;
  dueBy?: string;
  dueByFull?: string;
  notes?: ActionItemNote[];
  starred?: boolean;
  done?: boolean;
};

function readLegacyItems(fallback: {
  name: string;
  initials: string;
}): CreateActionItemBody[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as LegacyItem[])
      .filter((i) => typeof i?.title === "string" && i.title.trim().length > 0)
      .map((i, idx) => ({
        title: i.title!.trim(),
        source: typeof i.source === "string" ? i.source : "Manual",
        ownerName: i.owner?.name ?? fallback.name,
        ownerInitials: i.owner?.initials ?? fallback.initials,
        dueBy: typeof i.dueBy === "string" ? i.dueBy : "—",
        dueByFull: typeof i.dueByFull === "string" ? i.dueByFull : "",
        notes: i.notes ?? null,
        starred: !!i.starred,
        done: !!i.done,
        position: idx,
      }));
  } catch {
    return [];
  }
}

export function ActionItemsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { activeUser } = useActiveUser();
  const { data, isLoading } = useListActionItems({
    query: { staleTime: 30_000 } as any,
  });

  const createMutation = useCreateActionItem();
  const updateMutation = useUpdateActionItem();
  const deleteMutation = useDeleteActionItem();
  const importMutation = useImportActionItems();

  const items = useMemo<ActionItem[]>(
    () => (data ?? []).map(fromApi),
    [data],
  );

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListActionItemsQueryKey() });
  };

  // One-time migration of any items still living in localStorage.
  const migrationStartedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (migrationStartedRef.current) return;
    if (window.localStorage.getItem(MIGRATION_FLAG_KEY)) return;

    const legacyItems = readLegacyItems({
      name: activeUser.name,
      initials: activeUser.initials,
    });
    if (legacyItems.length === 0) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    // Wait until we have the server snapshot so we can dedupe by title.
    if (isLoading || !data) return;
    migrationStartedRef.current = true;

    const existingTitles = new Set(data.map((i) => i.title));
    const toImport = legacyItems.filter(
      (i) => !existingTitles.has(i.title),
    );

    if (toImport.length === 0) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    importMutation.mutate(
      { data: { items: toImport } },
      {
        onSuccess: () => {
          window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          invalidate();
        },
        onError: () => {
          // Allow another attempt on next mount.
          migrationStartedRef.current = false;
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, data]);

  const addItem: ActionItemsContextValue["addItem"] = ({
    title,
    source,
    ownerName,
    ownerInitials,
    dueDate,
    notes,
  }) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const noteList = notes
      ? notes
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((label) => ({ label }))
      : null;
    const body: CreateActionItemBody = {
      title: trimmed,
      source,
      ownerName,
      ownerInitials,
      dueBy: dueDate || "—",
      dueByFull: dueDate || "",
      notes: noteList,
      position: itemsRef.current.length,
    };
    createMutation.mutate({ data: body }, { onSuccess: invalidate });
  };

  const toggleDone = (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    const body: UpdateActionItemBody = { done: !item.done };
    updateMutation.mutate(
      { id: item.serverId, data: body },
      { onSuccess: invalidate },
    );
  };

  const toggleStar = (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    const body: UpdateActionItemBody = { starred: !item.starred };
    updateMutation.mutate(
      { id: item.serverId, data: body },
      { onSuccess: invalidate },
    );
  };

  const removeItem = (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    deleteMutation.mutate(
      { id: item.serverId },
      { onSuccess: invalidate },
    );
  };

  /**
   * Diff the next list against the current server snapshot and translate the
   * delta into individual create / update / delete API calls. This keeps the
   * existing edit flow on the action-items page working without changes.
   *
   * All mutations are issued in parallel and we only invalidate the list
   * query once every one of them has settled, so the refetch always reflects
   * the post-mutation server state instead of racing it.
   */
  const setItems: ActionItemsContextValue["setItems"] = (updater) => {
    const prev = itemsRef.current;
    const next =
      typeof updater === "function"
        ? (updater as (p: ActionItem[]) => ActionItem[])(prev)
        : updater;

    const prevById = new Map(prev.map((i) => [i.id, i]));
    const nextIds = new Set(next.map((i) => i.id));

    const pending: Promise<unknown>[] = [];

    for (const item of next) {
      const before = prevById.get(item.id);
      if (!before) {
        // New item added via setItems — fall through to create.
        const body: CreateActionItemBody = {
          title: item.title,
          source: item.source,
          ownerName: item.owner.name,
          ownerInitials: item.owner.initials,
          dueBy: item.dueBy,
          dueByFull: item.dueByFull,
          notes: item.notes ?? null,
          starred: !!item.starred,
          done: !!item.done,
          position: next.indexOf(item),
        };
        pending.push(createMutation.mutateAsync({ data: body }));
        continue;
      }
      const patch: UpdateActionItemBody = {};
      if (item.title !== before.title) patch.title = item.title;
      if (item.source !== before.source) patch.source = item.source;
      if (item.dueBy !== before.dueBy) patch.dueBy = item.dueBy;
      if (item.dueByFull !== before.dueByFull) patch.dueByFull = item.dueByFull;
      if (item.owner.name !== before.owner.name) patch.ownerName = item.owner.name;
      if (item.owner.initials !== before.owner.initials)
        patch.ownerInitials = item.owner.initials;
      if (!!item.starred !== !!before.starred) patch.starred = !!item.starred;
      if (!!item.done !== !!before.done) patch.done = !!item.done;
      if (notesToString(item.notes) !== notesToString(before.notes)) {
        patch.notes = item.notes ?? null;
      }
      if (Object.keys(patch).length === 0) continue;
      pending.push(
        updateMutation.mutateAsync({ id: before.serverId, data: patch }),
      );
    }

    for (const before of prev) {
      if (nextIds.has(before.id)) continue;
      pending.push(deleteMutation.mutateAsync({ id: before.serverId }));
    }

    if (pending.length === 0) return;
    void Promise.allSettled(pending).then(invalidate);
  };

  return (
    <ActionItemsContext.Provider
      value={{
        items,
        isLoading,
        setItems,
        addItem,
        toggleDone,
        toggleStar,
        removeItem,
      }}
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

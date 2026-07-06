import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { FocusSnapshot } from "@/pages/ideal-week";

/* Mobile meta row: left-packed (priority | due | owner), no dead space. */
const MOBILE_META_COLS = "max-content max-content 1fr";

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

type ParentType = "life_area" | "direct_report" | "project";
type ProjectStatus = "active" | "on_hold" | "complete";

type Top3Row = {
  id: number;
  businessId: number;
  slot: number;
  period: "day" | "week";
  text: string;
  done: boolean;
  date: string;
  ownerDirectReportId: number | null;
  ownerName: string | null;
  priority: TaskPriority | null;
  dueDate: string | null;
  status: TaskStatus;
  sourceBusinessId: number | null;
};
type DirectReport = {
  id: number;
  name: string;
  sortOrder: number;
  collapsed: boolean;
  hidden?: boolean;
};
type Project = {
  id: number;
  name: string;
  status: ProjectStatus;
  sortOrder: number;
  collapsed: boolean;
};
type LifeArea = {
  id: number;
  name: string;
  accentColor: string;
  sortOrder: number;
  collapsed: boolean;
  identity: string[];
  identityNextSteps: string[];
  why: string[];
  whyNextSteps: string[];
  howIPreserve: string[];
  howIPreserveNextSteps: string[];
  feelsLike: string[];
  feelsLikeNextSteps: string[];
};
type LifeAreaGoal = {
  id: number;
  lifeAreaId: number;
  goalType: string;
  text: string;
  status: string;
  nextSteps: string;
  dueDate: string | null;
  sortOrder: number;
};
type TaskStatus = "not_started" | "in_progress" | "completed";
/* Badge-only priority — null means unset (no badge). Never affects ordering. */
type TaskPriority = "high" | "medium" | "low";
type Task = {
  id: number;
  parentType: ParentType;
  parentId: number;
  sectionId: number | null;
  ownerDirectReportId: number | null;
  ownerName: string | null;
  text: string;
  done: boolean;
  status: TaskStatus;
  priority: TaskPriority | null;
  dueDate: string | null;
  nextSteps: string;
  sortOrder: number;
  keyResultId: number | null;
};
type BrainDumpOutcome =
  | "trash"
  | "reference"
  | "someday"
  | "done_now"
  | "delegated"
  | "project"
  | "today"
  | "backlog";
type BrainDumpEntry = {
  id: number;
  businessId: number;
  text: string;
  outcome: BrainDumpOutcome | null;
  processedAt: string | null;
  routedTaskId: number | null;
  routedTaskType: string | null;
  createdAt: string;
  updatedAt: string;
};
type Business = { id: number; name: string; slug: string; sortOrder: number };
type BrainDumpFilter = "inbox" | "reference" | "someday" | "processed";
type OnDeckTag = "move_the_needle" | "maintenance" | "follow_up";
export type OnDeckItem = {
  id: number;
  businessId: number;
  text: string;
  ownerDirectReportId: number | null;
  ownerName: string | null;
  dueDate: string | null;
  tag: OnDeckTag;
  status: TaskStatus;
  priority: TaskPriority | null;
  sourceTaskId: number | null;
  sourceBusinessId: number | null;
  sortOrder: number;
};
type Overview = {
  top3: Top3Row[];
  weekTop3: Top3Row[];
  onDeck: OnDeckItem[];
  stats: {
    openLifeTasks: number;
    openTeamItems: number;
    openProjectTasks: number;
    brainDumpCount: number;
  };
  snapshot: Array<{
    parentType: ParentType;
    parentId: number;
    parentName: string;
    tasks: Array<{ id: number; text: string }>;
  }>;
};

/* View = the task list (default) plus the non-task workflows kept
   reachable below a divider. */
type ViewId = "list" | "direct-reports" | "projects" | "life-areas" | "brain-dump";

/* ========================================================================== */
/* Design tokens                                                              */
/* ========================================================================== */

const C = {
  bg: "#f8fafc",
  card: "#ffffff",
  cardBorder: "#e2e8f0",
  header: "#0F2A47",
  headerText: "#f8fafc",
  textPrimary: "#0F2A47",
  textSecondary: "#64748b",
  accent: "#D62828",
  accentSoft: "#fdeaea",
  divider: "#e2e8f0",
  statusActive: "#5b8a5a",
  statusHold: "#c8a14a",
  statusComplete: "#9a948c",
  inputFocus: "#94a3b8",
};

const SERIF = 'Inter, -apple-system, system-ui, sans-serif';
const SANS = 'Inter, -apple-system, system-ui, sans-serif';

/* ========================================================================== */
/* API client                                                                 */
/* ========================================================================== */

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

/* ---- business scope (shared across the whole page) -------------------- */
const BUSINESS_STORAGE_KEY = "cc-business";
const BUSINESS_EVENT = "cc-business-changed";
let currentBusinessId = (() => {
  try {
    const raw = localStorage.getItem(BUSINESS_STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
})();
function setCurrentBusinessId(id: number) {
  if (id === currentBusinessId) return;
  currentBusinessId = id;
  try {
    localStorage.setItem(BUSINESS_STORAGE_KEY, String(id));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(BUSINESS_EVENT));
}
function useBusiness(): [number, (id: number) => void] {
  const [id, setId] = useState(currentBusinessId);
  useEffect(() => {
    const handler = () => setId(currentBusinessId);
    window.addEventListener(BUSINESS_EVENT, handler);
    return () => window.removeEventListener(BUSINESS_EVENT, handler);
  }, []);
  return [id, setCurrentBusinessId];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Merge headers explicitly: spreading `...init` after `headers` would let
  // a caller-provided headers object REPLACE the defaults wholesale (losing
  // content-type, so Express never parses the JSON body).
  const { headers: initHeaders, ...rest } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...rest,
    headers: {
      "content-type": "application/json",
      "x-business-id": String(currentBusinessId),
      ...(initHeaders ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ========================================================================== */
/* Main page                                                                  */
/* ========================================================================== */

export function CommandCenter() {
  const [view, setView] = useState<ViewId>(() => {
    try {
      // Only the List view is selectable for now (Kanban comes later);
      // old stored tab/view values all land on the list.
      return "list";
    } catch {
      return "list";
    }
  });
  const [businessId, setBusinessId] = useBusiness();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  useEffect(() => {
    api<Business[]>("/businesses").then(setBusinesses).catch(() => setBusinesses([]));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cc-view", view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100%",
        fontFamily: SANS,
        color: C.textPrimary,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: C.header,
          color: C.headerText,
          padding: "20px 32px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: 28,
              margin: 0,
              letterSpacing: 0.2,
            }}
          >
            Today
          </h1>
          <div style={{ fontSize: 13, opacity: 0.75 }}>{today}</div>
        </div>

        <div style={{ paddingBottom: 18 }} />
      </div>

      {/* Body — keyed by business so all views remount & refetch on switch */}
      <div
        key={businessId}
        style={{ maxWidth: 980, margin: "0 auto", padding: "20px 14px 80px" }}
      >
        {view === "list" ? (
          <CommandTab businesses={businesses} view={view} setView={setView} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ViewControls view={view} setView={setView} />
            {view === "direct-reports" && <DirectReportsTab businesses={businesses} />}
            {view === "projects" && <ProjectsTab businesses={businesses} />}
            {view === "life-areas" && <LifeAreasTab businesses={businesses} />}
            {view === "brain-dump" && <BrainDumpTab businesses={businesses} />}
          </div>
        )}

      </div>
    </div>
  );
}

/* ========================================================================== */
/* Business picker + per-entity chip                                          */
/* ========================================================================== */

function BusinessPicker({
  businesses,
  value,
  onChange,
}: {
  businesses: Business[];
  value: number;
  onChange: (id: number) => void;
}) {
  if (businesses.length === 0) return null;
  return (
    <div
      role="tablist"
      aria-label="Business"
      style={{
        display: "inline-flex",
        background: "rgba(244,241,236,0.08)",
        border: "1px solid rgba(244,241,236,0.18)",
        borderRadius: 8,
        padding: 2,
      }}
    >
      {businesses.map((b) => {
        const active = b.id === value;
        return (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(b.id)}
            style={{
              background: active ? C.headerText : "transparent",
              color: active ? C.header : C.headerText,
              border: "none",
              borderRadius: 6,
              padding: "5px 12px",
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              cursor: "pointer",
              opacity: active ? 1 : 0.75,
            }}
          >
            {b.name}
          </button>
        );
      })}
    </div>
  );
}

function BusinessChip({
  businesses,
  currentId,
  onChange,
}: {
  businesses: Business[];
  currentId: number;
  onChange: (id: number) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const current = businesses.find((b) => b.id === currentId);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Re-assign to another business"
        style={{
          background: "transparent",
          border: `1px solid ${C.cardBorder}`,
          color: C.textSecondary,
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          padding: "2px 8px",
          borderRadius: 10,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {current?.name ?? "—"} ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 20,
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            minWidth: 140,
            padding: 4,
          }}
        >
          {businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setOpen(false);
                if (b.id !== currentId) await onChange(b.id);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: b.id === currentId ? C.accentSoft : "transparent",
                color: b.id === currentId ? C.accent : C.textPrimary,
                border: "none",
                borderRadius: 4,
                padding: "6px 10px",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Overview tab                                                               */
/* ========================================================================== */

/* ---- Command view (default landing) ------------------------------------ */

/* Task enriched by GET /tasks/all with container + business context. */
type AllTask = Task & {
  parentName: string | null;
  businessIds: number[];
  ownerLabel: string | null;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const COMMAND_GRID_COLS = "1fr 96px 96px 110px";

/* The business header each cross-business task action must carry: prefer the
   currently selected business when the task's parent belongs to it, else the
   task's own (first) business. */
function groupBizHeaders(g: CommandGroupData): Record<string, string> {
  const id = g.businessIds.includes(currentBusinessId)
    ? currentBusinessId
    : (g.businessIds[0] ?? currentBusinessId);
  return { "x-business-id": String(id) };
}

function taskBizHeaders(t: AllTask): Record<string, string> {
  const id = t.businessIds.includes(currentBusinessId)
    ? currentBusinessId
    : (t.businessIds[0] ?? currentBusinessId);
  return { "x-business-id": String(id) };
}

/* Business a task resides in — stamped onto Top 3 / On Deck rows when the
   task is pinned, so those rows can badge the task's home business. NULL
   for personal tasks (no business). */
function taskSourceBusinessId(t: AllTask): number | null {
  return t.businessIds.includes(currentBusinessId)
    ? currentBusinessId
    : (t.businessIds[0] ?? null);
}

function sortCommandTasks(list: AllTask[]): AllTask[] {
  return [...list].sort((a, b) => {
    const pa = a.priority ? PRIORITY_RANK[a.priority] : 3;
    const pb = b.priority ? PRIORITY_RANK[b.priority] : 3;
    if (pa !== pb) return pa - pb;
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return a.sortOrder - b.sortOrder || a.id - b.id;
  });
}

/* Container summaries returned by /tasks/all so empty projects/people
   still render (e.g. a just-created Ideas project with no tasks yet). */
type CommandContainer = {
  id: number;
  name: string;
  businessIds: number[];
  sortOrder: number;
};

/* Objectives (OKR-lite) attached to a person or business. */
type ObjKeyResult = {
  id: number;
  objectiveId: number;
  text: string;
  target: number;
  current: number;
  done: boolean;
  sortOrder: number;
  actionItems: Task[];
};
type CommandObjective = {
  id: number;
  parentType: "direct_report" | "business";
  parentId: number;
  businessIds: number[];
  text: string;
  sortOrder: number;
  keyResults: ObjKeyResult[];
};

/* Calendar-quarter pace for objective pills. */
function quarterPaceFrac(now = new Date()): number {
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1).getTime();
  const end = new Date(now.getFullYear(), q * 3 + 3, 1).getTime();
  return Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1);
}

/* Scope pill: everything, a business id, or "personal" (Life Areas). */
type CommandScope = "all" | number | "personal";

type CommandChunk = { sectionId: number | null; sectionName: string | null; tasks: AllTask[] };
type CommandGroupData = {
  key: string;
  label: string;
  chunks: CommandChunk[];
  count: number;
  parentType: ParentType | null;
  parentId: number | null;
  businessIds: number[];
};
type CommandSection = {
  title: string;
  /* Set for business sections — enables the add-person / add-project rows. */
  businessId?: number;
  /* Direct-report groups render inside a collapsible "Direct Reports"
     wrapper; each person collapses individually too. */
  drGroups?: CommandGroupData[];
  groups: CommandGroupData[];
};

function buildScopedSections(
  tasks: AllTask[],
  sections: TaskSection[],
  projects: CommandContainer[],
  directReports: CommandContainer[],
  businesses: Business[],
  scope: CommandScope,
): CommandSection[] {

  /* Chunks come from the parent's OWN section list (not just sections that
     happen to hold tasks) so a freshly created, still-empty section renders
     immediately with its add-task row. */
  const chunksFor = (
    list: AllTask[],
    parentType: ParentType | null,
    parentId: number | null,
  ): CommandChunk[] => {
    const parentSections =
      parentType !== null && parentId !== null
        ? sections
            .filter((sec) => sec.parentType === parentType && sec.parentId === parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        : [];
    const parentSectionIds = new Set(parentSections.map((sec) => sec.id));
    const unsectioned = list.filter(
      (t) => t.sectionId === null || !parentSectionIds.has(t.sectionId),
    );
    const chunks: CommandChunk[] = [];
    if (unsectioned.length > 0) {
      chunks.push({ sectionId: null, sectionName: null, tasks: sortCommandTasks(unsectioned) });
    }
    for (const sec of parentSections) {
      chunks.push({
        sectionId: sec.id,
        sectionName: sec.name,
        tasks: sortCommandTasks(list.filter((t) => t.sectionId === sec.id)),
      });
    }
    return chunks;
  };

  const groupOf = (c: CommandContainer, parentType: "project" | "direct_report") => {
    // A person's group holds their own tasks PLUS tasks anywhere in the app
    // assigned to them as owner (rendered with an origin hint).
    const list =
      parentType === "direct_report"
        ? tasks.filter(
            (t) =>
              t.keyResultId === null &&
              ((t.parentType === "direct_report" && t.parentId === c.id) ||
                (t.ownerDirectReportId === c.id &&
                  !(t.parentType === "direct_report" && t.parentId === c.id))),
          )
        : tasks.filter(
            (t) => t.keyResultId === null && t.parentType === parentType && t.parentId === c.id,
          );
    return {
      key: `${parentType}-${c.id}`,
      label: c.name,
      chunks: chunksFor(list, parentType, c.id),
      count: list.length,
      parentType,
      parentId: c.id,
      businessIds: c.businessIds,
    };
  };
  const bySort = (a: CommandContainer, b: CommandContainer) =>
    a.sortOrder - b.sortOrder || a.id - b.id;

  const lifeAreaGroups = () => {
    const life = tasks.filter((t) => t.parentType === "life_area" && t.keyResultId === null);
    const byArea = new Map<string, AllTask[]>();
    for (const t of life) {
      const label = t.parentName ?? "Untitled";
      const cur = byArea.get(label);
      if (cur) cur.push(t);
      else byArea.set(label, [t]);
    }
    return [...byArea.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, list]) => ({
        key: `life-${label}`,
        label,
        chunks: chunksFor(list, "life_area", list[0]?.parentId ?? null),
        count: list.length,
        parentType: "life_area" as ParentType,
        parentId: list[0]?.parentId ?? null,
        businessIds: list[0]?.businessIds ?? [],
      }));
  };

  if (scope === "personal") {
    // Personal projects (empty businessIds) render as task tables; the full
    // Life Areas planner renders after them (LifeAreasTab in CommandTab).
    const personalProjects = projects
      .filter((p) => p.businessIds.length === 0)
      .sort(bySort)
      .map((p) => groupOf(p, "project"));
    return personalProjects.length > 0
      ? [{ title: "Projects", groups: personalProjects }]
      : [];
  }

  if (scope !== "all") {
    const inBiz = (ids: number[]) => ids.includes(scope);
    return [
      {
        title: "",
        businessId: scope,
        drGroups: directReports.filter((d) => inBiz(d.businessIds)).sort(bySort).map((d) => groupOf(d, "direct_report")),
        groups: [],
      },
      {
        title: "Projects",
        businessId: scope,
        groups: projects.filter((p) => inBiz(p.businessIds)).sort(bySort).map((p) => groupOf(p, "project")),
      },
    ];
  }

  // Scope: All — cross-business items (me + Ideas) on top, then a section
  // per business with its own people and projects, then Personal.
  const result: CommandSection[] = [];
  const crossDRs = directReports.filter((d) => d.businessIds.length > 1).sort(bySort);
  const crossProjects = projects.filter((p) => p.businessIds.length > 1).sort(bySort);
  if (crossDRs.length + crossProjects.length > 0) {
    result.push({
      title: "",
      groups: [
        ...crossDRs.map((d) => groupOf(d, "direct_report")),
        ...crossProjects.map((p) => groupOf(p, "project")),
      ],
    });
  }
  for (const b of [...businesses].sort((x, y) => x.sortOrder - y.sortOrder || x.id - y.id)) {
    const drs = directReports.filter((d) => d.businessIds.length === 1 && d.businessIds[0] === b.id).sort(bySort);
    const projs = projects.filter((p) => p.businessIds.length === 1 && p.businessIds[0] === b.id).sort(bySort);
    result.push({
      title: b.name,
      businessId: b.id,
      drGroups: drs.map((d) => groupOf(d, "direct_report")),
      groups: projs.map((p) => groupOf(p, "project")),
    });
  }
  const personalProjects = projects.filter((p) => p.businessIds.length === 0).sort(bySort).map((p) => groupOf(p, "project"));
  const life = lifeAreaGroups();
  if (personalProjects.length + life.length > 0) {
    result.push({ title: "Personal", groups: [...personalProjects, ...life] });
  }
  return result;
}

function ViewControls({
  view,
  setView,
  children,
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: C.textSecondary,
        }}
      >
        View
      </span>
      <select
        value={view}
        onChange={(e) => setView(e.target.value as ViewId)}
        style={{
          background: C.card,
          color: C.textPrimary,
          border: `1px solid ${C.divider}`,
          borderRadius: 8,
          padding: "6px 10px",
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <option value="list">List</option>
      </select>
      {children}
    </div>
  );
}

function CommandTab({
  businesses,
  view,
  setView,
}: {
  businesses: Business[];
  view: ViewId;
  setView: (v: ViewId) => void;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [tasks, setTasks] = useState<AllTask[] | null>(null);
  const [taskSections, setTaskSections] = useState<TaskSection[]>([]);
  const [containers, setContainers] = useState<{
    projects: CommandContainer[];
    directReports: CommandContainer[];
  }>({ projects: [], directReports: [] });
  const [objectives, setObjectives] = useState<CommandObjective[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<CommandScope>(() => {
    try {
      const raw = localStorage.getItem("cc-scope");
      if (raw === "personal") return "personal";
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : "all";
    } catch {
      return "all";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("cc-scope", String(scope));
    } catch {
      /* ignore */
    }
  }, [scope]);

  const reload = async () => {
    try {
      const [ov, all, objs] = await Promise.all([
        api<Overview>("/command-center/overview"),
        api<{
          tasks: AllTask[];
          sections: TaskSection[];
          projects: CommandContainer[];
          directReports: CommandContainer[];
        }>("/command-center/tasks/all"),
        api<CommandObjective[]>("/command-center/objectives"),
      ]);
      setData(ov);
      setTasks(all.tasks);
      setTaskSections(all.sections);
      setContainers({ projects: all.projects ?? [], directReports: all.directReports ?? [] });
      setObjectives(objs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    reload();
    const onChanged = () => reload();
    window.addEventListener("cc:top3-changed", onChanged);
    return () => window.removeEventListener("cc:top3-changed", onChanged);
  }, []);

  const sectionsById = useMemo(
    () => new Map(taskSections.map((sec) => [sec.id, sec.name])),
    [taskSections],
  );

  const sections = useMemo(
    () =>
      tasks
        ? buildScopedSections(
            tasks,
            taskSections,
            containers.projects,
            containers.directReports,
            businesses,
            scope,
          )
        : [],
    [tasks, taskSections, containers, businesses, scope],
  );

  if (error) return <ErrorBlock message={error} />;
  if (!data || !tasks) return <div style={{ color: C.textSecondary }}>Loading…</div>;

  const pillStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 999,
    border: `1px solid ${active ? C.header : C.divider}`,
    background: active ? C.header : C.card,
    color: active ? "#fff" : C.textSecondary,
    cursor: "pointer",
    fontFamily: SANS,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Focus snapshot — same compact Today / This Week / On Deck board
          as the Ideal Week page (shared component). */}
      <FocusSnapshot
        dayRows={data.top3}
        weekRows={data.weekTop3 ?? []}
        onDeck={data.onDeck ?? []}
        onChange={reload}
      />

      <ViewControls view={view} setView={setView}>
        <span style={{ width: 10 }} />
        <button type="button" onClick={() => setScope("all")} style={pillStyle(scope === "all")}>
          All
        </button>
        {businesses.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setScope(b.id)}
            style={pillStyle(scope === b.id)}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setScope("personal")}
          style={pillStyle(scope === "personal")}
        >
          Personal
        </button>
      </ViewControls>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sections.map((sec, si) => (
          <CommandSectionBlock
            key={sec.title || `top-${si}`}
            section={sec}
            drs={containers.directReports}
            projects={containers.projects}
            sectionsById={sectionsById}
            objectives={objectives}
            onChanged={reload}
          />
        ))}
        {scope === "personal" && <LifeAreasTab businesses={businesses} />}
      </div>
    </div>
  );
}

/* Click-to-edit section name inside a Command group table. */
function SectionHeaderRow({
  chunk,
  group,
  collapsed,
  onToggle,
  onChanged,
}: {
  chunk: CommandChunk;
  group: CommandGroupData;
  collapsed: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState(chunk.sectionName ?? "");
  useEffect(() => setDraft(chunk.sectionName ?? ""), [chunk.sectionName]);

  const commit = async () => {
    setEditing(false);
    const name = draft.trim();
    if (!name || name === chunk.sectionName || chunk.sectionId === null) return;
    await api(`/command-center/task-sections/${chunk.sectionId}`, {
      method: "PATCH",
      headers: groupBizHeaders(group),
      body: JSON.stringify({ name }),
    });
    onChanged();
  };

  const remove = async () => {
    if (chunk.sectionId === null) return;
    if (!window.confirm(`Delete section "${chunk.sectionName}"? Its tasks stay, unsectioned.`)) return;
    await api(`/command-center/task-sections/${chunk.sectionId}`, {
      method: "DELETE",
      headers: groupBizHeaders(group),
    });
    onChanged();
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        background: "#faf7f1",
        borderBottom: `1px solid ${C.divider}`,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.3,
        color: C.textSecondary,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand section" : "Collapse section"}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "0 6px 0 0",
          lineHeight: 1,
        }}
      >
        <Chevron open={!collapsed} />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(chunk.sectionName ?? "");
              setEditing(false);
            }
          }}
          style={{ ...inputStyle, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, flex: 1 }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          title="Click to rename section"
          style={{ cursor: "text", flex: 1, textAlign: "left" }}
        >
          {chunk.sectionName}
        </span>
      )}
      <button
        type="button"
        onClick={() => void remove()}
        aria-label="Delete section"
        title="Delete section (tasks stay, unsectioned)"
        style={{
          background: "transparent",
          border: "none",
          color: C.textSecondary,
          cursor: "pointer",
          fontSize: 13,
          lineHeight: 1,
          padding: "0 2px",
          visibility: hover && !editing ? "visible" : "hidden",
        }}
      >
        ×
      </button>
    </div>
  );
}

/* Persisted collapse state helper (localStorage-backed). */
function useCollapsed(key: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`cc-collapse:${key}`) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(`cc-collapse:${key}`, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };
  return [collapsed, toggle];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        color: "#94a3b8",
        display: "inline-block",
        width: 12,
        transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        transition: "transform 120ms ease",
      }}
    >
      ▼
    </span>
  );
}

/* Resolve which container action items under a BUSINESS objective attach to:
   the business-named project, else its first project. */
function businessTaskParent(
  projects: CommandContainer[],
  section: CommandSection,
): { parentType: ParentType; parentId: number } | null {
  const biz = section.businessId;
  if (biz === undefined) return null;
  const candidates = projects
    .filter((p) => p.businessIds.length === 1 && p.businessIds[0] === biz)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const named = candidates.find((p) => p.name === section.title);
  const pick = named ?? candidates[0];
  return pick ? { parentType: "project", parentId: pick.id } : null;
}

/* Objective cards for one container (person or business), plus the quiet
   "+ Objective" line. */
function ObjectiveCards({
  objectives,
  parentType,
  parentId,
  businessIds,
  taskParent,
  drs,
  onChanged,
}: {
  objectives: CommandObjective[];
  parentType: "direct_report" | "business";
  parentId: number;
  businessIds: number[];
  taskParent: { parentType: ParentType; parentId: number } | null;
  drs: CommandContainer[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const headers = {
    "x-business-id": String(
      businessIds.includes(currentBusinessId) ? currentBusinessId : (businessIds[0] ?? currentBusinessId),
    ),
  };

  const addObjective = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      await api("/command-center/objectives", {
        method: "POST",
        headers,
        body: JSON.stringify({ text, parentType, parentId, businessIds, sortOrder: objectives.length }),
      });
      setDraft("");
      setAdding(false);
      onChanged();
    } catch (e) {
      window.alert(`Couldn't save the objective (${e instanceof Error ? e.message : "error"}).`);
    }
  };

  return (
    <div style={{ marginBottom: objectives.length > 0 || adding ? 12 : 4 }}>
      {objectives.map((o) => (
        <ObjectiveCard key={o.id} objective={o} headers={headers} taskParent={taskParent} drs={drs} onChanged={onChanged} />
      ))}
      {adding ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim()) void addObjective();
            else setAdding(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addObjective();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="Objective (outcome, not activity) — Enter to save"
          style={{ ...inputStyle, fontSize: 13, width: "100%", maxWidth: 480, padding: "6px 2px" }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 500,
            padding: "2px 2px 4px",
            cursor: "pointer",
          }}
        >
          + Objective
        </button>
      )}
    </div>
  );
}

function paceOf(objective: CommandObjective): { label: string; bg: string; fg: string } | null {
  if (objective.keyResults.length === 0) return null;
  const frac =
    objective.keyResults.reduce((sum, k) => sum + Math.min(k.current / Math.max(k.target, 1), 1), 0) /
    objective.keyResults.length;
  if (frac >= 1) return { label: "Completed", bg: "#e4f2e8", fg: "#1f6a3f" };
  const diff = frac - quarterPaceFrac();
  if (diff >= -0.05) return { label: "On pace", bg: "#e4f2e8", fg: "#1f6a3f" };
  if (diff >= -0.3) return { label: "Slightly off pace", bg: "#fdf4d3", fg: "#7a5b00" };
  return { label: "Off pace", bg: "#fdeaea", fg: "#a02020" };
}

function ObjectiveCard({
  objective,
  headers,
  taskParent,
  drs,
  onChanged,
}: {
  objective: CommandObjective;
  headers: Record<string, string>;
  taskParent: { parentType: ParentType; parentId: number } | null;
  drs: CommandContainer[];
  onChanged: () => void;
}) {
  const [collapsed, toggle] = useCollapsed(`obj-${objective.id}`);
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(objective.text);
  const [addingKr, setAddingKr] = useState(false);
  const [krDraft, setKrDraft] = useState("");
  const [krTarget, setKrTarget] = useState("1");
  useEffect(() => setDraft(objective.text), [objective.text]);
  const pace = paceOf(objective);

  const call = async (path: string, method: string, body?: unknown) => {
    try {
      await api(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      onChanged();
    } catch (e) {
      window.alert(`Couldn't save (${e instanceof Error ? e.message : "error"}).`);
    }
  };

  const addKr = async () => {
    const text = krDraft.trim();
    if (!text) return;
    const target = Math.max(1, parseInt(krTarget, 10) || 1);
    await call(`/command-center/objectives/${objective.id}/key-results`, "POST", {
      text,
      target,
      sortOrder: objective.keyResults.length,
    });
    setKrDraft("");
    setKrTarget("1");
    setAddingKr(false);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand objective" : "Collapse objective"}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 0 0", lineHeight: 1 }}
        >
          <Chevron open={!collapsed} />
        </button>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const t = draft.trim();
              if (t && t !== objective.text) void call(`/command-center/objectives/${objective.id}`, "PATCH", { text: t });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setDraft(objective.text);
                setEditing(false);
              }
            }}
            style={{ ...inputStyle, fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0 }}
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            title="Click to edit"
            style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, lineHeight: 1.35, flex: 1, minWidth: 0, cursor: "text" }}
          >
            {objective.text}
          </span>
        )}
        {pace && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 11px",
              borderRadius: 999,
              background: pace.bg,
              color: pace.fg,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {pace.label}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete objective "${objective.text}" and its key results?`)) {
              void call(`/command-center/objectives/${objective.id}`, "DELETE");
            }
          }}
          aria-label="Delete objective"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 15,
            lineHeight: 1,
            padding: "2px 2px 0",
            visibility: hover ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      {!collapsed && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "#94a3b8",
              margin: "14px 0 2px",
            }}
          >
            Key Results
            {!addingKr && (
              <button
                type="button"
                onClick={() => setAddingKr(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8b9bad",
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "none",
                  letterSpacing: 0,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                + New key result
              </button>
            )}
          </div>
          {objective.keyResults.map((k) => (
            <KrRow key={k.id} kr={k} headers={headers} taskParent={taskParent} drs={drs} onChanged={onChanged} />
          ))}
          {addingKr && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0" }}>
              <input
                autoFocus
                type="text"
                value={krDraft}
                onChange={(e) => setKrDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addKr();
                  if (e.key === "Escape") {
                    setKrDraft("");
                    setAddingKr(false);
                  }
                }}
                placeholder="Key result — Enter to save"
                style={{ ...inputStyle, fontSize: 13, flex: 1, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "5px 9px" }}
              />
              <label style={{ fontSize: 11, color: C.textSecondary, display: "flex", alignItems: "center", gap: 5, fontFamily: SANS }}>
                target
                <input
                  type="number"
                  min={1}
                  value={krTarget}
                  onChange={(e) => setKrTarget(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addKr()}
                  style={{ width: 64, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "5px 7px", fontSize: 12, fontFamily: SANS, color: C.textPrimary, outline: "none" }}
                />
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KrRow({
  kr,
  headers,
  taskParent,
  drs,
  onChanged,
}: {
  kr: ObjKeyResult;
  headers: Record<string, string>;
  taskParent: { parentType: ParentType; parentId: number } | null;
  drs: CommandContainer[];
  onChanged: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(kr.text);
  const [editingProg, setEditingProg] = useState(false);
  const [progDraft, setProgDraft] = useState(String(kr.current));
  const [aiOpen, toggleAi] = useCollapsed(`kr-ai-${kr.id}`);
  const [addingAi, setAddingAi] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  useEffect(() => setDraft(kr.text), [kr.text]);
  useEffect(() => setProgDraft(String(kr.current)), [kr.current]);

  const call = async (path: string, method: string, body?: unknown) => {
    try {
      await api(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      onChanged();
    } catch (e) {
      window.alert(`Couldn't save (${e instanceof Error ? e.message : "error"}).`);
    }
  };

  const frac = Math.min(kr.current / Math.max(kr.target, 1), 1);
  const isMilestone = kr.target === 1;
  const progLabel = frac >= 1 ? "Completed" : isMilestone ? "Open" : `${kr.current} of ${kr.target}`;

  const commitProg = () => {
    setEditingProg(false);
    const n = parseInt(progDraft, 10);
    if (Number.isFinite(n) && n !== kr.current) void call(`/command-center/key-results/${kr.id}`, "PATCH", { current: Math.max(0, n) });
  };

  const addAi = async () => {
    const text = aiDraft.trim();
    if (!text || !taskParent) return;
    await call("/command-center/tasks", "POST", {
      parentType: taskParent.parentType,
      parentId: taskParent.parentId,
      sectionId: null,
      text,
      keyResultId: kr.id,
    });
    setAiDraft("");
    setAddingAi(false);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: "8px 0 6px", borderBottom: `1px solid #eef2f7` }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const t = draft.trim();
              if (t && t !== kr.text) void call(`/command-center/key-results/${kr.id}`, "PATCH", { text: t });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setDraft(kr.text);
                setEditing(false);
              }
            }}
            style={{ ...inputStyle, fontSize: 13, flex: 1, minWidth: 0 }}
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            title="Click to edit"
            style={{ fontSize: 13, color: "#334155", flex: 1, minWidth: 0, cursor: "text", fontFamily: SANS }}
          >
            {kr.text}
          </span>
        )}
        <span
          style={{
            width: 160,
            height: 6,
            borderRadius: 3,
            background: "#eef2f7",
            position: "relative",
            flexShrink: 0,
            display: "inline-block",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              borderRadius: 3,
              background: frac >= 1 ? "#1f6a3f" : "#0F2A47",
              width: `${Math.round(frac * 100)}%`,
            }}
          />
        </span>
        {editingProg ? (
          <input
            autoFocus
            type="number"
            min={0}
            value={progDraft}
            onChange={(e) => setProgDraft(e.target.value)}
            onBlur={commitProg}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitProg();
              if (e.key === "Escape") setEditingProg(false);
            }}
            style={{ width: 64, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "3px 6px", fontSize: 12, fontFamily: SANS, color: C.textPrimary, outline: "none", flexShrink: 0 }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isMilestone) void call(`/command-center/key-results/${kr.id}`, "PATCH", { done: !kr.done });
              else setEditingProg(true);
            }}
            title={isMilestone ? "Click to toggle" : "Click to update progress"}
            style={{
              width: 72,
              textAlign: "right",
              fontSize: 12,
              color: frac >= 1 ? "#1f6a3f" : C.textSecondary,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: SANS,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
              padding: 0,
            }}
          >
            {progLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => void call(`/command-center/key-results/${kr.id}`, "DELETE")}
          aria-label="Delete key result"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1,
            padding: "0 2px",
            visibility: hover ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={toggleAi}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: SANS,
          fontSize: 11.5,
          fontWeight: 600,
          color: C.textSecondary,
          margin: "6px 0 0 4px",
          padding: 0,
        }}
      >
        <Chevron open={aiOpen} />
        Action Items ({kr.actionItems.length})
      </button>
      {aiOpen && (
        <div style={{ background: "#f8fafc", borderRadius: 8, margin: "7px 0 3px 4px", padding: "2px 12px" }}>
          {kr.actionItems.map((t) => (
            <KrActionItemRow key={t.id} task={t} drs={drs} headers={headers} onChanged={onChanged} />
          ))}
          {addingAi ? (
            <input
              autoFocus
              type="text"
              value={aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              onBlur={() => {
                if (aiDraft.trim()) void addAi();
                else setAddingAi(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addAi();
                if (e.key === "Escape") {
                  setAiDraft("");
                  setAddingAi(false);
                }
              }}
              placeholder="Action item — Enter to save"
              style={{ ...inputStyle, fontSize: 13, width: "100%", padding: "7px 0" }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingAi(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "#8b9bad",
                fontFamily: SANS,
                fontSize: 11.5,
                cursor: "pointer",
                padding: "6px 0 8px",
              }}
            >
              + New action item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function KrActionItemRow({
  task,
  drs,
  headers,
  onChanged,
}: {
  task: Task;
  drs: CommandContainer[];
  headers: Record<string, string>;
  onChanged: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [text, setText] = useState(task.text);
  useEffect(() => setText(task.text), [task.text]);
  const owner =
    task.ownerDirectReportId != null
      ? (drs.find((d) => d.id === task.ownerDirectReportId)?.name ?? null)
      : task.ownerName;
  const dueInfo = formatDueDate(task.dueDate, task.done);

  const patch = async (body: Record<string, unknown>) => {
    await api(`/command-center/tasks/${task.id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
    onChanged();
  };
  const del = async () => {
    await api(`/command-center/tasks/${task.id}`, { method: "DELETE", headers });
    onChanged();
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid #eef2f7`, fontSize: 13.5 }}
    >
      <AsanaCheck done={task.done} onToggle={() => void patch({ done: !task.done })} />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== task.text && text.trim() && void patch({ text: text.trim() })}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        style={{
          ...inputStyle,
          fontSize: 13.5,
          flex: 1,
          minWidth: 0,
          textDecoration: task.done ? "line-through" : "none",
          color: task.done ? C.textSecondary : C.textPrimary,
        }}
      />
      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, whiteSpace: "nowrap", fontFamily: SANS }}>
        {owner && <b style={{ color: C.textSecondary, fontWeight: 600 }}>{owner}</b>}
        {dueInfo.label && (
          <>
            {" "}
            DUE: <b style={{ color: dueInfo.tone === "overdue" ? "#b1361e" : "#7a5b00", fontWeight: 600 }}>{dueInfo.label}</b>
          </>
        )}
      </span>
      <DueDateField
        value={task.dueDate}
        tone={dueInfo.tone}
        label=""
        onChange={(next) => void patch({ dueDate: next })}
      />
      <button
        type="button"
        onClick={() => void del()}
        aria-label="Delete action item"
        style={{
          background: "transparent",
          border: "none",
          color: C.textSecondary,
          cursor: "pointer",
          fontSize: 13,
          lineHeight: 1,
          padding: "0 2px",
          visibility: hover ? "visible" : "hidden",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

/* Inline "+ Add person" / "+ Add project" for a business section. */
function AddContainerRow({
  label,
  endpoint,
  businessId,
  onChanged,
}: {
  label: string;
  endpoint: "/command-center/direct-reports" | "/command-center/projects";
  businessId: number;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const busyRef = useRef(false);

  const save = async () => {
    const name = draft.trim();
    if (!name || busyRef.current) return;
    busyRef.current = true;
    try {
      await api(endpoint, {
        method: "POST",
        headers: { "x-business-id": String(businessId) },
        body: JSON.stringify({ name }),
      });
      setDraft("");
      setAdding(false);
      onChanged();
    } catch (e) {
      window.alert(
        `Couldn't save (${e instanceof Error ? e.message : "unknown error"}). Please try again.`,
      );
    } finally {
      busyRef.current = false;
    }
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        style={{
          background: "transparent",
          border: "none",
          color: "#94a3b8",
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 500,
          padding: "4px 2px 14px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        + {label}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px 14px" }}>
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) void save();
          else setAdding(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") {
            setDraft("");
            setAdding(false);
          }
        }}
        placeholder={`${label} name — Enter to save`}
        style={{ ...inputStyle, fontSize: 13, maxWidth: 320 }}
      />
    </div>
  );
}

/* A top-level section (a business, Personal, or the untitled cross-
   business strip). Titled sections collapse as a whole. */
function CommandSectionBlock({
  section,
  drs,
  projects,
  sectionsById,
  objectives,
  onChanged,
}: {
  section: CommandSection;
  drs: CommandContainer[];
  projects: CommandContainer[];
  sectionsById: Map<number, string>;
  objectives: CommandObjective[];
  onChanged: () => void;
}) {
  const [collapsed, toggle] = useCollapsed(`biz-${section.title || "__top"}`);
  const hidden = Boolean(section.title) && collapsed;
  return (
    <div>
      {section.title && (
        <button
          type="button"
          onClick={toggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${C.divider}`,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: SERIF,
            fontSize: 18,
            fontWeight: 600,
            color: C.textPrimary,
            padding: "8px 2px 10px",
            marginBottom: hidden ? 4 : 12,
          }}
        >
          <Chevron open={!hidden} />
          {section.title}
        </button>
      )}
      {!hidden && (
        <>
          {section.businessId !== undefined && (
            <ObjectiveCards
              objectives={objectives.filter(
                (o) => o.parentType === "business" && o.parentId === section.businessId,
              )}
              parentType="business"
              parentId={section.businessId}
              businessIds={[section.businessId]}
              taskParent={businessTaskParent(projects, section)}
              drs={drs}
              onChanged={onChanged}
            />
          )}
          {section.drGroups && section.drGroups.length > 0 && (
            <DirectReportsCluster
              clusterKey={section.title || "scoped"}
              groups={section.drGroups}
              drs={drs}
              sectionsById={sectionsById}
              objectives={objectives}
              onChanged={onChanged}
            />
          )}
          {section.businessId !== undefined && section.drGroups && (
            <AddContainerRow
              label="Add person"
              endpoint="/command-center/direct-reports"
              businessId={section.businessId}
              onChanged={onChanged}
            />
          )}
          {(section.drGroups?.length ?? 0) === 0 && section.groups.length === 0 && (
            <div style={{ color: C.textSecondary, fontSize: 13, padding: "4px 2px 16px" }}>
              No open tasks.
            </div>
          )}
          {section.groups.map((g) => (
            <CommandGroup
              key={g.key}
              group={g}
              hideLabel={g.label === section.title}
              drs={drs}
              sectionsById={sectionsById}
              onChanged={onChanged}
            />
          ))}
          {section.businessId !== undefined && !section.drGroups && (
            <AddContainerRow
              label="Add project"
              endpoint="/command-center/projects"
              businessId={section.businessId}
              onChanged={onChanged}
            />
          )}
          {section.businessId !== undefined && section.drGroups && section.groups.length > 0 && (
            <AddContainerRow
              label="Add project"
              endpoint="/command-center/projects"
              businessId={section.businessId}
              onChanged={onChanged}
            />
          )}
        </>
      )}
    </div>
  );
}

/* All of a business's people under one collapsible "Direct Reports"
   sub-heading; each person collapses individually inside it. */
function DirectReportsCluster({
  clusterKey,
  groups,
  drs,
  sectionsById,
  objectives,
  onChanged,
}: {
  clusterKey: string;
  groups: CommandGroupData[];
  drs: CommandContainer[];
  sectionsById: Map<number, string>;
  objectives: CommandObjective[];
  onChanged: () => void;
}) {
  const [collapsed, toggle] = useCollapsed(`drs-${clusterKey}`);
  return (
    <div style={{ marginBottom: 18 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: SANS,
          fontSize: 16,
          fontWeight: 600,
          color: C.textPrimary,
          padding: "4px 2px 8px",
        }}
      >
        <Chevron open={!collapsed} />
        Direct Reports
      </button>
      {!collapsed && (
        <div style={{ paddingLeft: 4 }}>
          {groups.map((g) => (
            <CommandGroup
              key={g.key}
              group={g}
              drs={drs}
              sectionsById={sectionsById}
              objectives={objectives}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommandGroup({
  group,
  hideLabel = false,
  drs,
  sectionsById,
  objectives = [],
  onChanged,
}: {
  group: CommandGroupData;
  hideLabel?: boolean;
  drs: CommandContainer[];
  sectionsById: Map<number, string>;
  objectives?: CommandObjective[];
  onChanged: () => void;
}) {
  const isMobile = useIsMobile();
  const [collapsed, toggle] = useCollapsed(`g-${group.key}`);
  const isDr = group.parentType === "direct_report" && group.parentId !== null;
  const drObjectives = isDr
    ? objectives.filter((o) => o.parentType === "direct_report" && o.parentId === group.parentId)
    : [];
  const objectiveCards = isDr && (
    <ObjectiveCards
      objectives={drObjectives}
      parentType="direct_report"
      parentId={group.parentId!}
      businessIds={group.businessIds}
      taskParent={{ parentType: "direct_report", parentId: group.parentId! }}
      drs={drs}
      onChanged={onChanged}
    />
  );
  if (hideLabel) {
    return (
      <div style={{ marginBottom: 18 }}>
        {objectiveCards}
        <CommandGroupTable group={group} isMobile={isMobile} drs={drs} sectionsById={sectionsById} onChanged={onChanged} />
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 18 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: SANS,
          fontSize: 16,
          fontWeight: 600,
          color: C.textPrimary,
          padding: "4px 2px 8px",
        }}
      >
        <Chevron open={!collapsed} />
        {group.label}
      </button>
      {!collapsed && (
        <>
          {objectiveCards}
          <CommandGroupTable group={group} isMobile={isMobile} drs={drs} sectionsById={sectionsById} onChanged={onChanged} />
        </>
      )}
    </div>
  );
}

function CommandGroupTable({
  group,
  isMobile,
  drs,
  sectionsById,
  onChanged,
}: {
  group: CommandGroupData;
  isMobile: boolean;
  drs: CommandContainer[];
  sectionsById: Map<number, string>;
  onChanged: () => void;
}) {
  return (
    <div>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.divider}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {!isMobile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COMMAND_GRID_COLS,
              background: "#faf7f1",
              borderBottom: `1px solid ${C.divider}`,
              fontSize: 11,
              fontWeight: 600,
              color: C.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <div style={{ padding: "7px 12px", borderRight: `1px solid ${C.divider}` }}>
              Action Item
            </div>
            <div style={{ padding: "7px 12px", textAlign: "center", borderRight: `1px solid ${C.divider}` }}>
              Priority
            </div>
            <div style={{ padding: "7px 12px", textAlign: "center", borderRight: `1px solid ${C.divider}` }}>
              Due
            </div>
            <div style={{ padding: "7px 12px", textAlign: "center" }}>Owner</div>
          </div>
        )}
        {group.chunks.length === 0 && (
          <AddTaskRow group={group} sectionId={null} onChanged={onChanged} />
        )}
        {group.chunks.map((chunk, ci) => (
          <SectionChunk
            key={chunk.sectionId ?? `__none-${ci}`}
            chunk={chunk}
            group={group}
            isMobile={isMobile}
            drs={drs}
            sectionsById={sectionsById}
            onChanged={onChanged}
          />
        ))}
        {(group.parentType === "project" || group.parentType === "direct_report") && (
          <AddSectionRow group={group} onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}

/* "+ Add task" row at the bottom of a section cluster (or empty group). */
function AddTaskRow({
  group,
  sectionId,
  onChanged,
}: {
  group: CommandGroupData;
  sectionId: number | null;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const busyRef = useRef(false);

  const save = async () => {
    const text = draft.trim();
    if (!text || group.parentType === null || group.parentId === null) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await api("/command-center/tasks", {
        method: "POST",
        headers: groupBizHeaders(group),
        body: JSON.stringify({
          parentType: group.parentType,
          parentId: group.parentId,
          sectionId,
          text,
        }),
      });
      setDraft("");
      setAdding(false);
      onChanged();
    } catch (e) {
      window.alert(
        `Couldn't save the task (${e instanceof Error ? e.message : "unknown error"}). Please try again.`,
      );
    } finally {
      busyRef.current = false;
    }
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          color: C.textSecondary,
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 500,
          padding: "6px 12px",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          borderBottom: `1px solid ${C.divider}`,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add action item
      </button>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 12px",
        borderBottom: `1px solid ${C.divider}`,
      }}
    >
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) void save();
          else setAdding(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") {
            setDraft("");
            setAdding(false);
          }
        }}
        placeholder="Action item — Enter to save"
        style={{ ...inputStyle, fontSize: 14, flex: 1 }}
      />
    </div>
  );
}

/* "+ Section" affordance at the bottom of a project/person table. */
function AddSectionRow({
  group,
  onChanged,
}: {
  group: CommandGroupData;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const busyRef = useRef(false);
  const save = async () => {
    const name = draft.trim();
    if (!name || group.parentType === null || group.parentId === null) return;
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await api("/command-center/task-sections", {
        method: "POST",
        headers: groupBizHeaders(group),
        body: JSON.stringify({
          parentType: group.parentType,
          parentId: group.parentId,
          name,
          sortOrder: group.chunks.length,
        }),
      });
      setDraft("");
      setAdding(false);
      onChanged();
    } catch (e) {
      window.alert(
        `Couldn't save the section (${e instanceof Error ? e.message : "unknown error"}). Please try again.`,
      );
    } finally {
      busyRef.current = false;
    }
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        style={{
          background: "transparent",
          border: "none",
          color: "#94a3b8",
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 500,
          padding: "6px 12px",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        + Section
      </button>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px" }}>
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) void save();
          else setAdding(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") {
            setDraft("");
            setAdding(false);
          }
        }}
        placeholder="Section name — Enter to save"
        style={{ ...inputStyle, fontSize: 12, flex: 1 }}
      />
    </div>
  );
}

/* One section cluster inside a group table: header (collapsible), its
   tasks, and the add-task row. Unsectioned clusters have no header and
   never collapse. */
function SectionChunk({
  chunk,
  group,
  isMobile,
  drs,
  sectionsById,
  onChanged,
}: {
  chunk: CommandChunk;
  group: CommandGroupData;
  isMobile: boolean;
  drs: CommandContainer[];
  sectionsById: Map<number, string>;
  onChanged: () => void;
}) {
  const [collapsed, toggle] = useCollapsed(`sec-${chunk.sectionId ?? `u-${group.key}`}`);
  const isCollapsible = chunk.sectionName !== null;
  const hidden = isCollapsible && collapsed;
  return (
    <Fragment>
      {chunk.sectionName && (
        <SectionHeaderRow
          chunk={chunk}
          group={group}
          collapsed={collapsed}
          onToggle={toggle}
          onChanged={onChanged}
        />
      )}
      {!hidden &&
        chunk.tasks.map((t) => (
          <CommandRow
            key={t.id}
            task={t}
            isMobile={isMobile}
            drs={drs}
            originLabel={
              t.parentType === group.parentType && t.parentId === group.parentId
                ? null
                : (t.sectionId !== null ? sectionsById.get(t.sectionId) : null) ??
                  t.parentName
            }
            onChanged={onChanged}
          />
        ))}
      {!hidden && (
        <AddTaskRow group={group} sectionId={chunk.sectionId} onChanged={onChanged} />
      )}
    </Fragment>
  );
}

function CommandRow({
  task,
  isMobile,
  drs,
  originLabel = null,
  onChanged,
}: {
  task: AllTask;
  isMobile: boolean;
  drs: CommandContainer[];
  originLabel?: string | null;
  onChanged: () => void;
}) {
  const [text, setText] = useState(task.text);
  const [hover, setHover] = useState(false);
  useEffect(() => setText(task.text), [task.text]);
  const dueInfo = formatDueDate(task.dueDate, task.done);

  // Mobile text is a wrapping auto-grow textarea (inputs can't wrap, which
  // truncated every task name on phones).
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [text, isMobile]);

  // Mirror span measures the rendered text so the origin hint can sit
  // immediately after the last word (ch-units overshoot in proportional fonts).
  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);
  useEffect(() => {
    if (originLabel && mirrorRef.current) {
      setTextWidth(mirrorRef.current.offsetWidth);
    }
  }, [text, originLabel]);

  // Owner choices: people sharing a business with the task (personal tasks
  // can go to anyone). Shape adapted to OwnerPicker's DirectReport prop.
  const ownerOptions = (
    task.businessIds.length === 0
      ? drs
      : drs.filter((d) => d.businessIds.some((b) => task.businessIds.includes(b)))
  ).map((d) => ({ id: d.id, name: d.name, sortOrder: d.sortOrder, collapsed: false }));

  const patch = async (body: Record<string, unknown>) => {
    await api(`/command-center/tasks/${task.id}`, {
      method: "PATCH",
      headers: taskBizHeaders(task),
      body: JSON.stringify(body),
    });
    onChanged();
  };
  const del = async () => {
    await api(`/command-center/tasks/${task.id}`, {
      method: "DELETE",
      headers: taskBizHeaders(task),
    });
    onChanged();
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? MOBILE_META_COLS : COMMAND_GRID_COLS,
        columnGap: isMobile ? 16 : 0,
        alignItems: "stretch",
        borderBottom: `1px solid ${C.divider}`,
        background: hover ? "#f8fafc" : "transparent",
      }}
    >
      <div
        style={{
          gridColumn: isMobile ? "1 / -1" : "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
          borderBottom: isMobile ? `1px solid ${C.divider}` : "none",
          minWidth: 0,
        }}
      >
        <AsanaCheck done={task.done} onToggle={() => patch({ done: !task.done })} />
        {isMobile ? (
          <textarea
            ref={taRef}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => text !== task.text && text.trim() && patch({ text: text.trim() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLTextAreaElement).blur();
              }
            }}
            style={{
              ...inputStyle,
              fontSize: 14,
              flex: 1,
              minWidth: 0,
              resize: "none",
              overflow: "hidden",
              lineHeight: 1.4,
              fontFamily: SANS,
            }}
          />
        ) : (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => text !== task.text && text.trim() && patch({ text: text.trim() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            }}
            style={
              originLabel
                ? {
                    ...inputStyle,
                    fontSize: 14,
                    flex: "0 1 auto",
                    width: textWidth !== null ? textWidth + 10 : `${Math.max(text.length + 2, 10)}ch`,
                    maxWidth: "70%",
                    minWidth: 60,
                  }
                : { ...inputStyle, fontSize: 14, flex: 1, minWidth: 0 }
            }
          />
        )}
        {originLabel && !isMobile && (
          <span
            ref={mirrorRef}
            aria-hidden
            style={{
              position: "absolute",
              visibility: "hidden",
              whiteSpace: "pre",
              fontFamily: SANS,
              fontSize: 14,
              padding: 0,
            }}
          >
            {text}
          </span>
        )}
        {originLabel && !isMobile && (
          <span
            title={`Lives in: ${originLabel}`}
            style={{
              fontSize: 11,
              fontFamily: SANS,
              color: "#b0bdcb",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {originLabel}
          </span>
        )}
        {originLabel && !isMobile && <span style={{ flex: 1 }} />}
        <SendToOnDeck task={task} sourceBusinessId={taskSourceBusinessId(task)} visible={hover} />
        <PinStar taskText={task.text} sourceBusinessId={taskSourceBusinessId(task)} visible={hover} />
        <button
          type="button"
          onClick={() => void del()}
          aria-label="Delete task"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 6px",
            visibility: hover ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: isMobile ? "2px 8px 6px" : "6px 8px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <PriorityFlag priority={task.priority} onChange={(next) => patch({ priority: next })} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: isMobile ? "2px 8px 6px" : "6px 8px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <DueDateField
          value={task.dueDate}
          tone={dueInfo.tone}
          label={dueInfo.label}
          onChange={(next) => patch({ dueDate: next })}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: isMobile ? "2px 8px 6px" : "6px 8px",
          fontSize: 13,
          color: C.textSecondary,
        }}
      >
        <OwnerPicker
          directReportId={task.ownerDirectReportId}
          ownerName={task.ownerName}
          options={ownerOptions}
          onChange={(next) => {
            // Header must name a business shared by the task AND the new
            // owner, or the API's cross-business guard rejects the change.
            let headers = taskBizHeaders(task);
            if (next.directReportId != null) {
              const owner = drs.find((d) => d.id === next.directReportId);
              const shared =
                task.businessIds.length === 0
                  ? (owner?.businessIds ?? [])
                  : task.businessIds.filter((b) => owner?.businessIds.includes(b));
              if (shared.length > 0) {
                headers = {
                  "x-business-id": String(
                    shared.includes(currentBusinessId) ? currentBusinessId : shared[0],
                  ),
                };
              }
            }
            void api(`/command-center/tasks/${task.id}`, {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                ownerDirectReportId: next.directReportId,
                ownerName: next.ownerName,
              }),
            }).then(onChanged);
          }}
        />
      </div>
    </div>
  );
}

/* Fetches the businesses list once so rows can label themselves with the
   business they live in (EDGE, Urgent Dental, …) — same muted origin hint
   as the Action Items tables. */
export function useBusinessName() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  useEffect(() => {
    let cancelled = false;
    api<Business[]>("/businesses")
      .then((b) => {
        if (!cancelled) setBusinesses(b);
      })
      .catch(() => {
        /* rows just render without a business tag */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return useCallback(
    (id: number) => businesses.find((b) => b.id === id)?.name ?? null,
    [businesses],
  );
}

/* Mirror span + muted business tag, so the tag hugs the exact end of the
   editable task text — the same pattern CommandRow uses for origin hints. */
function OriginHint({
  label,
  text,
  mirrorRef,
}: {
  label: string;
  text: string;
  mirrorRef: { current: HTMLSpanElement | null };
}) {
  return (
    <>
      <span
        ref={mirrorRef}
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre",
          fontFamily: SANS,
          fontSize: 14,
          padding: 0,
        }}
      >
        {text}
      </span>
      <span
        title={`Lives in: ${label}`}
        style={{
          fontSize: 11,
          fontFamily: SANS,
          color: "#b0bdcb",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1 }} />
    </>
  );
}

export function Top3Card({
  title,
  period,
  top3,
  onChange,
}: {
  title: string;
  period: "day" | "week";
  top3: Top3Row[];
  onChange: () => void;
}) {
  const isMobile = useIsMobile();
  const businessName = useBusinessName();
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  useEffect(() => {
    let cancelled = false;
    api<DirectReport[]>("/command-center/direct-reports")
      .then((dr) => {
        if (!cancelled) setDirectReports(dr);
      })
      .catch(() => {
        /* owner picker just stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slots = [1, 2, 3].map((slot) => top3.find((r) => r.slot === slot) ?? null);

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          background: "#faf7f1",
          borderBottom: `1px solid ${C.divider}`,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.3,
          color: C.textSecondary,
        }}
      >
        {title}
      </div>
      {!isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: period === "day" ? TOP3_DAY_GRID_COLS : ON_DECK_GRID_COLS,
            background: "#faf7f1",
            borderBottom: `1px solid ${C.divider}`,
            fontSize: 11,
            fontWeight: 600,
            color: C.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <div style={{ padding: "7px 12px", borderRight: `1px solid ${C.divider}` }}>
            Action Item
          </div>
          <div style={{ padding: "7px 12px", textAlign: "center", borderRight: `1px solid ${C.divider}` }}>
            Owner
          </div>
          <div style={{ padding: "7px 12px", textAlign: "center", borderRight: `1px solid ${C.divider}` }}>
            Priority
          </div>
          {period === "week" && (
            <div style={{ padding: "7px 12px", textAlign: "center", borderRight: `1px solid ${C.divider}` }}>
              Due
            </div>
          )}
          <div style={{ padding: "7px 12px", textAlign: "center" }}>Status</div>
        </div>
      )}
      {slots.map((row, idx) => (
        <Top3Row
          key={idx}
          slot={idx + 1}
          period={period}
          row={row}
          isMobile={isMobile}
          directReports={directReports}
          originLabel={row ? businessName(row.sourceBusinessId ?? row.businessId) : null}
          placeholder={
            period === "day"
              ? "What is the highest leverage use of my time today?"
              : "What is the highest leverage use of my time this week?"
          }
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function Top3Row({
  slot,
  period,
  row,
  isMobile,
  directReports,
  originLabel = null,
  placeholder,
  onChange,
}: {
  slot: number;
  period: "day" | "week";
  row: Top3Row | null;
  isMobile: boolean;
  directReports: DirectReport[];
  originLabel?: string | null;
  placeholder: string;
  onChange: () => void;
}) {
  const initial = row?.text ?? "";
  const done = row?.done ?? false;
  const [value, setValue] = useState(initial);
  const [hover, setHover] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  const hasText = value.trim().length > 0;
  const showOrigin = Boolean(originLabel) && hasText;
  const dueInfo = formatDueDate(row?.dueDate ?? null, done);

  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);
  useEffect(() => {
    if (showOrigin && mirrorRef.current) {
      setTextWidth(mirrorRef.current.offsetWidth);
    }
  }, [value, showOrigin]);

  const put = async (body: Record<string, unknown>) => {
    await api(`/command-center/top3/${period}/${slot}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    window.dispatchEvent(new CustomEvent("cc:top3-changed"));
    onChange();
  };

  const cell: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "flex-start" : "center",
    padding: "6px 8px",
    borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? MOBILE_META_COLS
          : period === "day"
            ? TOP3_DAY_GRID_COLS
            : ON_DECK_GRID_COLS,
        alignItems: "stretch",
        borderBottom: `1px solid ${C.divider}`,
        background: hover ? "#f8fafc" : "transparent",
      }}
    >
      <div
        style={{
          gridColumn: isMobile ? "1 / -1" : "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
          borderBottom: isMobile ? `1px solid ${C.divider}` : "none",
          minWidth: 0,
        }}
      >
        <AsanaCheck done={done} onToggle={() => hasText && void put({ done: !done })} />
        <input
          type="text"
          className="cc-placeholder-light"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value !== initial && void put({ text: value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          }}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            fontSize: 14,
            textDecoration: done ? "line-through" : "none",
            color: done ? C.textSecondary : C.textPrimary,
            ...(showOrigin
              ? {
                  flex: "0 1 auto" as const,
                  width:
                    textWidth !== null
                      ? textWidth + 10
                      : `${Math.max(value.length + 2, 10)}ch`,
                  maxWidth: "70%",
                  minWidth: 60,
                }
              : { flex: 1, minWidth: 0 }),
          }}
        />
        {showOrigin && originLabel && (
          <OriginHint label={originLabel} text={value} mirrorRef={mirrorRef} />
        )}
        <button
          type="button"
          onClick={() =>
            hasText &&
            void put({
              text: "",
              done: false,
              ownerDirectReportId: null,
              ownerName: null,
              priority: null,
              dueDate: null,
              status: "not_started",
            })
          }
          aria-label="Clear slot"
          title="Clear this Top 3 slot"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 6px",
            visibility: hover && hasText ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <div style={cell}>
        <OwnerPicker
          directReportId={row?.ownerDirectReportId ?? null}
          ownerName={row?.ownerName ?? null}
          options={directReports}
          onChange={(next) =>
            void put({
              ownerDirectReportId: next.directReportId,
              ownerName: next.ownerName,
            })
          }
        />
      </div>
      <div style={cell}>
        <PriorityFlag
          priority={row?.priority ?? null}
          onChange={(next) => void put({ priority: next })}
        />
      </div>
      {period === "week" && (
        <div style={cell}>
          <DueDateField
            value={row?.dueDate ?? null}
            tone={dueInfo.tone}
            label={dueInfo.label}
            onChange={(next) => void put({ dueDate: next })}
          />
        </div>
      )}
      <div style={{ ...cell, borderRight: "none" }}>
        <StatusPill
          status={row?.status ?? "not_started"}
          onChange={(next) => void put({ status: next })}
        />
      </div>
    </div>
  );
}

const ON_DECK_CAP = 7;

/* Turn an api() error (its message begins with the HTTP status) into an
   accurate, human message instead of always blaming the 7-item cap. */
function onDeckAddErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg.startsWith("409"))
    return `On Deck is full (max ${ON_DECK_CAP} — this week's shortlist). Remove an item before adding another.`;
  if (msg.startsWith("403"))
    return "Couldn't add — this task's owner isn't part of the current business.";
  if (msg.startsWith("400"))
    return "Couldn't add that task to On Deck — its data looks invalid.";
  // api() throws "<status> <statusText>" for HTTP errors; fetch() rejects with
  // a TypeError (no leading status) on network/timeout failures. Surface the
  // real status so a recurring failure is diagnosable instead of a blind retry.
  const code = msg.match(/^(\d{3})/)?.[1];
  if (!code)
    return "Couldn't reach the server to add to On Deck. Check your connection and try again.";
  return `Couldn't add to On Deck (server error ${code}). Please try again in a moment.`;
}

export function OnDeckCard({
  items,
  onChange,
}: {
  items: OnDeckItem[];
  onChange: () => void;
}) {
  const isMobile = useIsMobile();
  const businessName = useBusinessName();
  const [adding, setAdding] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);

  useEffect(() => {
    let cancelled = false;
    api<DirectReport[]>("/command-center/direct-reports")
      .then((dr) => {
        if (!cancelled) setDirectReports(dr);
      })
      .catch(() => {
        /* ignore — owner picker just stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const atCap = items.length >= ON_DECK_CAP;

  const remove = async (id: number) => {
    await api(`/command-center/on-deck/${id}`, { method: "DELETE" });
    onChange();
  };

  const patch = async (id: number, body: Partial<OnDeckItem>) => {
    await api(`/command-center/on-deck/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    onChange();
  };

  const submitQuick = async () => {
    const t = quickText.trim();
    if (!t) return;
    if (atCap) {
      window.alert(
        `On Deck is full (${items.length}/${ON_DECK_CAP} — this week's shortlist). Remove an item before adding another.`,
      );
      return;
    }
    try {
      await api("/command-center/on-deck", {
        method: "POST",
        body: JSON.stringify({ text: t }),
      });
      setQuickText("");
      setAdding(false);
      onChange();
    } catch (e) {
      window.alert(onDeckAddErrorMessage(e));
    }
  };

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          background: "#faf7f1",
          borderBottom: `1px solid ${C.divider}`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.3,
          color: C.textSecondary,
        }}
      >
        <span>On Deck</span>
        <span style={{ fontWeight: 400, fontSize: 12, color: "#94a3b8" }}>
          {items.length}/{ON_DECK_CAP} · this week's shortlist
        </span>
      </div>

      <div
        style={{
          border: `1px solid ${C.divider}`,
          borderRadius: 6,
          overflowX: isMobile ? "visible" : "auto",
          background: C.card,
        }}
      >
        <div style={{ minWidth: isMobile ? 0 : 560 }}>
          {!isMobile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: ON_DECK_GRID_COLS,
              background: "#faf7f1",
              borderBottom: `1px solid ${C.divider}`,
              fontSize: 11,
              fontWeight: 600,
              color: C.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <div style={{ padding: "7px 12px", borderRight: `1px solid ${C.divider}` }}>
              Task name
            </div>
            <div
              style={{
                padding: "7px 12px",
                textAlign: "center",
                borderRight: `1px solid ${C.divider}`,
              }}
            >
              Owner
            </div>
            <div
              style={{
                padding: "7px 12px",
                textAlign: "center",
                borderRight: `1px solid ${C.divider}`,
              }}
            >
              Priority
            </div>
            <div
              style={{
                padding: "7px 12px",
                textAlign: "center",
                borderRight: `1px solid ${C.divider}`,
              }}
            >
              Due date
            </div>
            <div style={{ padding: "7px 12px", textAlign: "center" }}>Status</div>
          </div>
          )}

          {items.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 13, color: C.textSecondary }}>
              Nothing on deck yet — add up to 7 priorities below.
            </div>
          )}

          {items.map((it) => (
            <OnDeckRow
              key={it.id}
              item={it}
              isMobile={isMobile}
              directReports={directReports}
              originLabel={businessName(it.sourceBusinessId ?? it.businessId)}
              onPatch={patch}
              onDelete={() => remove(it.id)}
            />
          ))}

          {adding ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderTop: items.length > 0 ? `1px solid ${C.divider}` : "none",
              }}
            >
              <input
                autoFocus
                type="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitQuick();
                  else if (e.key === "Escape") {
                    setAdding(false);
                    setQuickText("");
                  }
                }}
                placeholder="Task name…"
                style={{ ...inputStyle, fontSize: 14, flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => void submitQuick()}
                style={{
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setQuickText("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.textSecondary,
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (atCap) {
                  window.alert(
                    "On Deck is capped at 7 items. Remove one before adding another.",
                  );
                  return;
                }
                setAdding(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                borderTop: items.length > 0 ? `1px solid ${C.divider}` : "none",
                color: C.textSecondary,
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 500,
                padding: "8px 12px",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                opacity: atCap ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add action item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ON_DECK_GRID_COLS = "1fr 104px 80px 96px 108px";
/* Today's Top 3 has no Due column — everything in it is due today. */
const TOP3_DAY_GRID_COLS = "1fr 104px 80px 108px";

function OnDeckRow({
  item,
  isMobile,
  directReports,
  originLabel = null,
  onPatch,
  onDelete,
}: {
  item: OnDeckItem;
  isMobile: boolean;
  directReports: DirectReport[];
  originLabel?: string | null;
  onPatch: (id: number, body: Partial<OnDeckItem>) => Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [text, setText] = useState(item.text);
  const [hover, setHover] = useState(false);
  useEffect(() => setText(item.text), [item.text]);

  const dueInfo = formatDueDate(item.dueDate, false);

  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);
  useEffect(() => {
    if (originLabel && mirrorRef.current) {
      setTextWidth(mirrorRef.current.offsetWidth);
    }
  }, [text, originLabel]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? MOBILE_META_COLS : ON_DECK_GRID_COLS,
        alignItems: "stretch",
        borderBottom: `1px solid ${C.divider}`,
      }}
    >
      <div
        style={{
          gridColumn: isMobile ? "1 / -1" : "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
          borderBottom: isMobile ? `1px solid ${C.divider}` : "none",
          minWidth: 0,
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() =>
            text !== item.text && text.trim() && void onPatch(item.id, { text: text.trim() })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          }}
          style={
            originLabel
              ? {
                  ...inputStyle,
                  fontSize: 14,
                  flex: "0 1 auto",
                  width:
                    textWidth !== null
                      ? textWidth + 10
                      : `${Math.max(text.length + 2, 10)}ch`,
                  maxWidth: "70%",
                  minWidth: 60,
                }
              : { ...inputStyle, fontSize: 14, flex: 1, minWidth: 0 }
          }
        />
        {originLabel && (
          <OriginHint label={originLabel} text={text} mirrorRef={mirrorRef} />
        )}
        <PinStar
          taskText={text}
          sourceBusinessId={item.sourceBusinessId ?? item.businessId}
          visible={hover}
          onPinned={onDelete}
        />
        <button
          type="button"
          onClick={() => void onDelete()}
          aria-label="Remove from On Deck"
          title="Remove from On Deck"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 6px",
            visibility: hover ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: "6px 8px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <OwnerPicker
          directReportId={item.ownerDirectReportId}
          ownerName={item.ownerName}
          options={directReports}
          onChange={(next) =>
            void onPatch(item.id, {
              ownerDirectReportId: next.directReportId,
              ownerName: next.ownerName,
            })
          }
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: "6px 8px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <PriorityFlag
          priority={item.priority}
          onChange={(next) => void onPatch(item.id, { priority: next })}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: "6px 8px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <DueDateField
          value={item.dueDate}
          tone={dueInfo.tone}
          label={dueInfo.label}
          onChange={(next) => void onPatch(item.id, { dueDate: next })}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: "6px 8px",
        }}
      >
        <StatusPill status={item.status} onChange={(next) => void onPatch(item.id, { status: next })} />
      </div>
    </div>
  );
}

function StatsGrid({ stats }: { stats: Overview["stats"] }) {
  const tiles = [
    { label: "Open Life Tasks", value: stats.openLifeTasks },
    { label: "Open Team Items", value: stats.openTeamItems },
    { label: "Open Project Tasks", value: stats.openProjectTasks },
    { label: "Brain Dump Count", value: stats.brainDumpCount },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
      }}
    >
      {tiles.map((t) => (
        <div
          key={t.label}
          style={{
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 6,
            padding: "18px 18px",
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 30,
              fontWeight: 600,
              color: C.textPrimary,
              lineHeight: 1,
            }}
          >
            {t.value}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: C.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function SnapshotCard({ groups }: { groups: Overview["snapshot"] }) {
  return (
    <Card>
      <CardHeading title="Open Items Snapshot" subtitle="Top 2 open tasks per section" />
      {groups.length === 0 ? (
        <EmptyHint text="Nothing open. Add some tasks in the other tabs." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groups.map((g) => (
            <div key={`${g.parentType}:${g.parentId}`}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.textPrimary,
                  marginBottom: 6,
                }}
              >
                {g.parentName}
                <span
                  style={{
                    marginLeft: 8,
                    fontFamily: SANS,
                    fontSize: 11,
                    fontWeight: 500,
                    color: C.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  · {labelForParentType(g.parentType)}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: C.textPrimary, fontSize: 14 }}>
                {g.tasks.map((t) => (
                  <li key={t.id} style={{ padding: "2px 0" }}>
                    {t.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function labelForParentType(t: ParentType): string {
  return t === "life_area" ? "Life Area" : t === "direct_report" ? "Direct Report" : "Project";
}

/* ========================================================================== */
/* Direct Reports tab                                                         */
/* ========================================================================== */

function DirectReportsTab({ businesses = [] }: { businesses?: Business[] }) {
  const [people, setPeople] = useState<DirectReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setPeople(await api<DirectReport[]>("/command-center/direct-reports"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const addPerson = async () => {
    const name = window.prompt("Name?");
    if (!name?.trim()) return;
    await api("/command-center/direct-reports", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });
    load();
  };

  if (error) return <ErrorBlock message={error} />;

  // Hidden DRs (e.g. Brooks, Chad) remain selectable as task owners
  // elsewhere but are not rendered as sections in this list.
  const visiblePeople = people.filter((p) => !p.hidden);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {visiblePeople.map((p) => (
        <SectionAccordion
          key={p.id}
          parentType="direct_report"
          parentId={p.id}
          name={p.name}
          collapsed={p.collapsed}
          onRename={async (name) => {
            await api(`/command-center/direct-reports/${p.id}`, {
              method: "PATCH",
              body: JSON.stringify({ name }),
            });
            load();
          }}
          onToggle={async (collapsed) => {
            await api(`/command-center/direct-reports/${p.id}`, {
              method: "PATCH",
              body: JSON.stringify({ collapsed }),
            });
            load();
          }}
          onDelete={async () => {
            if (!window.confirm(`Delete ${p.name}?`)) return;
            await api(`/command-center/direct-reports/${p.id}`, { method: "DELETE" });
            load();
          }}
        />
      ))}
      <AddButton onClick={addPerson} label="+ Add Person" />
    </div>
  );
}

/* ========================================================================== */
/* Projects tab                                                               */
/* ========================================================================== */

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  complete: "Complete",
};
const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: C.statusActive,
  on_hold: C.statusHold,
  complete: C.statusComplete,
};
const STATUS_CYCLE: Record<ProjectStatus, ProjectStatus> = {
  active: "on_hold",
  on_hold: "complete",
  complete: "active",
};

function ProjectsTab({ businesses = [] }: { businesses?: Business[] }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setProjects(await api<Project[]>("/command-center/projects"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const addProject = async () => {
    const name = window.prompt("Project name?");
    if (!name?.trim()) return;
    await api("/command-center/projects", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });
    load();
  };

  if (error) return <ErrorBlock message={error} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {projects.map((p) => (
        <SectionAccordion
          key={p.id}
          parentType="project"
          parentId={p.id}
          name={p.name}
          collapsed={p.collapsed}
          headerRight={
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const next = STATUS_CYCLE[p.status];
                  await api(`/command-center/projects/${p.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: next }),
                  });
                  load();
                }}
                title="Click to cycle status"
                style={{
                  background: STATUS_COLORS[p.status],
                  color: "#fff",
                  border: "none",
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {STATUS_LABELS[p.status]}
              </button>
            </div>
          }
          onRename={async (name) => {
            await api(`/command-center/projects/${p.id}`, {
              method: "PATCH",
              body: JSON.stringify({ name }),
            });
            load();
          }}
          onToggle={async (collapsed) => {
            await api(`/command-center/projects/${p.id}`, {
              method: "PATCH",
              body: JSON.stringify({ collapsed }),
            });
            load();
          }}
          onDelete={async () => {
            if (!window.confirm(`Delete project "${p.name}"?`)) return;
            await api(`/command-center/projects/${p.id}`, { method: "DELETE" });
            load();
          }}
        />
      ))}
      <AddButton onClick={addProject} label="+ Add Project" />
    </div>
  );
}

/* ========================================================================== */
/* Life Areas tab                                                             */
/* ========================================================================== */

function LifeAreasTab({ businesses = [] }: { businesses?: Business[] }) {
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setAreas(await api<LifeArea[]>("/command-center/life-areas"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorBlock message={error} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {areas.map((a) => (
        <SectionAccordion
          key={a.id}
          parentType="life_area"
          parentId={a.id}
          name={a.name}
          collapsed={a.collapsed}
          accentColor={a.accentColor}
          headerRight={
            businesses.length > 1 ? (
              <BusinessChip
                businesses={businesses}
                currentId={currentBusinessId}
                onChange={async (newBizId) => {
                  await api(`/command-center/life-areas/${a.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ businessId: newBizId }),
                  });
                  load();
                }}
              />
            ) : undefined
          }
          bodyPrefix={
            <LifeAreaPanels
              area={a}
              apiPrefix="/command-center"
              onAreaChange={load}
            />
          }
          onRename={async (name) => {
            await api(`/command-center/life-areas/${a.id}`, {
              method: "PATCH",
              body: JSON.stringify({ name }),
            });
            load();
          }}
          onToggle={async (collapsed) => {
            await api(`/command-center/life-areas/${a.id}`, {
              method: "PATCH",
              body: JSON.stringify({ collapsed }),
            });
            load();
          }}
        />
      ))}
    </div>
  );
}

/* ========================================================================== */
/* Life Area Panels — Identity/Why/HowIPreserve/FeelsLike + structured Goals  */
/* (imported from the legacy "Living Your Best Year Ever" planner, now first- */
/* class on each Life Area accordion in Command Center).                      */
/* ========================================================================== */

const LIFE_AREA_GOAL_TYPES = [
  { key: "outcome",                 title: "Outcome Goals" },
  { key: "performance",             title: "Performance Goals" },
  { key: "process_continue",        title: "Process — Continue" },
  { key: "process_more_consistent", title: "Process — More Consistent" },
  { key: "process_begin",           title: "Process — Begin" },
] as const;

const LIFE_AREA_GOAL_STATUSES = [
  { key: "not_started", label: "Not started", color: "#9a948c" },
  { key: "in_progress", label: "In progress", color: "#c8a14a" },
  { key: "launched",    label: "Launched",    color: "#4a6fa5" },
  { key: "achieved",    label: "Achieved",    color: "#5b8a5a" },
] as const;

function LifeAreaPanels({
  area,
  apiPrefix,
  onAreaChange,
}: {
  area: LifeArea;
  apiPrefix: string;
  onAreaChange: () => void | Promise<void>;
}) {
  const [goals, setGoals] = useState<LifeAreaGoal[]>([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);

  const loadGoals = async () => {
    try {
      setGoals(await api<LifeAreaGoal[]>(`${apiPrefix}/life-areas/${area.id}/goals`));
      setGoalsLoaded(true);
    } catch {
      /* surfacing errors here would clobber the rest of the panel — fail soft */
    }
  };
  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.id]);

  const saveAbout = async (
    patch: Partial<
      Pick<
        LifeArea,
        | "identity"
        | "identityNextSteps"
        | "why"
        | "whyNextSteps"
        | "howIPreserve"
        | "howIPreserveNextSteps"
        | "feelsLike"
        | "feelsLikeNextSteps"
      >
    >,
  ) => {
    await api(`${apiPrefix}/life-areas/${area.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    onAreaChange();
  };
  const addGoal = async (goalType: string) => {
    await api(`${apiPrefix}/life-areas/${area.id}/goals`, {
      method: "POST",
      body: JSON.stringify({ goalType, text: "New goal" }),
    });
    loadGoals();
  };
  const updateGoal = async (id: number, patch: Partial<LifeAreaGoal>) => {
    await api(`${apiPrefix}/life-area-goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    loadGoals();
  };
  const deleteGoal = async (id: number) => {
    await api(`${apiPrefix}/life-area-goals/${id}`, { method: "DELETE" });
    loadGoals();
  };

  const aboutFields = [
    { key: "identity"     as const, nextKey: "identityNextSteps"     as const, title: "Identity",           items: area.identity              ?? [], nextSteps: area.identityNextSteps          ?? [] },
    { key: "why"          as const, nextKey: "whyNextSteps"          as const, title: "Why",                items: area.why                   ?? [], nextSteps: area.whyNextSteps               ?? [] },
    { key: "howIPreserve" as const, nextKey: "howIPreserveNextSteps" as const, title: "How I Preserve It",  items: area.howIPreserve          ?? [], nextSteps: area.howIPreserveNextSteps      ?? [] },
    { key: "feelsLike"    as const, nextKey: "feelsLikeNextSteps"    as const, title: "What It Feels Like", items: area.feelsLike             ?? [], nextSteps: area.feelsLikeNextSteps         ?? [] },
  ];
  // Always-on inline editing (Asana-style), matching Direct Reports/Projects.
  const goalsByType = new Map<string, LifeAreaGoal[]>();
  for (const g of goals) {
    const arr = goalsByType.get(g.goalType) ?? [];
    arr.push(g);
    goalsByType.set(g.goalType, arr);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {aboutFields.map((f) => (
          <LifeAreaAboutList
            key={f.key}
            title={f.title}
            items={f.items}
            nextSteps={f.nextSteps}
            onChange={(items, nextSteps) =>
              saveAbout({ [f.key]: items, [f.nextKey]: nextSteps } as Partial<LifeArea>)
            }
          />
        ))}
      </div>

      {goalsLoaded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {LIFE_AREA_GOAL_TYPES.map((gt) => (
            <LifeAreaGoalsBlock
              key={gt.key}
              title={gt.title}
              goals={goalsByType.get(gt.key) ?? []}
              onAdd={() => addGoal(gt.key)}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LifeAreaAboutList({
  title,
  items,
  nextSteps,
  onChange,
}: {
  title: string;
  items: string[];
  nextSteps: string[];
  onChange: (items: string[], nextSteps: string[]) => void | Promise<void>;
}) {
  // Next-steps column removed from the About panels; we still preserve any
  // existing nextSteps payload on the server (pass-through unchanged) so the
  // data isn't destroyed if the column ever comes back.
  const [draftItems, setDraftItems] = useState<string[]>(items);
  useEffect(() => setDraftItems(items), [items.join("\u0001")]);

  const commit = (nextItems: string[]) => {
    setDraftItems(nextItems);
    if (JSON.stringify(nextItems) !== JSON.stringify(items)) {
      onChange(nextItems, nextSteps);
    }
  };

  const COLS = "1fr 56px";
  return (
    <div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: C.textPrimary,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {draftItems.map((it, idx) => (
          <AboutListRow
            key={idx}
            cols={COLS}
            onRemove={() => commit(draftItems.filter((_, i) => i !== idx))}
          >
            <input
              type="text"
              value={it}
              onChange={(e) => {
                const next = [...draftItems];
                next[idx] = e.target.value;
                setDraftItems(next);
              }}
              onBlur={() => commit(draftItems)}
              style={{
                ...inputStyle,
                fontSize: 13,
                padding: "4px 6px",
                border: "none",
                background: "transparent",
              }}
            />
          </AboutListRow>
        ))}
        <button
          type="button"
          onClick={() => commit([...draftItems, ""])}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            fontFamily: SANS,
            fontSize: 12,
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          + Add task
        </button>
      </div>
    </div>
  );
}

function AboutListRow({
  cols,
  onRemove,
  children,
}: {
  cols: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: 8,
        alignItems: "start",
        padding: "6px 8px",
        background: "transparent",
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 4,
      }}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: "transparent",
          border: "none",
          color: C.textSecondary,
          cursor: "pointer",
          fontFamily: SANS,
          fontSize: 12,
          padding: "4px 6px",
          justifySelf: "end",
          visibility: hover ? "visible" : "hidden",
        }}
      >
        Delete
      </button>
    </div>
  );
}

const GOAL_PILL_OPTIONS: { value: string; label: string; bg: string; fg: string }[] = [
  { value: "not_started", label: "Not started", bg: "#ece8df", fg: "#5a544a" },
  { value: "in_progress", label: "In progress", bg: "#fdf4d3", fg: "#7a5b00" },
  { value: "launched",    label: "Launched",    bg: "#dde6f3", fg: "#2b4a78" },
  { value: "achieved",    label: "Achieved",    bg: "#cfead8", fg: "#1f6a3f" },
];

const GOAL_GRID_COLS = "1fr 132px 132px 1.2fr";

function LifeAreaGoalsBlock({
  title,
  goals,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string;
  goals: LifeAreaGoal[];
  onAdd: () => void | Promise<void>;
  onUpdate: (id: number, patch: Partial<LifeAreaGoal>) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: C.textPrimary,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: "transparent",
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 6,
          overflowX: "auto",
        }}
      >
       <div style={{ minWidth: 640 }}>
        {/* Column header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GOAL_GRID_COLS,
            background: "transparent",
            borderBottom: `1px solid ${C.divider}`,
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 600,
            color: C.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <div style={{ padding: "7px 12px", borderRight: `1px solid ${C.divider}` }}>
            Task name
          </div>
          <div
            style={{
              padding: "7px 12px",
              textAlign: "center",
              borderRight: `1px solid ${C.divider}`,
            }}
          >
            Due date
          </div>
          <div
            style={{
              padding: "7px 12px",
              textAlign: "center",
              borderRight: `1px solid ${C.divider}`,
            }}
          >
            Status
          </div>
          <div style={{ padding: "7px 12px" }}>Next steps</div>
        </div>

        {goals.map((g) => (
          <LifeAreaGoalRow
            key={g.id}
            goal={g}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}

        <button
          type="button"
          onClick={onAdd}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            borderTop: goals.length > 0 ? `1px solid ${C.divider}` : "none",
            color: C.textSecondary,
            fontFamily: SANS,
            fontSize: 13,
            padding: "8px 12px 8px 36px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add action item
        </button>
       </div>
      </div>
    </div>
  );
}

function LifeAreaGoalRow({
  goal,
  onUpdate,
  onDelete,
}: {
  goal: LifeAreaGoal;
  onUpdate: (id: number, patch: Partial<LifeAreaGoal>) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const [text, setText] = useState(goal.text);
  const [nextSteps, setNextSteps] = useState(goal.nextSteps);
  const [hover, setHover] = useState(false);
  useEffect(() => setText(goal.text), [goal.text]);
  useEffect(() => setNextSteps(goal.nextSteps), [goal.nextSteps]);

  const done = goal.status === "achieved";
  const dueInfo = formatDueDate(goal.dueDate, done);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: GOAL_GRID_COLS,
        alignItems: "stretch",
        borderBottom: `1px solid ${C.divider}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRight: `1px solid ${C.divider}`,
          minWidth: 0,
        }}
      >
        <AsanaCheck
          done={done}
          onToggle={() =>
            onUpdate(goal.id, { status: done ? "not_started" : "achieved" })
          }
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== goal.text && text.trim() && onUpdate(goal.id, { text: text.trim() })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          }}
          style={{
            ...inputStyle,
            fontSize: 14,
            padding: "2px 6px",
            border: "none",
            background: "transparent",
            textDecoration: done ? "line-through" : "none",
            color: done ? C.textSecondary : C.textPrimary,
            flex: 1,
            minWidth: 0,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 8px",
          borderRight: `1px solid ${C.divider}`,
        }}
      >
        <DueDateField
          value={goal.dueDate}
          tone={dueInfo.tone}
          label={dueInfo.label}
          onChange={(next) => onUpdate(goal.id, { dueDate: next })}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 8px",
          borderRight: `1px solid ${C.divider}`,
        }}
      >
        <GoalStatusPill
          status={goal.status}
          onChange={(next) => onUpdate(goal.id, { status: next })}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px" }}>
        <textarea
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          onBlur={() => nextSteps !== goal.nextSteps && onUpdate(goal.id, { nextSteps })}
          placeholder="Next steps…"
          rows={Math.max(1, nextSteps.split("\n").length)}
          style={{
            ...inputStyle,
            fontSize: 13,
            padding: "4px 6px",
            border: "none",
            background: "transparent",
            color: C.textSecondary,
            resize: "none",
            flex: 1,
            minWidth: 0,
            lineHeight: 1.4,
          }}
        />
        <PinStar taskText={goal.text} visible={hover} />
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          aria-label="Delete goal"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontFamily: SANS,
            fontSize: 12,
            padding: "4px 6px",
            visibility: hover ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function GoalStatusPill({
  status,
  onChange,
}: {
  status: string;
  onChange: (next: string) => void;
}) {
  const opt =
    GOAL_PILL_OPTIONS.find((o) => o.value === status) ?? GOAL_PILL_OPTIONS[0];
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          background: opt.bg,
          color: opt.fg,
          border: "none",
          borderRadius: 999,
          padding: "3px 14px",
          fontSize: 11,
          fontFamily: SANS,
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        {GOAL_PILL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ========================================================================== */
/* Reusable section accordion with task list                                  */
/* ========================================================================== */

type TaskSection = {
  id: number;
  parentType: ParentType;
  parentId: number;
  name: string;
  sortOrder: number;
  collapsed: boolean;
};

function SectionAccordion({
  parentType,
  parentId,
  name,
  collapsed,
  accentColor,
  headerRight,
  bodyPrefix,
  onRename,
  onToggle,
  onDelete,
}: {
  parentType: ParentType;
  parentId: number;
  name: string;
  collapsed: boolean;
  accentColor?: string;
  headerRight?: React.ReactNode;
  /* Optional content rendered inside the expanded body, above the task
     list. Used by Life Areas to surface Identity/Why/Goals panels. */
  bodyPrefix?: React.ReactNode;
  onRename: (name: string) => Promise<void> | void;
  onToggle: (collapsed: boolean) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);

  useEffect(() => setNameDraft(name), [name]);

  // Owner options for project tasks are fetched separately from the main load
  // so they can be refreshed whenever this accordion is (re)opened or the
  // window regains focus — picking up direct reports added in another tab
  // without requiring a full page reload.
  const loadDirectReports = useCallback(async (): Promise<DirectReport[]> => {
    if (parentType !== "project") return [];
    const rows = await api<DirectReport[]>("/command-center/direct-reports");
    setDirectReports(rows);
    return rows;
  }, [parentType]);

  // Auto-link project tasks whose owner was saved as a free-text name (because
  // the person wasn't a selectable direct report yet) that now matches an
  // existing direct report. Converges: once linked the task has an
  // ownerDirectReportId and no longer matches, so no further patches occur.
  const reconcileFreeTextOwners = async (
    taskRows: Task[],
    drRows: DirectReport[],
  ): Promise<void> => {
    if (parentType !== "project" || drRows.length === 0) return;
    const byName = new Map<string, DirectReport>();
    for (const dr of drRows) {
      const key = dr.name.trim().toLowerCase();
      if (key && !byName.has(key)) byName.set(key, dr);
    }
    const toLink = taskRows.filter(
      (t) =>
        t.parentType === "project" &&
        t.ownerDirectReportId == null &&
        t.ownerName != null &&
        byName.has(t.ownerName.trim().toLowerCase()),
    );
    if (toLink.length === 0) return;
    await Promise.all(
      toLink.map((t) =>
        api(`/command-center/tasks/${t.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ownerDirectReportId: byName.get(t.ownerName!.trim().toLowerCase())!.id,
            ownerName: null,
          }),
        }),
      ),
    );
    await load();
  };

  const load = async () => {
    const [taskRows, sectionRows, drRows, projRows] = await Promise.all([
      api<Task[]>(`/command-center/tasks?parentType=${parentType}&parentId=${parentId}`),
      api<TaskSection[]>(
        `/command-center/task-sections?parentType=${parentType}&parentId=${parentId}`,
      ),
      parentType === "project"
        ? api<DirectReport[]>("/command-center/direct-reports")
        : Promise.resolve([] as DirectReport[]),
      parentType === "direct_report"
        ? api<Project[]>("/command-center/projects")
        : Promise.resolve([] as Project[]),
    ]);
    setTasks(taskRows);
    setSections(sectionRows);
    setDirectReports(drRows);
    setProjects(projRows);
    setLoaded(true);
    void reconcileFreeTextOwners(taskRows, drRows);
  };

  useEffect(() => {
    if (!collapsed && !loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  // Keep owner options fresh while a project accordion is open: refetch on
  // (re)open and whenever the window regains focus.
  useEffect(() => {
    if (collapsed || parentType !== "project") return;
    let cancelled = false;
    const refresh = async () => {
      const rows = await loadDirectReports();
      if (!cancelled) void reconcileFreeTextOwners(tasks, rows);
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, parentType, loadDirectReports]);

  const openCount = tasks.filter((t) => !t.done).length;
  const totalCount = tasks.length;

  const addSection = async () => {
    const sectionName = window.prompt("Section name?");
    if (!sectionName?.trim()) return;
    await api("/command-center/task-sections", {
      method: "POST",
      body: JSON.stringify({ parentType, parentId, name: sectionName.trim() }),
    });
    load();
  };

  // Group tasks by sectionId. Untitled group only shown if it has tasks
  // (or there are no sections at all, to give users a place to start).
  const tasksBySection = new Map<number | null, Task[]>();
  for (const t of tasks) {
    // Tasks merged in from another parent (e.g. project tasks owned by this
    // direct report) carry a sectionId that belongs to the foreign parent's
    // section set, so we surface them in the untitled group instead of
    // dropping them silently.
    const isForeign = t.parentType !== parentType || t.parentId !== parentId;
    const key = isForeign ? null : t.sectionId ?? null;
    const arr = tasksBySection.get(key) ?? [];
    arr.push(t);
    tasksBySection.set(key, arr);
  }
  const untitledTasks = tasksBySection.get(null) ?? [];
  const showUntitled = untitledTasks.length > 0 || sections.length === 0;

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderLeft: accentColor ? `4px solid ${accentColor}` : `1px solid ${C.cardBorder}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onClick={() => onToggle(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: C.textSecondary,
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 120ms ease",
            display: "inline-block",
            width: 10,
          }}
        >
          ▼
        </span>

        {editingName ? (
          <input
            type="text"
            value={nameDraft}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={async () => {
              setEditingName(false);
              if (nameDraft.trim() && nameDraft !== name) await onRename(nameDraft.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setNameDraft(name);
                setEditingName(false);
              }
            }}
            style={{
              ...inputStyle,
              fontFamily: SERIF,
              fontSize: 16,
              fontWeight: 600,
              padding: "2px 6px",
              flex: 1,
            }}
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
            }}
            style={{
              fontFamily: SERIF,
              fontSize: 16,
              fontWeight: 600,
              color: C.textPrimary,
              flex: 1,
            }}
          >
            {name}
          </div>
        )}

        {parentType === "life_area" && (
          <span
            style={{
              background: C.accentSoft,
              color: C.accent,
              fontFamily: SANS,
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 10,
            }}
          >
            {`${tasks.filter((t) => t.done).length}/${totalCount}`}
          </span>
        )}

        {headerRight}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: C.textSecondary,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: SANS,
              padding: "2px 6px",
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ borderTop: `1px solid ${C.divider}`, padding: "10px 10px 14px" }}>
          {bodyPrefix && (
            <div style={{ marginBottom: loaded ? 18 : 12 }}>{bodyPrefix}</div>
          )}
          {!loaded && <div style={{ fontSize: 13, color: C.textSecondary }}>Loading…</div>}

          {loaded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {showUntitled && (
                <TaskSectionGroup
                  parentType={parentType}
                  parentId={parentId}
                  section={null}
                  tasks={untitledTasks}
                  directReports={directReports}
                  projects={projects}
                  onChange={load}
                />
              )}
              {sections.map((s) => (
                <TaskSectionGroup
                  key={s.id}
                  parentType={parentType}
                  parentId={parentId}
                  section={s}
                  tasks={tasksBySection.get(s.id) ?? []}
                  directReports={directReports}
                  projects={projects}
                  onChange={load}
                />
              ))}

              <button
                type="button"
                onClick={addSection}
                style={{
                  background: "transparent",
                  border: `1px dashed ${C.cardBorder}`,
                  color: C.textSecondary,
                  fontFamily: SANS,
                  fontSize: 12,
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                + Add section
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskSectionGroup({
  parentType,
  parentId,
  section,
  tasks,
  directReports,
  projects,
  onChange,
}: {
  parentType: ParentType;
  parentId: number;
  section: TaskSection | null;
  tasks: Task[];
  directReports: DirectReport[];
  projects: Project[];
  onChange: () => void | Promise<void>;
}) {
  const isMobile = useIsMobile();
  const showOwnerColumn = parentType === "project";
  const showNextStepsColumn = parentType === "life_area";
  const gridCols = showOwnerColumn
    ? "1fr 104px 80px 96px 108px"
    : showNextStepsColumn
      ? "1fr 80px 96px 108px 1fr"
      : GRID_COLS;
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const collapsed = section?.collapsed ?? false;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(section?.name ?? "");
  const [taskDraft, setTaskDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [hoverHeader, setHoverHeader] = useState(false);

  useEffect(() => setNameDraft(section?.name ?? ""), [section?.name]);

  const headerLabel = section?.name ?? "Untitled";
  const openCount = tasks.filter((t) => !t.done).length;

  const addTask = async () => {
    const t = taskDraft.trim();
    if (!t) return;
    await api("/command-center/tasks", {
      method: "POST",
      body: JSON.stringify({
        parentType,
        parentId,
        sectionId: section?.id ?? null,
        text: t,
      }),
    });
    setTaskDraft("");
    onChange();
  };

  const toggleCollapsed = async () => {
    if (!section) return;
    await api(`/command-center/task-sections/${section.id}`, {
      method: "PATCH",
      body: JSON.stringify({ collapsed: !collapsed }),
    });
    onChange();
  };

  const renameSection = async (next: string) => {
    if (!section) return;
    await api(`/command-center/task-sections/${section.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: next }),
    });
    onChange();
  };

  const deleteSection = async () => {
    if (!section) return;
    if (
      !window.confirm(
        `Delete section "${section.name}"? Tasks inside will move to Untitled.`,
      )
    )
      return;
    await api(`/command-center/task-sections/${section.id}`, { method: "DELETE" });
    onChange();
  };

  return (
    <div>
      <div
        onMouseEnter={() => setHoverHeader(true)}
        onMouseLeave={() => setHoverHeader(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "2px 0 6px",
          userSelect: "none",
        }}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          disabled={!section}
          style={{
            background: "transparent",
            border: "none",
            cursor: section ? "pointer" : "default",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            color: C.textSecondary,
          }}
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          <span
            style={{
              fontSize: 9,
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 120ms ease",
              display: "inline-block",
              opacity: section ? 1 : 0.3,
            }}
          >
            ▼
          </span>
        </button>

        {section && editingName ? (
          <input
            type="text"
            value={nameDraft}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={async () => {
              setEditingName(false);
              if (nameDraft.trim() && nameDraft !== section.name)
                await renameSection(nameDraft.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setNameDraft(section.name);
                setEditingName(false);
              }
            }}
            style={{
              ...inputStyle,
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 700,
              padding: "1px 4px",
            }}
          />
        ) : (
          <div
            onClick={() => section && setEditingName(true)}
            style={{
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 700,
              color: section ? C.textPrimary : C.textSecondary,
              letterSpacing: 0.2,
              cursor: section ? "text" : "default",
            }}
          >
            {headerLabel}
          </div>
        )}

        <span style={{ flex: 1 }} />

        {section && (
          <button
            type="button"
            onClick={deleteSection}
            style={{
              background: "transparent",
              border: "none",
              color: C.textSecondary,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: SANS,
              padding: "2px 6px",
              visibility: hoverHeader ? "visible" : "hidden",
            }}
          >
            Delete section
          </button>
        )}
      </div>

      {!collapsed && (
        <div
          style={{
            border: `1px solid ${C.divider}`,
            borderRadius: 6,
            overflowX: isMobile ? "visible" : "auto",
            background: C.card,
          }}
        >
        <div style={{ minWidth: isMobile ? 0 : showNextStepsColumn ? 640 : showOwnerColumn ? 560 : 480 }}>
          {/* Column header */}
          {!isMobile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              background: "#faf7f1",
              borderBottom: `1px solid ${C.divider}`,
              fontSize: 11,
              fontWeight: 600,
              color: C.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <div style={{ padding: "7px 12px", borderRight: `1px solid ${C.divider}` }}>
              Task name
            </div>
            {showOwnerColumn && (
              <div
                style={{
                  padding: "7px 12px",
                  textAlign: "center",
                  borderRight: `1px solid ${C.divider}`,
                }}
              >
                Owner
              </div>
            )}
            <div
              style={{
                padding: "7px 12px",
                textAlign: "center",
                borderRight: `1px solid ${C.divider}`,
              }}
            >
              Priority
            </div>
            <div
              style={{
                padding: "7px 12px",
                textAlign: "center",
                borderRight: `1px solid ${C.divider}`,
              }}
            >
              Due date
            </div>
            <div
              style={{
                padding: "7px 12px",
                textAlign: "center",
                borderRight: showNextStepsColumn ? `1px solid ${C.divider}` : "none",
              }}
            >
              Status
            </div>
            {showNextStepsColumn && (
              <div style={{ padding: "7px 12px" }}>Next steps</div>
            )}
          </div>
          )}

          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isMobile={isMobile}
              gridCols={gridCols}
              showOwnerColumn={showOwnerColumn}
              showNextStepsColumn={showNextStepsColumn}
              directReports={directReports}
              originLabel={
                parentType === "direct_report" && task.parentType === "project"
                  ? projectsById.get(task.parentId)?.name ?? null
                  : null
              }
              onUpdate={async (patch) => {
                await api(`/command-center/tasks/${task.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(patch),
                });
                onChange();
              }}
              onDelete={async () => {
                await api(`/command-center/tasks/${task.id}`, { method: "DELETE" });
                onChange();
              }}
            />
          ))}

          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTask();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                borderTop: tasks.length > 0 ? `1px solid ${C.divider}` : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 12px",
                  flex: 1,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `1.5px dashed ${C.cardBorder}`,
                    flexShrink: 0,
                  }}
                />
                <input
                  type="text"
                  value={taskDraft}
                  autoFocus
                  onChange={(e) => setTaskDraft(e.target.value)}
                  onBlur={() => {
                    if (!taskDraft.trim()) setAdding(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setTaskDraft("");
                      setAdding(false);
                    }
                  }}
                  placeholder="Action item — press Enter to save"
                  style={{ ...inputStyle, fontSize: 14, color: C.textPrimary, flex: 1 }}
                />
              </div>
              {taskDraft.trim() && (
                <button
                  type="submit"
                  style={{
                    background: C.accent,
                    color: "#fff",
                    border: "none",
                    fontFamily: SANS,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginRight: 12,
                  }}
                >
                  Add
                </button>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                borderTop: tasks.length > 0 ? `1px solid ${C.divider}` : "none",
                color: C.textSecondary,
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 500,
                padding: "6px 12px",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add action item
            </button>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

const GRID_COLS = "1fr 80px 96px 108px";

const STATUS_OPTIONS: { value: TaskStatus; label: string; bg: string; fg: string }[] = [
  { value: "not_started", label: "Not started", bg: "#ece8df", fg: "#5a544a" },
  { value: "in_progress", label: "In progress", bg: "#fdf4d3", fg: "#7a5b00" },
  { value: "completed", label: "Completed", bg: "#cfead8", fg: "#1f6a3f" },
];

/* Base style for a native <select> rendered as a colored pill
   (StatusPill, PriorityFlag). */
const pillSelectStyle: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  border: "none",
  borderRadius: 999,
  fontSize: 11,
  fontFamily: SANS,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  // <select> renders its chosen option via text-align-last, not text-align.
  textAlignLast: "center",
};

function StatusPill({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange: (next: TaskStatus) => void;
}) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as TaskStatus)}
        style={{
          ...pillSelectStyle,
          background: opt.bg,
          color: opt.fg,
          padding: "3px 14px",
        }}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; bg: string; fg: string }[] = [
  { value: "high", label: "High", bg: "#fbdcdc", fg: "#a02020" },
  { value: "medium", label: "Medium", bg: "#fdf4d3", fg: "#7a5b00" },
  { value: "low", label: "Low", bg: "#e2e8f0", fg: "#475569" },
];

/* Badge + picker in one control, rendered in the Priority column.
   Set → colored pill; unset → muted "—" placeholder (AE2: no badge). */
function PriorityFlag({
  priority,
  onChange,
}: {
  priority: TaskPriority | null;
  onChange: (next: TaskPriority | null) => void;
}) {
  const opt = priority ? PRIORITY_OPTIONS.find((o) => o.value === priority) : null;
  return (
    <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
      <select
        value={priority ?? ""}
        onChange={(e) => onChange((e.target.value || null) as TaskPriority | null)}
        aria-label="Priority"
        title="Priority"
        style={{
          ...pillSelectStyle,
          background: opt ? opt.bg : "transparent",
          color: opt ? opt.fg : "#94a3b8",
          border: opt ? "none" : "1px dashed #cbd5e1",
          padding: "3px 10px",
        }}
      >
        <option value="">{priority ? "None" : "set —"}</option>
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TaskRow({
  task,
  isMobile,
  gridCols,
  showOwnerColumn,
  showNextStepsColumn,
  directReports,
  originLabel,
  onUpdate,
  onDelete,
}: {
  task: Task;
  isMobile: boolean;
  gridCols: string;
  showOwnerColumn: boolean;
  showNextStepsColumn: boolean;
  directReports: DirectReport[];
  originLabel: string | null;
  onUpdate: (patch: Partial<Task>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [text, setText] = useState(task.text);
  const [nextSteps, setNextSteps] = useState(task.nextSteps ?? "");
  const [hover, setHover] = useState(false);
  useEffect(() => setText(task.text), [task.text]);
  useEffect(() => setNextSteps(task.nextSteps ?? ""), [task.nextSteps]);

  const due = task.dueDate;
  const dueInfo = formatDueDate(due, task.done);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? MOBILE_META_COLS : gridCols,
        alignItems: "stretch",
        borderBottom: `1px solid ${C.divider}`,
      }}
    >
      <div
        style={{
          gridColumn: isMobile ? "1 / -1" : "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
          borderBottom: isMobile ? `1px solid ${C.divider}` : "none",
          minWidth: 0,
        }}
      >
        <AsanaCheck done={task.done} onToggle={() => onUpdate({ done: !task.done })} />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== task.text && text.trim() && onUpdate({ text: text.trim() })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          }}
          style={{
            ...inputStyle,
            fontSize: 14,
            textDecoration: task.done ? "line-through" : "none",
            color: task.done ? C.textSecondary : C.textPrimary,
            flex: 1,
            minWidth: 0,
          }}
        />
        {originLabel && (
          <span
            title={`From project: ${originLabel}`}
            style={{
              fontSize: 10,
              fontFamily: SANS,
              fontWeight: 600,
              color: C.accent,
              background: C.accentSoft,
              padding: "2px 6px",
              borderRadius: 8,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {originLabel}
          </span>
        )}
        {originLabel && !isMobile && (
          <span
            title={`Lives in: ${originLabel}`}
            style={{
              fontSize: 10,
              fontFamily: SANS,
              fontWeight: 600,
              color: C.accent,
              background: C.accentSoft,
              padding: "2px 6px",
              borderRadius: 8,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {originLabel}
          </span>
        )}
        <SendToOnDeck task={task} visible={hover} />
        <PinStar taskText={task.text} visible={hover} />
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete task"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 6px",
            visibility: hover ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      {showOwnerColumn && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMobile ? "flex-start" : "center",
            padding: "6px 8px",
            borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
          }}
        >
          <OwnerPicker
            directReportId={task.ownerDirectReportId}
            ownerName={task.ownerName}
            options={directReports}
            onChange={(next) =>
              onUpdate({
                ownerDirectReportId: next.directReportId,
                ownerName: next.ownerName,
              })
            }
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: "6px 8px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <PriorityFlag
          priority={task.priority}
          onChange={(next) => onUpdate({ priority: next })}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: "6px 8px",
          borderRight: isMobile ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <DueDateField
          value={due}
          tone={dueInfo.tone}
          label={dueInfo.label}
          onChange={(next) => onUpdate({ dueDate: next })}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: "6px 8px",
          borderRight: isMobile || !showNextStepsColumn ? "none" : `1px solid ${C.divider}`,
        }}
      >
        <StatusPill
          status={task.status}
          onChange={(next) => onUpdate({ status: next })}
        />
      </div>
      {showNextStepsColumn && (
        <div
          style={{
            gridColumn: isMobile ? "1 / -1" : "auto",
            display: "flex",
            alignItems: "stretch",
            padding: "6px 8px",
          }}
        >
          <textarea
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            onBlur={() => {
              if (nextSteps !== (task.nextSteps ?? "")) onUpdate({ nextSteps });
            }}
            placeholder="Next steps…"
            rows={Math.max(1, nextSteps.split("\n").length)}
            style={{
              ...inputStyle,
              fontSize: 13,
              padding: "2px 6px",
              border: "none",
              background: "transparent",
              color: C.textSecondary,
              resize: "none",
              width: "100%",
              lineHeight: 1.4,
            }}
          />
        </div>
      )}
    </div>
  );
}

function OwnerPicker({
  directReportId,
  ownerName,
  options,
  onChange,
}: {
  directReportId: number | null;
  ownerName: string | null;
  options: DirectReport[];
  onChange: (next: { directReportId: number | null; ownerName: string | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ownerName ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const current = directReportId != null ? options.find((o) => o.id === directReportId) : null;
  const customName = !current && ownerName ? ownerName : null;
  const label = current?.name ?? customName ?? "Unassigned";
  const hasOwner = current != null || customName != null;

  const commitOther = () => {
    const v = draft.trim();
    onChange({ directReportId: null, ownerName: v === "" ? null : v });
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitOther}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitOther();
          } else if (e.key === "Escape") {
            setDraft(ownerName ?? "");
            setEditing(false);
          }
        }}
        placeholder="Type a name…"
        maxLength={120}
        style={{
          width: 124,
          fontSize: 12,
          fontFamily: SANS,
          padding: "3px 8px",
          border: `1px solid ${C.accent}`,
          borderRadius: 10,
          color: C.textPrimary,
          outline: "none",
        }}
      />
    );
  }

  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        fontSize: 13,
        fontFamily: SANS,
        color: hasOwner ? C.textSecondary : "#cbd5e1",
        padding: "3px 4px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={hasOwner ? `Owner: ${label} — click to change` : "Assign owner"}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {hasOwner ? label : "—"}
      </span>
      <select
        value={current ? String(current.id) : customName != null ? "__custom__" : ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__other__" || v === "__custom__") {
            setDraft(customName ?? "");
            setEditing(true);
          } else if (v === "") {
            onChange({ directReportId: null, ownerName: null });
          } else {
            onChange({ directReportId: parseInt(v, 10), ownerName: null });
          }
        }}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          cursor: "pointer",
          width: "100%",
          height: "100%",
          border: "none",
        }}
      >
        <option value="">Unassigned</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        {customName != null && <option value="__custom__">{customName}</option>}
        <option value="__other__">
          {customName != null ? "Edit name…" : "Other…"}
        </option>
      </select>
    </label>
  );
}

function SendToOnDeck({
  task,
  sourceBusinessId = null,
  apiPrefix = "/command-center",
  visible,
}: {
  task: Task;
  sourceBusinessId?: number | null;
  apiPrefix?: string;
  visible: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const flashAdded = () => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  const send = async () => {
    const text = task.text.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const existing = await api<OnDeckItem[]>(`${apiPrefix}/on-deck`);
      if (existing.some((i) => i.sourceTaskId === task.id)) {
        flashAdded();
        window.alert("This task is already on On Deck.");
        return;
      }
      if (existing.length >= ON_DECK_CAP) {
        window.alert(
          `On Deck is full (${existing.length}/${ON_DECK_CAP} — this week's shortlist). Remove an item before adding another.`,
        );
        return;
      }
      await api(`${apiPrefix}/on-deck`, {
        method: "POST",
        body: JSON.stringify({
          text,
          sourceTaskId: task.id,
          sourceBusinessId,
          ownerDirectReportId: task.ownerDirectReportId,
          ownerName: task.ownerName,
          dueDate: task.dueDate,
          priority: task.priority,
        }),
      });
      flashAdded();
      window.dispatchEvent(new CustomEvent("cc:top3-changed"));
    } catch (e) {
      window.alert(onDeckAddErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void send();
      }}
      disabled={busy}
      aria-label="Send to On Deck"
      title={added ? "On On Deck" : "Send to On Deck"}
      style={{
        background: "#fff",
        border: `1px solid ${C.divider}`,
        borderRadius: 6,
        cursor: busy ? "default" : "pointer",
        padding: "3px 8px",
        fontSize: 10.5,
        fontWeight: 600,
        fontFamily: SANS,
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        color: added ? C.accent : "#475569",
        visibility: visible || added ? "visible" : "hidden",
        flexShrink: 0,
      }}
    >
      {added ? "✓ Added" : "On Deck"}
    </button>
  );
}

function PinStar({
  taskText,
  sourceBusinessId = null,
  apiPrefix = "/command-center",
  visible,
  onPinned,
}: {
  taskText: string;
  sourceBusinessId?: number | null;
  apiPrefix?: string;
  visible: boolean;
  onPinned?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<Top3Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openPicker = async () => {
    setOpen(true);
    try {
      const rows = await api<Top3Row[]>(`${apiPrefix}/top3`);
      setSlots(rows);
    } catch {
      if (slots === null) setSlots([]);
    }
  };

  const pin = async (period: "day" | "week", slot: number) => {
    const text = taskText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await api(`${apiPrefix}/top3/${period}/${slot}`, {
        method: "PUT",
        body: JSON.stringify({ text, done: false, sourceBusinessId }),
      });
      setSlots((cur) =>
        (cur ?? []).map((r) =>
          r.period === period && r.slot === slot ? { ...r, text, done: false } : r,
        ),
      );
      window.dispatchEvent(new CustomEvent("cc:top3-changed"));
      setOpen(false);
      if (onPinned) await onPinned();
    } finally {
      setBusy(false);
    }
  };

  const getSlot = (period: "day" | "week", slot: number) =>
    slots?.find((r) => r.period === period && r.slot === slot) ?? null;

  const colStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    flex: 1,
  };
  const colTitle: CSSProperties = {
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: 700,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else void openPicker();
        }}
        aria-label="Pin to Top 3"
        title="Pin to Top 3"
        style={{
          background: open ? C.header : "#fff",
          border: `1px solid ${open ? C.header : C.divider}`,
          borderRadius: 6,
          cursor: "pointer",
          padding: "3px 8px",
          fontSize: 10.5,
          fontWeight: 600,
          fontFamily: SANS,
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          color: open ? "#fff" : "#475569",
          visibility: visible || open ? "visible" : "hidden",
        }}
      >
        ★ Top 3
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            padding: 10,
            width: 320,
            fontFamily: SANS,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {(["day", "week"] as const).map((period) => (
              <div key={period} style={colStyle}>
                <div style={colTitle}>{period === "day" ? "Today" : "This Week"}</div>
                {[1, 2, 3].map((slot) => {
                  const row = getSlot(period, slot);
                  const preview = row?.text?.trim() ?? "";
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={busy || slots === null}
                      onClick={() => pin(period, slot)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#faf7f1",
                        border: `1px solid ${C.divider}`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        cursor: busy ? "default" : "pointer",
                        textAlign: "left",
                        minWidth: 0,
                        fontFamily: SANS,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: C.accent,
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {slot}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: preview ? C.textPrimary : C.textSecondary,
                          fontStyle: preview ? "normal" : "italic",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {preview || "empty"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AsanaCheck({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  const [hover, setHover] = useState(false);
  const ring = done ? "#1f6a3f" : hover ? "#1f6a3f" : "#cbd5e1";
  const fill = done ? "#1f6a3f" : "transparent";
  const checkColor = done ? "#fff" : hover ? "#94a3b8" : "transparent";
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={done ? "Mark incomplete" : "Mark complete"}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
        <circle
          cx="10"
          cy="10"
          r="8.5"
          fill={fill}
          stroke={ring}
          strokeWidth="1.5"
        />
        <path
          d="M6 10.2 L9 13 L14 7.5"
          fill="none"
          stroke={checkColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function DueDateField({
  value,
  tone,
  label,
  onChange,
}: {
  value: string | null;
  tone: "none" | "overdue" | "today" | "soon" | "future" | "done";
  label: string;
  onChange: (next: string | null) => void;
}) {
  // Tone carries only the text color — no pill background.
  const colors: Record<typeof tone, string> = {
    none: C.textSecondary,
    overdue: "#b1361e",
    today: "#7a5b00",
    soon: "#4a4036",
    future: C.textSecondary,
    done: "#9a948c",
  };
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        fontFamily: SANS,
        color: colors[tone],
        padding: "3px 4px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        minWidth: 56,
        justifyContent: "center",
      }}
      title={value ? `Due ${value}` : "Set due date"}
    >
      <span style={{ opacity: value ? 1 : 0.55 }}>{value ? label : "—"}</span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          cursor: "pointer",
          width: "100%",
          height: "100%",
        }}
      />
    </label>
  );
}

function formatDueDate(
  iso: string | null,
  done: boolean,
): { tone: "none" | "overdue" | "today" | "soon" | "future" | "done"; label: string } {
  if (!iso) return { tone: "none", label: "" };
  if (done) return { tone: "done", label: shortDate(iso) };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const due = new Date(y, m - 1, d);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 0) return { tone: "overdue", label: diffDays === 0 ? "Today" : shortDate(iso) };
  if (diffDays === 1) return { tone: "today", label: "Tomorrow" };
  if (diffDays <= 7) return { tone: "today", label: shortDate(iso) };
  if (diffDays <= 14) return { tone: "soon", label: shortDate(iso) };
  return { tone: "future", label: shortDate(iso) };
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/* ========================================================================== */
/* Brain Dump tab                                                             */
/* ========================================================================== */

const OUTCOME_LABEL: Record<BrainDumpOutcome, string> = {
  trash: "Trashed",
  reference: "Reference",
  someday: "Someday/Maybe",
  done_now: "Done",
  delegated: "Delegated",
  project: "Sent to project",
  today: "Today's Big 3",
  backlog: "Future To-Do",
};

const FILTER_LABEL: Record<BrainDumpFilter, string> = {
  inbox: "Inbox",
  reference: "Reference",
  someday: "Someday/Maybe",
  processed: "Processed",
};

function BrainDumpTab({ businesses = [] }: { businesses?: Business[] }) {
  const [entries, setEntries] = useState<BrainDumpEntry[]>([]);
  const [counts, setCounts] = useState<Record<BrainDumpFilter, number>>({
    inbox: 0,
    reference: 0,
    someday: 0,
    processed: 0,
  });
  const [filter, setFilter] = useState<BrainDumpFilter>("inbox");
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const load = async () => {
    try {
      const [rows, drs, projs, inbox, ref, someday, processed] = await Promise.all([
        api<BrainDumpEntry[]>(`/command-center/brain-dump?filter=${filter}`),
        api<DirectReport[]>("/command-center/direct-reports"),
        api<Project[]>("/command-center/projects"),
        api<BrainDumpEntry[]>("/command-center/brain-dump?filter=inbox"),
        api<BrainDumpEntry[]>("/command-center/brain-dump?filter=reference"),
        api<BrainDumpEntry[]>("/command-center/brain-dump?filter=someday"),
        api<BrainDumpEntry[]>("/command-center/brain-dump?filter=processed"),
      ]);
      setEntries(rows);
      setDirectReports(drs);
      setProjects(projs);
      setCounts({
        inbox: inbox.length,
        reference: ref.length,
        someday: someday.length,
        processed: processed.length,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    await api("/command-center/brain-dump", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    setDraft("");
    if (filter !== "inbox") setFilter("inbox");
    else load();
  };

  if (error) return <ErrorBlock message={error} />;

  const filters: BrainDumpFilter[] = ["inbox", "reference", "someday", "processed"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <CardHeading title="Capture" subtitle="⌘+Enter to save" />
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          placeholder="What's on your mind?"
          rows={5}
          style={{
            width: "100%",
            background: C.bg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 6,
            padding: 12,
            fontFamily: SANS,
            fontSize: 14,
            color: C.textPrimary,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            lineHeight: 1.5,
          }}
        />
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={save}
            disabled={!draft.trim()}
            style={{
              background: C.accent,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 18px",
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              cursor: draft.trim() ? "pointer" : "not-allowed",
              opacity: draft.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
      </Card>

      {/* Filter pills + edit toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filters.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  background: active ? C.accent : "transparent",
                  color: active ? "#fff" : C.textPrimary,
                  border: `1px solid ${active ? C.accent : C.cardBorder}`,
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {FILTER_LABEL[f]}
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.8,
                    background: active ? "rgba(255,255,255,0.18)" : "#eee2d4",
                    color: active ? "#fff" : C.textSecondary,
                    padding: "1px 6px",
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontFamily: SANS,
            color: C.textSecondary,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={editMode}
            onChange={(e) => setEditMode(e.target.checked)}
            style={{ accentColor: C.accent }}
          />
          Edit mode
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.length === 0 && (
          <EmptyHint
            text={
              filter === "inbox"
                ? "Inbox zero. Capture above when something pops up."
                : `Nothing in ${FILTER_LABEL[filter].toLowerCase()}.`
            }
          />
        )}
        {entries.map((e) => (
          <BrainDumpRow
            key={e.id}
            entry={e}
            editMode={editMode}
            directReports={directReports}
            projects={projects}
            businesses={businesses}
            onReload={load}
            onUpdate={async (text) => {
              await api(`/command-center/brain-dump/${e.id}`, {
                method: "PATCH",
                body: JSON.stringify({ text }),
              });
              load();
            }}
            onDelete={async () => {
              if (!window.confirm("Delete this entry?")) return;
              await api(`/command-center/brain-dump/${e.id}`, { method: "DELETE" });
              load();
            }}
            onProcess={async (payload) => {
              await api(`/command-center/brain-dump/${e.id}/process`, {
                method: "POST",
                body: JSON.stringify(payload),
              });
              load();
            }}
            onUnprocess={async () => {
              await api(`/command-center/brain-dump/${e.id}/unprocess`, { method: "POST" });
              load();
            }}
          />
        ))}
      </div>
    </div>
  );
}

type ProcessPayload = {
  outcome: BrainDumpOutcome;
  text?: string;
  directReportId?: number;
  projectId?: number;
  ownerDirectReportId?: number | null;
  slot?: number;
};

function BrainDumpRow({
  entry,
  editMode,
  directReports,
  projects,
  businesses,
  onReload,
  onUpdate,
  onDelete,
  onProcess,
  onUnprocess,
}: {
  entry: BrainDumpEntry;
  editMode: boolean;
  directReports: DirectReport[];
  projects: Project[];
  businesses: Business[];
  onReload: () => void | Promise<void>;
  onUpdate: (text: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onProcess: (payload: ProcessPayload) => Promise<void> | void;
  onUnprocess: () => Promise<void> | void;
}) {
  const [text, setText] = useState(entry.text);
  const [processing, setProcessing] = useState(false);
  useEffect(() => setText(entry.text), [entry.text]);
  const ts = new Date(entry.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const isProcessed = entry.outcome != null;
  const handle = async (payload: ProcessPayload) => {
    await onProcess(payload);
    setProcessing(false);
  };
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 6,
        padding: "12px 14px",
        opacity: isProcessed ? 0.78 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: C.textSecondary, letterSpacing: 0.4 }}>{ts}</span>
          {businesses.length > 1 && (
            <BusinessChip
              businesses={businesses}
              currentId={entry.businessId}
              onChange={async (newBizId) => {
                await api(`/command-center/brain-dump/${entry.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ businessId: newBizId }),
                });
                onReload();
              }}
            />
          )}
          {entry.outcome && (
            <span
              style={{
                fontSize: 10,
                fontFamily: SANS,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: C.accent,
                background: C.accentSoft,
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              {OUTCOME_LABEL[entry.outcome]}
            </span>
          )}
        </div>
        {editMode && (
          <div style={{ display: "flex", gap: 8 }}>
            {isProcessed ? (
              <button
                type="button"
                onClick={onUnprocess}
                style={{
                  background: "transparent",
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontFamily: SANS,
                  fontWeight: 600,
                  color: C.textSecondary,
                  cursor: "pointer",
                }}
              >
                Undo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setProcessing((p) => !p)}
                style={{
                  background: processing ? C.cardBorder : C.accent,
                  border: "none",
                  borderRadius: 6,
                  padding: "3px 12px",
                  fontSize: 11,
                  fontFamily: SANS,
                  fontWeight: 600,
                  color: processing ? C.textPrimary : "#fff",
                  cursor: "pointer",
                }}
              >
                {processing ? "Cancel" : "Process"}
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete entry"
              style={{
                background: "transparent",
                border: "none",
                color: C.textSecondary,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() && text !== entry.text && onUpdate(text.trim())}
        rows={Math.max(2, Math.min(8, text.split("\n").length))}
        readOnly={!editMode}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: SANS,
          fontSize: 14,
          color: C.textPrimary,
          resize: editMode ? "vertical" : "none",
          padding: 0,
          boxSizing: "border-box",
          lineHeight: 1.55,
          cursor: editMode ? "text" : "default",
        }}
      />
      {processing && (
        <ProcessPanel
          entryText={text}
          directReports={directReports}
          projects={projects}
          onSubmit={handle}
        />
      )}
    </div>
  );
}

function ProcessPanel({
  entryText,
  directReports,
  projects,
  onSubmit,
}: {
  entryText: string;
  directReports: DirectReport[];
  projects: Project[];
  onSubmit: (p: ProcessPayload) => Promise<void> | void;
}) {
  const [actionable, setActionable] = useState<boolean | null>(null);
  const [overrideText, setOverrideText] = useState(entryText);
  useEffect(() => setOverrideText(entryText), [entryText]);

  const send = (payload: ProcessPayload) =>
    onSubmit({ ...payload, text: overrideText.trim() || entryText });

  const pillBtn: CSSProperties = {
    background: "#fff",
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontFamily: SANS,
    fontWeight: 600,
    color: C.textPrimary,
    cursor: "pointer",
  };
  const sectionLabel: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.textSecondary,
    marginBottom: 6,
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: "#f8fafc",
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div style={sectionLabel}>Task text (optional rewrite)</div>
        <input
          type="text"
          value={overrideText}
          onChange={(e) => setOverrideText(e.target.value)}
          style={{
            width: "100%",
            background: "#fff",
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 6,
            padding: "6px 10px",
            fontFamily: SANS,
            fontSize: 13,
            color: C.textPrimary,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div>
        <div style={sectionLabel}>1. Is it actionable?</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActionable(true)}
            style={{
              ...pillBtn,
              background: actionable === true ? C.accent : "#fff",
              color: actionable === true ? "#fff" : C.textPrimary,
              borderColor: actionable === true ? C.accent : C.cardBorder,
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setActionable(false)}
            style={{
              ...pillBtn,
              background: actionable === false ? C.accent : "#fff",
              color: actionable === false ? "#fff" : C.textPrimary,
              borderColor: actionable === false ? C.accent : C.cardBorder,
            }}
          >
            No
          </button>
        </div>
      </div>

      {actionable === false && (
        <div>
          <div style={sectionLabel}>2. Where does it go?</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" style={pillBtn} onClick={() => send({ outcome: "trash" })}>
              Trash
            </button>
            <button type="button" style={pillBtn} onClick={() => send({ outcome: "reference" })}>
              Reference
            </button>
            <button type="button" style={pillBtn} onClick={() => send({ outcome: "someday" })}>
              Someday/Maybe
            </button>
          </div>
        </div>
      )}

      {actionable === true && (
        <div>
          <div style={sectionLabel}>2. What's the next action?</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                style={pillBtn}
                onClick={() => send({ outcome: "done_now" })}
                title="Under 2 minutes — done and archived"
              >
                Do it now (&lt; 2 min)
              </button>
            </div>

            <DelegateRow directReports={directReports} pillBtn={pillBtn} onPick={(id) => send({ outcome: "delegated", directReportId: id })} />

            <ProjectRow
              projects={projects}
              directReports={directReports}
              pillBtn={pillBtn}
              onPick={(projectId, ownerId) =>
                send({ outcome: "project", projectId, ownerDirectReportId: ownerId })
              }
            />

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: SANS }}>
                Today's Big 3 →
              </span>
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  style={pillBtn}
                  onClick={() => send({ outcome: "today", slot: s })}
                >
                  Slot {s}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" style={pillBtn} onClick={() => send({ outcome: "backlog" })}>
                → Future To-Do
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DelegateRow({
  directReports,
  pillBtn,
  onPick,
}: {
  directReports: DirectReport[];
  pillBtn: CSSProperties;
  onPick: (directReportId: number) => void;
}) {
  if (directReports.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: SANS }}>
        Delegate to →
      </span>
      {directReports.map((dr) => (
        <button key={dr.id} type="button" style={pillBtn} onClick={() => onPick(dr.id)}>
          {dr.name}
        </button>
      ))}
    </div>
  );
}

function ProjectRow({
  projects,
  directReports,
  pillBtn,
  onPick,
}: {
  projects: Project[];
  directReports: DirectReport[];
  pillBtn: CSSProperties;
  onPick: (projectId: number, ownerDirectReportId: number | null) => void;
}) {
  const [projectId, setProjectId] = useState<number | "">("");
  const [ownerId, setOwnerId] = useState<number | "">("");
  if (projects.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: SANS }}>
        Send to project →
      </span>
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
        style={{
          fontFamily: SANS,
          fontSize: 12,
          padding: "4px 8px",
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 6,
          background: "#fff",
          color: C.textPrimary,
        }}
      >
        <option value="">Pick project…</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
        style={{
          fontFamily: SANS,
          fontSize: 12,
          padding: "4px 8px",
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 6,
          background: "#fff",
          color: C.textPrimary,
        }}
      >
        <option value="">Unassigned</option>
        {directReports.map((dr) => (
          <option key={dr.id} value={dr.id}>
            {dr.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        style={{ ...pillBtn, background: C.accent, color: "#fff", borderColor: C.accent }}
        disabled={projectId === ""}
        onClick={() => projectId !== "" && onPick(projectId, ownerId === "" ? null : ownerId)}
      >
        Add
      </button>
    </div>
  );
}

/* ========================================================================== */
/* Tiny shared bits                                                           */
/* ========================================================================== */

const inputStyle: CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: SANS,
  fontSize: 14,
  color: C.textPrimary,
  padding: "4px 0",
  minWidth: 0,
};

const smallInput: CSSProperties = {
  border: `1px solid ${C.cardBorder}`,
  outline: "none",
  background: "#fff",
  fontFamily: SANS,
  fontSize: 13,
  color: C.textPrimary,
  padding: "6px 8px",
  borderRadius: 6,
  minWidth: 0,
};

const ghostBtn: CSSProperties = {
  background: "transparent",
  border: `1px solid ${C.cardBorder}`,
  color: C.textSecondary,
  borderRadius: 6,
  padding: "6px 12px",
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  background: C.accent,
  border: "none",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 14px",
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 6,
        padding: "20px 22px",
      }}
    >
      {children}
    </div>
  );
}

function CardHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: SERIF,
          fontSize: 18,
          fontWeight: 600,
          color: C.textPrimary,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            color: C.textSecondary,
            letterSpacing: 0.3,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: `1px dashed ${C.cardBorder}`,
        color: C.textSecondary,
        padding: "12px",
        borderRadius: 6,
        fontFamily: SANS,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.color = C.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.cardBorder;
        e.currentTarget.style.color = C.textSecondary;
      }}
    >
      {label}
    </button>
  );
}

function EmptyHint({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div
      style={{
        color: C.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
        padding: compact ? "6px 0" : "8px 0",
      }}
    >
      {text}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "#fdecea",
        border: "1px solid #f1b9b1",
        color: "#7a1f12",
        padding: "12px 14px",
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

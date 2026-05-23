import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

type ParentType = "life_area" | "direct_report" | "project";
type ProjectStatus = "active" | "on_hold" | "complete";

type Top3Row = { id: number; slot: number; text: string; done: boolean; date: string };
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
  why: string[];
  howIPreserve: string[];
  feelsLike: string[];
};
type LifeAreaGoal = {
  id: number;
  lifeAreaId: number;
  goalType: string;
  text: string;
  status: string;
  nextSteps: string;
  sortOrder: number;
};
type TaskStatus = "not_started" | "in_progress" | "completed";
type Task = {
  id: number;
  parentType: ParentType;
  parentId: number;
  sectionId: number | null;
  ownerDirectReportId: number | null;
  text: string;
  done: boolean;
  status: TaskStatus;
  dueDate: string | null;
  sortOrder: number;
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
type Overview = {
  top3: Top3Row[];
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

type TabId = "overview" | "direct-reports" | "projects" | "life-areas" | "brain-dump";

/* ========================================================================== */
/* Design tokens                                                              */
/* ========================================================================== */

const C = {
  bg: "#f4f1ec",
  card: "#ffffff",
  cardBorder: "#e6dfd4",
  header: "#2a2520",
  headerText: "#f4f1ec",
  textPrimary: "#2a2520",
  textSecondary: "#6b6258",
  accent: "#6b1d2a",
  accentSoft: "#f0e6e8",
  divider: "#e6dfd4",
  statusActive: "#5b8a5a",
  statusHold: "#c8a14a",
  statusComplete: "#9a948c",
  inputFocus: "#cbb98a",
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
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-business-id": String(currentBusinessId),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ========================================================================== */
/* Main page                                                                  */
/* ========================================================================== */

export function CommandCenter() {
  const [tab, setTab] = useState<TabId>(() => {
    try {
      return (localStorage.getItem("cc-tab") as TabId) || "overview";
    } catch {
      return "overview";
    }
  });
  const [businessId, setBusinessId] = useBusiness();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  useEffect(() => {
    api<Business[]>("/businesses").then(setBusinesses).catch(() => setBusinesses([]));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cc-tab", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

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

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "direct-reports", label: "Direct Reports" },
    { id: "projects", label: "Projects" },
    { id: "life-areas", label: "Life Areas" },
    { id: "brain-dump", label: "Brain Dump" },
  ];

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

        {/* Tabs */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 4,
            overflowX: "auto",
            paddingBottom: 0,
          }}
        >
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: active ? C.headerText : "rgba(244,241,236,0.55)",
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderBottom: active
                    ? `2px solid ${C.headerText}`
                    : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body — keyed by business so all tabs remount & refetch on switch */}
      <div
        key={businessId}
        style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 80px" }}
      >
        {tab === "overview" && <OverviewTab />}
        {tab === "direct-reports" && <DirectReportsTab businesses={businesses} />}
        {tab === "projects" && <ProjectsTab businesses={businesses} />}
        {tab === "life-areas" && <LifeAreasTab businesses={businesses} />}
        {tab === "brain-dump" && <BrainDumpTab businesses={businesses} />}

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

function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setData(await api<Overview>("/command-center/overview"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (error) return <ErrorBlock message={error} />;
  if (!data) return <div style={{ color: C.textSecondary }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <Top3Card top3={data.top3} onChange={reload} />
      <OverviewSection title="Direct Reports">
        <DirectReportsTab />
      </OverviewSection>
      <OverviewSection title="Projects">
        <ProjectsTab />
      </OverviewSection>
      <OverviewSection title="Life Areas">
        <LifeAreasTab />
      </OverviewSection>
      <OverviewSection title="Brain Dump">
        <BrainDumpTab />
      </OverviewSection>
    </div>
  );
}

function OverviewSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const storageKey = `cc-overview-section:${title}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v === null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, storageKey]);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${C.divider}`,
          padding: "8px 2px",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: SANS,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: C.textSecondary,
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 120ms ease",
            display: "inline-block",
            width: 10,
            lineHeight: 1,
          }}
        >
          ▼
        </span>
        <span
          style={{
            fontFamily: SERIF,
            fontSize: 18,
            fontWeight: 600,
            color: C.textPrimary,
            letterSpacing: 0.1,
          }}
        >
          {title}
        </span>
      </button>
      {open && <div style={{ paddingTop: 14 }}>{children}</div>}
    </section>
  );
}

function Top3Card({ top3, onChange }: { top3: Top3Row[]; onChange: () => void }) {
  const slots = [1, 2, 3].map((slot) => top3.find((r) => r.slot === slot) ?? null);

  return (
    <Card>
      <CardHeading title="Today's Top 3" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {slots.map((row, idx) => (
          <Top3Row
            key={idx}
            slot={idx + 1}
            initial={row?.text ?? ""}
            done={row?.done ?? false}
            onSave={async (text) => {
              await api(`/command-center/top3/${idx + 1}`, {
                method: "PUT",
                body: JSON.stringify({ text }),
              });
              onChange();
            }}
            onToggleDone={async (done) => {
              await api(`/command-center/top3/${idx + 1}`, {
                method: "PUT",
                body: JSON.stringify({ done }),
              });
              onChange();
            }}
          />
        ))}
      </div>
    </Card>
  );
}

function Top3Row({
  slot,
  initial,
  done,
  onSave,
  onToggleDone,
}: {
  slot: number;
  initial: string;
  done: boolean;
  onSave: (text: string) => Promise<void>;
  onToggleDone: (done: boolean) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const hasText = value.trim().length > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        type="button"
        onClick={() => hasText && onToggleDone(!done)}
        disabled={!hasText}
        title={done ? "Mark as not done" : "Mark as done"}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: done ? "#1f6a3f" : C.accent,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0,
          border: "none",
          cursor: hasText ? "pointer" : "default",
          padding: 0,
        }}
      >
        {done ? "✓" : slot}
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        placeholder="What's the one thing…"
        style={{
          ...inputStyle,
          textDecoration: done ? "line-through" : "none",
          color: done ? C.textSecondary : C.textPrimary,
        }}
      />
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
  const [editing, setEditing] = useState(false);
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
    patch: Partial<Pick<LifeArea, "identity" | "why" | "howIPreserve" | "feelsLike">>,
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
    { key: "identity"     as const, title: "Identity",          items: area.identity     ?? [] },
    { key: "why"          as const, title: "Why",               items: area.why          ?? [] },
    { key: "howIPreserve" as const, title: "How I Preserve It", items: area.howIPreserve ?? [] },
    { key: "feelsLike"    as const, title: "What It Feels Like",items: area.feelsLike    ?? [] },
  ];
  // In view-mode, hide empty About panels so the card stays clean.
  const visibleAbout = editing
    ? aboutFields
    : aboutFields.filter((f) => f.items.some((it) => it.trim().length > 0));

  const goalsByType = new Map<string, LifeAreaGoal[]>();
  for (const g of goals) {
    const arr = goalsByType.get(g.goalType) ?? [];
    arr.push(g);
    goalsByType.set(g.goalType, arr);
  }
  const visibleGoalTypes = editing
    ? LIFE_AREA_GOAL_TYPES
    : LIFE_AREA_GOAL_TYPES.filter((gt) => (goalsByType.get(gt.key)?.length ?? 0) > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          style={{
            background: editing ? C.accent : "transparent",
            color: editing ? C.headerText : C.textSecondary,
            border: `1px solid ${editing ? C.accent : C.cardBorder}`,
            borderRadius: 4,
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.6,
            padding: "3px 10px",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {visibleAbout.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {visibleAbout.map((f) => (
            <LifeAreaAboutList
              key={f.key}
              title={f.title}
              items={f.items}
              editing={editing}
              onChange={(next) => saveAbout({ [f.key]: next } as Partial<LifeArea>)}
            />
          ))}
        </div>
      )}

      {goalsLoaded && visibleGoalTypes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visibleGoalTypes.map((gt) => (
            <LifeAreaGoalsBlock
              key={gt.key}
              title={gt.title}
              goals={goalsByType.get(gt.key) ?? []}
              editing={editing}
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
  editing,
  onChange,
}: {
  title: string;
  items: string[];
  editing: boolean;
  onChange: (next: string[]) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<string[]>(items);
  // Re-sync local draft when the parent's array changes (post-save reload).
  useEffect(() => setDraft(items), [items.join("\u0001")]);
  const commit = (next: string[]) => {
    setDraft(next);
    if (JSON.stringify(next) !== JSON.stringify(items)) onChange(next);
  };
  const showItems = editing ? draft : draft.filter((it) => it.trim().length > 0);
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 6,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: C.textSecondary,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {showItems.length === 0 && !editing ? (
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.textSecondary, fontStyle: "italic" }}>
          —
        </div>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {(editing ? draft : showItems).map((it, idx) => (
            <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span style={{ color: C.textSecondary, lineHeight: 1.3, marginTop: 1 }}>•</span>
              {editing ? (
                <input
                  type="text"
                  value={draft[idx] ?? ""}
                  onChange={(e) => {
                    const next = [...draft];
                    next[idx] = e.target.value;
                    setDraft(next);
                  }}
                  onBlur={() => commit(draft)}
                  style={{
                    ...inputStyle,
                    fontSize: 13,
                    padding: "2px 6px",
                    background: C.card,
                    border: `1px solid ${C.cardBorder}`,
                    borderRadius: 4,
                  }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    color: C.textPrimary,
                    lineHeight: 1.4,
                    flex: 1,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {it}
                </span>
              )}
              {editing && (
                <button
                  type="button"
                  onClick={() => commit(draft.filter((_, i) => i !== idx))}
                  aria-label="Remove"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.textSecondary,
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <button
          type="button"
          onClick={() => commit([...draft, ""])}
          style={{
            marginTop: 6,
            background: "transparent",
            border: "none",
            color: C.accent,
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          + Add
        </button>
      )}
    </div>
  );
}

function LifeAreaGoalsBlock({
  title,
  goals,
  editing,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string;
  goals: LifeAreaGoal[];
  editing: boolean;
  onAdd: () => void | Promise<void>;
  onUpdate: (id: number, patch: Partial<LifeAreaGoal>) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            color: C.textPrimary,
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>
        <span style={{ flex: 1 }} />
        {editing && (
          <button
            type="button"
            onClick={onAdd}
            style={{
              background: "transparent",
              border: `1px dashed ${C.cardBorder}`,
              borderRadius: 4,
              color: C.accent,
              fontFamily: SANS,
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              cursor: "pointer",
            }}
          >
            + Add goal
          </button>
        )}
      </div>
      {goals.length === 0 ? (
        editing ? (
          <div style={{ fontFamily: SANS, fontSize: 12, color: C.textSecondary, fontStyle: "italic" }}>
            No goals yet.
          </div>
        ) : null
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {goals.map((g) => (
            <LifeAreaGoalRow
              key={g.id}
              goal={g}
              editing={editing}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LifeAreaGoalRow({
  goal,
  editing,
  onUpdate,
  onDelete,
}: {
  goal: LifeAreaGoal;
  editing: boolean;
  onUpdate: (id: number, patch: Partial<LifeAreaGoal>) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const [text, setText] = useState(goal.text);
  const [nextSteps, setNextSteps] = useState(goal.nextSteps);
  useEffect(() => setText(goal.text), [goal.text]);
  useEffect(() => setNextSteps(goal.nextSteps), [goal.nextSteps]);
  const statusOpt =
    LIFE_AREA_GOAL_STATUSES.find((o) => o.key === goal.status) ?? LIFE_AREA_GOAL_STATUSES[0];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: editing ? "1fr 140px 1fr 22px" : "1fr 130px 1fr",
        gap: 8,
        alignItems: "start",
        padding: "6px 8px",
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 4,
      }}
    >
      {editing ? (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== goal.text && onUpdate(goal.id, { text })}
          style={{
            ...inputStyle,
            fontSize: 13,
            padding: "2px 6px",
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 4,
            background: C.bg,
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 13,
            color: C.textPrimary,
            lineHeight: 1.4,
            whiteSpace: "pre-wrap",
          }}
        >
          {goal.text}
        </div>
      )}
      {editing ? (
        <select
          value={goal.status}
          onChange={(e) => onUpdate(goal.id, { status: e.target.value })}
          style={{
            fontFamily: SANS,
            fontSize: 12,
            padding: "3px 6px",
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 4,
            background: C.card,
            color: C.textPrimary,
          }}
        >
          {LIFE_AREA_GOAL_STATUSES.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <span
          style={{
            justifySelf: "start",
            background: statusOpt.color,
            color: "#fff",
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            padding: "2px 8px",
            borderRadius: 10,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {statusOpt.label}
        </span>
      )}
      {editing ? (
        <textarea
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          onBlur={() => nextSteps !== goal.nextSteps && onUpdate(goal.id, { nextSteps })}
          placeholder="Next steps…"
          rows={Math.max(1, nextSteps.split("\n").length)}
          style={{
            ...inputStyle,
            fontSize: 12,
            padding: "2px 6px",
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 4,
            background: C.bg,
            resize: "none",
          }}
        />
      ) : nextSteps ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 12,
            color: C.textSecondary,
            whiteSpace: "pre-wrap",
            lineHeight: 1.4,
          }}
        >
          {nextSteps}
        </div>
      ) : (
        <div />
      )}
      {editing && (
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          aria-label="Delete goal"
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
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
  };

  useEffect(() => {
    if (!collapsed && !loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

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
        <div style={{ borderTop: `1px solid ${C.divider}`, padding: "10px 16px 14px" }}>
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
  const showOwnerColumn = parentType === "project";
  const gridCols = showOwnerColumn ? "1fr 140px 132px 132px" : GRID_COLS;
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
            overflow: "hidden",
            background: C.card,
          }}
        >
          {/* Column header */}
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
              Due date
            </div>
            <div style={{ padding: "7px 12px", textAlign: "center" }}>Status</div>
          </div>

          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              gridCols={gridCols}
              showOwnerColumn={showOwnerColumn}
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
                  placeholder="Task name — press Enter to save"
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
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const GRID_COLS = "1fr 132px 132px";

const STATUS_OPTIONS: { value: TaskStatus; label: string; bg: string; fg: string }[] = [
  { value: "not_started", label: "Not started", bg: "#ece8df", fg: "#5a544a" },
  { value: "in_progress", label: "In progress", bg: "#fdf4d3", fg: "#7a5b00" },
  { value: "completed", label: "Completed", bg: "#cfead8", fg: "#1f6a3f" },
];

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
        {STATUS_OPTIONS.map((o) => (
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
  gridCols,
  showOwnerColumn,
  directReports,
  originLabel,
  onUpdate,
  onDelete,
}: {
  task: Task;
  gridCols: string;
  showOwnerColumn: boolean;
  directReports: DirectReport[];
  originLabel: string | null;
  onUpdate: (patch: Partial<Task>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [text, setText] = useState(task.text);
  const [hover, setHover] = useState(false);
  useEffect(() => setText(task.text), [task.text]);

  const due = task.dueDate;
  const dueInfo = formatDueDate(due, task.done);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
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
            justifyContent: "center",
            padding: "6px 8px",
            borderRight: `1px solid ${C.divider}`,
          }}
        >
          <OwnerPicker
            value={task.ownerDirectReportId}
            options={directReports}
            onChange={(next) => onUpdate({ ownerDirectReportId: next })}
          />
        </div>
      )}
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
          justifyContent: "center",
          padding: "6px 8px",
        }}
      >
        <StatusPill
          status={task.status}
          onChange={(next) => onUpdate({ status: next })}
        />
      </div>
    </div>
  );
}

function OwnerPicker({
  value,
  options,
  onChange,
}: {
  value: number | null;
  options: DirectReport[];
  onChange: (next: number | null) => void;
}) {
  const current = value != null ? options.find((o) => o.id === value) : null;
  const label = current?.name ?? "Unassigned";
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontFamily: SANS,
        color: current ? C.textPrimary : C.textSecondary,
        background: current ? "#eef2f7" : "transparent",
        padding: "3px 10px",
        borderRadius: 10,
        cursor: "pointer",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={current ? `Owner: ${label}` : "Assign owner"}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : parseInt(v, 10));
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
      </select>
    </label>
  );
}

function AsanaCheck({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  const ring = done ? "#1f8a55" : "#c8c2b6";
  const fill = done ? "#1f8a55" : "#eeeae1";
  const checkColor = done ? "#fff" : "#9a948c";
  return (
    <button
      type="button"
      onClick={onToggle}
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
  const colors: Record<typeof tone, { fg: string; bg: string }> = {
    none: { fg: C.textSecondary, bg: "transparent" },
    overdue: { fg: "#b1361e", bg: "#fdecea" },
    today: { fg: "#7a5b00", bg: "#fdf4d3" },
    soon: { fg: "#4a4036", bg: "#f1ebdf" },
    future: { fg: C.textSecondary, bg: "transparent" },
    done: { fg: "#9a948c", bg: "transparent" },
  };
  const c = colors[tone];
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontFamily: SANS,
        color: c.fg,
        background: c.bg,
        padding: value ? "3px 8px" : "3px 4px",
        borderRadius: 10,
        cursor: "pointer",
        whiteSpace: "nowrap",
        minWidth: 56,
        justifyContent: "center",
      }}
      title={value ? `Due ${value}` : "Set due date"}
    >
      <span style={{ opacity: value ? 1 : 0.55 }}>{value ? label : "📅"}</span>
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
  if (diffDays < 0) return { tone: "overdue", label: shortDate(iso) };
  if (diffDays === 0) return { tone: "today", label: "Today" };
  if (diffDays === 1) return { tone: "soon", label: "Tomorrow" };
  if (diffDays <= 7) return { tone: "soon", label: shortDate(iso) };
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
        background: "#faf7f1",
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

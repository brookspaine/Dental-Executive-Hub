import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

type ParentType = "life_area" | "direct_report" | "project";
type ProjectStatus = "active" | "on_hold" | "complete";

type Top3Row = { id: number; slot: number; text: string; date: string };
type DirectReport = { id: number; name: string; sortOrder: number; collapsed: boolean };
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
};
type Task = {
  id: number;
  parentType: ParentType;
  parentId: number;
  text: string;
  done: boolean;
  sortOrder: number;
};
type BrainDumpEntry = {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
};
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

const SERIF = '"Playfair Display", Georgia, serif';
const SANS = '"DM Sans", -apple-system, system-ui, sans-serif';

/* ========================================================================== */
/* API client                                                                 */
/* ========================================================================== */

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
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
            Command Center
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

      {/* Body */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 80px" }}>
        {tab === "overview" && <OverviewTab />}
        {tab === "direct-reports" && <DirectReportsTab />}
        {tab === "projects" && <ProjectsTab />}
        {tab === "life-areas" && <LifeAreasTab />}
        {tab === "brain-dump" && <BrainDumpTab />}
      </div>
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
      <CardHeading title="Today's Top 3" subtitle="Resets daily at midnight" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {slots.map((row, idx) => (
          <Top3Row
            key={idx}
            slot={idx + 1}
            initial={row?.text ?? ""}
            onSave={async (text) => {
              await api(`/command-center/top3/${idx + 1}`, {
                method: "PUT",
                body: JSON.stringify({ text }),
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
  onSave,
}: {
  slot: number;
  initial: string;
  onSave: (text: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: C.accent,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SERIF,
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {slot}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        placeholder="What's the one thing…"
        style={inputStyle}
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

function DirectReportsTab() {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {people.map((p) => (
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

function ProjectsTab() {
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

function LifeAreasTab() {
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
/* Reusable section accordion with task list                                  */
/* ========================================================================== */

function SectionAccordion({
  parentType,
  parentId,
  name,
  collapsed,
  accentColor,
  headerRight,
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
  onRename: (name: string) => Promise<void> | void;
  onToggle: (collapsed: boolean) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [taskDraft, setTaskDraft] = useState("");

  useEffect(() => setNameDraft(name), [name]);

  const loadTasks = async () => {
    const rows = await api<Task[]>(
      `/command-center/tasks?parentType=${parentType}&parentId=${parentId}`,
    );
    setTasks(rows);
    setLoaded(true);
  };

  useEffect(() => {
    if (!collapsed && !loaded) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const openCount = tasks.filter((t) => !t.done).length;
  const totalCount = tasks.length;

  const addTask = async () => {
    if (!taskDraft.trim()) return;
    await api("/command-center/tasks", {
      method: "POST",
      body: JSON.stringify({ parentType, parentId, text: taskDraft.trim() }),
    });
    setTaskDraft("");
    loadTasks();
  };

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
          {parentType === "life_area"
            ? `${tasks.filter((t) => t.done).length}/${totalCount}`
            : openCount}
        </span>

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
        <div style={{ borderTop: `1px solid ${C.divider}`, padding: "8px 16px 14px" }}>
          {!loaded && <div style={{ fontSize: 13, color: C.textSecondary }}>Loading…</div>}
          {loaded && tasks.length === 0 && (
            <EmptyHint text="No tasks yet." compact />
          )}
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpdate={async (patch) => {
                await api(`/command-center/tasks/${task.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(patch),
                });
                loadTasks();
              }}
              onDelete={async () => {
                await api(`/command-center/tasks/${task.id}`, { method: "DELETE" });
                loadTasks();
              }}
            />
          ))}

          {/* Add task row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTask();
            }}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 6,
              paddingTop: 8,
              borderTop: `1px dashed ${C.divider}`,
            }}
          >
            <span style={{ width: 16, height: 16, flexShrink: 0 }} />
            <input
              type="text"
              value={taskDraft}
              onChange={(e) => setTaskDraft(e.target.value)}
              placeholder="+ Add task"
              style={{ ...inputStyle, fontSize: 14 }}
            />
          </form>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (patch: Partial<Task>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [text, setText] = useState(task.text);
  useEffect(() => setText(task.text), [task.text]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        borderBottom: `1px solid ${C.divider}`,
      }}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onUpdate({ done: e.target.checked })}
        style={{
          width: 16,
          height: 16,
          accentColor: C.accent,
          cursor: "pointer",
          flexShrink: 0,
        }}
      />
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
        }}
      />
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
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ========================================================================== */
/* Brain Dump tab                                                             */
/* ========================================================================== */

function BrainDumpTab() {
  const [entries, setEntries] = useState<BrainDumpEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const load = async () => {
    try {
      setEntries(await api<BrainDumpEntry[]>("/command-center/brain-dump"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    await api("/command-center/brain-dump", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    setDraft("");
    load();
  };

  if (error) return <ErrorBlock message={error} />;

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

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.length === 0 && (
          <EmptyHint text="Nothing dumped yet. Start above." />
        )}
        {entries.map((e) => (
          <BrainDumpRow
            key={e.id}
            entry={e}
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
          />
        ))}
      </div>
    </div>
  );
}

function BrainDumpRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: BrainDumpEntry;
  onUpdate: (text: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [text, setText] = useState(entry.text);
  useEffect(() => setText(entry.text), [entry.text]);
  const ts = new Date(entry.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 6,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 11, color: C.textSecondary, letterSpacing: 0.4 }}>{ts}</span>
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
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() && text !== entry.text && onUpdate(text.trim())}
        rows={Math.max(2, Math.min(8, text.split("\n").length))}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: SANS,
          fontSize: 14,
          color: C.textPrimary,
          resize: "vertical",
          padding: 0,
          boxSizing: "border-box",
          lineHeight: 1.55,
        }}
      />
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

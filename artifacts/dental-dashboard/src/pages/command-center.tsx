import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/* -------------------------------------------------------------------------- */
/* Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type Priority = "high" | "med" | "low";

type Task = {
  id: string;
  text: string;
  priority: Priority;
  dueDate: string;
  assignee: string;
  done: boolean;
  bucketId: string;
};

type Bucket = {
  id: string;
  name: string;
  collapsed: boolean;
};

type CommandCenterState = {
  buckets: Bucket[];
  tasks: Task[];
  dailyTop3: [string | null, string | null, string | null];
  brainDump: string;
};

const STORAGE_KEY = "edge-command-center";

const C = {
  red: "#CC2030",
  navy: "#1B2A4A",
  burgundy: "#6B1D2A",
  bg: "#ffffff",
  sectionBg: "#f6f6f7",
  textPrimary: "#1a1a2e",
  textSecondary: "#4a4a5a",
  divider: "#e6e6ea",
  white: "#ffffff",
  warningBg: "#FFF8E1",
  warningBorder: "#F0C674",
  warningText: "#7A5A00",
} as const;

const FONT_STACK =
  '"Inter", "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const PRIORITY_PILL: Record<Priority, { bg: string; fg: string; label: string }> = {
  high: { bg: "#FCE4E7", fg: "#A0162B", label: "High" },
  med: { bg: "#FFF1D6", fg: "#8A5A00", label: "Med" },
  low: { bg: "#E6EEF7", fg: "#1B2A4A", label: "Low" },
};

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultState(): CommandCenterState {
  return {
    buckets: [
      { id: "edge-buildout", name: "EDGE / Buildout", collapsed: false },
      { id: "urgent-dental", name: "Urgent Dental", collapsed: false },
    ],
    tasks: [],
    dailyTop3: [null, null, null],
    brainDump: "",
  };
}

function loadState(): CommandCenterState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<CommandCenterState>;
    return {
      buckets: parsed.buckets ?? defaultState().buckets,
      tasks: parsed.tasks ?? [],
      dailyTop3:
        (parsed.dailyTop3 as CommandCenterState["dailyTop3"]) ?? [null, null, null],
      brainDump: parsed.brainDump ?? "",
    };
  } catch {
    return defaultState();
  }
}

/* -------------------------------------------------------------------------- */
/* Anthropic API call                                                         */
/* -------------------------------------------------------------------------- */

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

type SuggestedTask = {
  id: string;
  text: string;
  bucket: string;
  reason?: string;
};

async function fetchAiSuggestions(openTasks: Task[]): Promise<SuggestedTask[]> {
  if (!ANTHROPIC_KEY) throw new Error("Missing VITE_ANTHROPIC_API_KEY");

  const taskCorpus = openTasks
    .map((t) => `- id=${t.id} bucket="${t.bucketId}" priority=${t.priority} due=${t.dueDate || "none"} text="${t.text}"`)
    .join("\n");

  const prompt = `You are an executive assistant for a dental CEO. Pick the 3 most impactful tasks for TODAY from the open task list below.

Open tasks:
${taskCorpus || "(none)"}

Respond with ONLY a JSON array of exactly 3 items. Each item must have: id (string, copied from the task list above), text (string), bucket (string), reason (short string, max 12 words). No prose, no markdown fences — just the JSON array.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  const jsonStart = text.indexOf("[");
  const jsonEnd = text.lastIndexOf("]");
  if (jsonStart < 0 || jsonEnd < 0) throw new Error("Model did not return JSON array");
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as SuggestedTask[];
  return parsed.slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function CommandCenter() {
  const [state, setState] = useState<CommandCenterState>(() => loadState());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [brainDumpSavedAt, setBrainDumpSavedAt] = useState<number | null>(null);
  const firstMount = useRef(true);

  // Persist to localStorage on every state change.
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setBrainDumpSavedAt(Date.now());
    } catch {
      // ignore quota errors
    }
  }, [state]);

  /* ---------------- task / bucket mutators ---------------- */

  const addTask = (bucketId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const task: Task = {
      id: uid(),
      text: trimmed,
      priority: "med",
      dueDate: "",
      assignee: "",
      done: false,
      bucketId,
    };
    setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const deleteTask = (id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
      dailyTop3: s.dailyTop3.map((slot) => (slot === id ? null : slot)) as CommandCenterState["dailyTop3"],
    }));
  };

  const toggleBucket = (id: string) => {
    setState((s) => ({
      ...s,
      buckets: s.buckets.map((b) => (b.id === id ? { ...b, collapsed: !b.collapsed } : b)),
    }));
  };

  const addBucket = () => {
    const name = window.prompt("Bucket name?");
    if (!name?.trim()) return;
    setState((s) => ({
      ...s,
      buckets: [...s.buckets, { id: uid(), name: name.trim(), collapsed: false }],
    }));
  };

  const deleteBucket = (id: string) => {
    if (!window.confirm("Delete this bucket and all its tasks?")) return;
    setState((s) => ({
      ...s,
      buckets: s.buckets.filter((b) => b.id !== id),
      tasks: s.tasks.filter((t) => t.bucketId !== id),
      dailyTop3: s.dailyTop3.map((slot) =>
        slot && s.tasks.find((t) => t.id === slot)?.bucketId === id ? null : slot,
      ) as CommandCenterState["dailyTop3"],
    }));
  };

  const clearDailySlot = (idx: 0 | 1 | 2) => {
    setState((s) => {
      const next = [...s.dailyTop3] as CommandCenterState["dailyTop3"];
      next[idx] = null;
      return { ...s, dailyTop3: next };
    });
  };

  /* ---------------- AI Suggest ---------------- */

  const handleAiSuggest = async () => {
    if (!ANTHROPIC_KEY) {
      setAiError("Missing VITE_ANTHROPIC_API_KEY");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const open = state.tasks.filter((t) => !t.done);
      const suggestions = await fetchAiSuggestions(open);
      // Match suggestions back by id, falling back to keeping null if not found.
      const ids = suggestions.map((s) => {
        const found = state.tasks.find((t) => t.id === s.id && !t.done);
        return found ? found.id : null;
      });
      setState((s) => ({
        ...s,
        dailyTop3: [ids[0] ?? null, ids[1] ?? null, ids[2] ?? null],
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI suggest failed");
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------------- derived ---------------- */

  const tasksByBucket = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const b of state.buckets) map.set(b.id, []);
    for (const t of state.tasks) {
      if (!map.has(t.bucketId)) map.set(t.bucketId, []);
      map.get(t.bucketId)!.push(t);
    }
    return map;
  }, [state.tasks, state.buckets]);

  const taskById = useMemo(() => {
    const m = new Map<string, Task>();
    for (const t of state.tasks) m.set(t.id, t);
    return m;
  }, [state.tasks]);

  const bucketName = (bucketId: string) =>
    state.buckets.find((b) => b.id === bucketId)?.name ?? "Unknown";

  /* ---------------- styles ---------------- */

  const pageStyle: CSSProperties = {
    fontFamily: FONT_STACK,
    background: C.bg,
    color: C.textPrimary,
    minHeight: "100%",
  };

  const headerStyle: CSSProperties = {
    background: C.navy,
    color: C.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    height: 56,
  };

  const containerStyle: CSSProperties = {
    maxWidth: 760,
    margin: "0 auto",
    padding: "24px 32px 64px",
  };

  return (
    <div style={pageStyle}>
      {/* Top header bar */}
      <div style={headerStyle}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.2 }}>
          Command Center
        </div>
        <button
          type="button"
          onClick={handleAiSuggest}
          disabled={aiLoading}
          style={{
            background: C.red,
            color: C.white,
            border: "none",
            borderRadius: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: aiLoading ? "wait" : "pointer",
            opacity: aiLoading ? 0.7 : 1,
            fontFamily: FONT_STACK,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.burgundy)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.red)}
        >
          {aiLoading ? "Thinking…" : "✨ AI Suggest"}
        </button>
      </div>

      <div style={containerStyle}>
        {/* Missing-key banner */}
        {!ANTHROPIC_KEY && !bannerDismissed && (
          <div
            style={{
              background: C.warningBg,
              border: `1px solid ${C.warningBorder}`,
              color: C.warningText,
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>
              <strong>VITE_ANTHROPIC_API_KEY</strong> is not set. AI Suggest is disabled
              until you add the key.
            </span>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              style={{
                background: "transparent",
                border: "none",
                color: C.warningText,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {aiError && (
          <div
            style={{
              background: "#FCE4E7",
              border: "1px solid #E5A0AB",
              color: "#7A0F1F",
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {aiError}
          </div>
        )}

        {/* Daily Top 3 */}
        <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: C.textSecondary,
              margin: "0 0 12px",
            }}
          >
            Daily Top 3
          </h2>
          <div style={{ background: C.sectionBg, borderRadius: 8, padding: 12 }}>
            {[0, 1, 2].map((idx) => {
              const taskId = state.dailyTop3[idx];
              const task = taskId ? taskById.get(taskId) : null;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 8px",
                    borderBottom: idx < 2 ? `1px solid ${C.divider}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: C.navy,
                      color: C.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {task ? (
                      <>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: C.textPrimary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {task.text}
                        </div>
                        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                          {bucketName(task.bucketId)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 14, color: C.textSecondary, fontStyle: "italic" }}>
                        Empty — use AI Suggest to fill
                      </div>
                    )}
                  </div>
                  {task && (
                    <button
                      type="button"
                      onClick={() => clearDailySlot(idx as 0 | 1 | 2)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: C.textSecondary,
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "4px 8px",
                        fontFamily: FONT_STACK,
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Buckets */}
        {state.buckets.map((bucket) => {
          const items = tasksByBucket.get(bucket.id) ?? [];
          const openCount = items.filter((t) => !t.done).length;
          return (
            <BucketSection
              key={bucket.id}
              bucket={bucket}
              tasks={items}
              openCount={openCount}
              onToggle={() => toggleBucket(bucket.id)}
              onDelete={() => deleteBucket(bucket.id)}
              onAddTask={(text) => addTask(bucket.id, text)}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          );
        })}

        {/* Add bucket */}
        <div style={{ margin: "8px 0 32px" }}>
          <button
            type="button"
            onClick={addBucket}
            style={{
              background: "transparent",
              border: `1px dashed ${C.divider}`,
              color: C.textSecondary,
              padding: "10px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              width: "100%",
              fontFamily: FONT_STACK,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.navy;
              e.currentTarget.style.color = C.navy;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.divider;
              e.currentTarget.style.color = C.textSecondary;
            }}
          >
            + Add Bucket
          </button>
        </div>

        {/* Brain Dump */}
        <BrainDumpSection
          value={state.brainDump}
          savedAt={brainDumpSavedAt}
          onChange={(brainDump) => setState((s) => ({ ...s, brainDump }))}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bucket section                                                             */
/* -------------------------------------------------------------------------- */

function BucketSection({
  bucket,
  tasks,
  openCount,
  onToggle,
  onDelete,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: {
  bucket: Bucket;
  tasks: Task[];
  openCount: number;
  onToggle: () => void;
  onDelete: () => void;
  onAddTask: (text: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <section style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 4px",
          borderBottom: `1px solid ${C.divider}`,
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <span
          style={{
            display: "inline-block",
            transform: bucket.collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 120ms ease",
            fontSize: 11,
            color: C.textSecondary,
            width: 12,
          }}
        >
          ▼
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: C.textPrimary,
            flex: 1,
          }}
        >
          {bucket.name}
        </h3>
        <span
          style={{
            background: C.sectionBg,
            color: C.textSecondary,
            fontSize: 12,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 10,
          }}
        >
          {openCount}
        </span>
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
            padding: "2px 6px",
            fontFamily: FONT_STACK,
          }}
        >
          Delete
        </button>
      </div>

      {!bucket.collapsed && (
        <>
          <div>
            {tasks.length === 0 && (
              <div
                style={{
                  padding: "12px 8px",
                  fontSize: 13,
                  color: C.textSecondary,
                  fontStyle: "italic",
                }}
              >
                No tasks yet.
              </div>
            )}
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onUpdate={(patch) => onUpdateTask(task.id, patch)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </div>

          {/* Add-task row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddTask(draft);
              setDraft("");
            }}
            style={{
              display: "flex",
              gap: 8,
              padding: "10px 8px",
              borderBottom: `1px solid ${C.divider}`,
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="+ Add task"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: C.textPrimary,
                fontFamily: FONT_STACK,
                padding: "4px 0",
              }}
            />
          </form>
        </>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Task row                                                                   */
/* -------------------------------------------------------------------------- */

function TaskRow({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const pill = PRIORITY_PILL[task.priority];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 8px",
        borderBottom: `1px solid ${C.divider}`,
        opacity: task.done ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onUpdate({ done: e.target.checked })}
        style={{ width: 16, height: 16, accentColor: C.red, cursor: "pointer", flexShrink: 0 }}
      />
      <input
        type="text"
        value={task.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 14,
          color: C.textPrimary,
          textDecoration: task.done ? "line-through" : "none",
          fontFamily: FONT_STACK,
        }}
      />
      <select
        value={task.priority}
        onChange={(e) => onUpdate({ priority: e.target.value as Priority })}
        aria-label="Priority"
        style={{
          background: pill.bg,
          color: pill.fg,
          border: "none",
          borderRadius: 10,
          padding: "3px 8px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: FONT_STACK,
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        <option value="high">High</option>
        <option value="med">Med</option>
        <option value="low">Low</option>
      </select>
      <input
        type="date"
        value={task.dueDate}
        onChange={(e) => onUpdate({ dueDate: e.target.value })}
        aria-label="Due date"
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 12,
          color: C.textSecondary,
          fontFamily: FONT_STACK,
          width: 130,
        }}
      />
      <input
        type="text"
        value={task.assignee}
        onChange={(e) => onUpdate({ assignee: e.target.value })}
        placeholder="Assignee"
        aria-label="Assignee"
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 13,
          color: C.textSecondary,
          fontFamily: FONT_STACK,
          width: 100,
          textAlign: "right",
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
          fontSize: 14,
          padding: "2px 6px",
        }}
      >
        ×
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Brain dump                                                                 */
/* -------------------------------------------------------------------------- */

function BrainDumpSection({
  value,
  savedAt,
  onChange,
}: {
  value: string;
  savedAt: number | null;
  onChange: (v: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (savedAt === null) return;
    setShowSaved(true);
    const t = window.setTimeout(() => setShowSaved(false), 1200);
    return () => window.clearTimeout(t);
  }, [savedAt]);

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 4px",
          borderBottom: `1px solid ${C.divider}`,
          cursor: "pointer",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span
          style={{
            display: "inline-block",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 120ms ease",
            fontSize: 11,
            color: C.textSecondary,
            width: 12,
          }}
        >
          ▼
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: C.textPrimary,
            flex: 1,
          }}
        >
          Brain Dump
        </h3>
        {showSaved && (
          <span style={{ fontSize: 11, color: C.textSecondary }}>Saved</span>
        )}
      </div>
      {!collapsed && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Capture anything — thoughts, ideas, follow-ups…"
          rows={10}
          style={{
            width: "100%",
            marginTop: 10,
            background: C.sectionBg,
            border: "none",
            borderRadius: 8,
            padding: 14,
            fontSize: 14,
            color: C.textPrimary,
            fontFamily: FONT_STACK,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            lineHeight: 1.5,
          }}
        />
      )}
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MemberAvatar } from "@/components/member-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Lock, Trash2, Check } from "lucide-react";

type SectionType =
  | "iceBreaker"
  | "winsShoutouts"
  | "scoreCard"
  | "desiredFuture"
  | "closeTheLoop"
  | "keyTopics"
  | "actionItems";

const SECTIONS: Array<{
  key: string;
  label: string;
  description: string;
  type: SectionType;
}> = [
  {
    key: "iceBreaker",
    label: "Ice Breaker",
    description:
      "Kick things off with a quick, fun question or activity to get everyone talking. It's a simple way to start the meeting on a positive note and build team connection.",
    type: "iceBreaker",
  },
  {
    key: "winsShoutouts",
    label: "Wins and Shoutouts",
    description:
      "Celebrate recent wins and recognize team members who went above and beyond.",
    type: "winsShoutouts",
  },
  {
    key: "scoreCard",
    label: "Score Card",
    description:
      "Review the key metrics that tell you whether the business is healthy this week.",
    type: "scoreCard",
  },
  {
    key: "desiredFuture",
    label: "Desired Future",
    description:
      "Check progress against your long-term Desired Future goal and current pace.",
    type: "desiredFuture",
  },
  {
    key: "closeTheLoop",
    label: "Close the Loop",
    description:
      "Revisit Action Items and Key Topics from last week to confirm completion.",
    type: "closeTheLoop",
  },
  {
    key: "keyTopics",
    label: "Key Topics",
    description:
      "Surface and work through the most important issues facing the team.",
    type: "keyTopics",
  },
  {
    key: "actionItems",
    label: "Action Items",
    description: "Capture the commitments coming out of this meeting.",
    type: "actionItems",
  },
];

type Agenda = {
  id: number;
  seriesId: number;
  name: string;
  sectionData: Record<string, unknown>;
};

type KeyTopic = {
  id: number;
  agendaId: number;
  coreIssue: string;
  owner: string | null;
  notes: string | null;
  resolved: boolean;
};

type ActionItem = {
  source: "meeting" | "seatTask";
  id: number;
  item: string;
  owner: string | null;
  dueDate: string | null;
  isDailyTop3: boolean;
  notes: string | null;
  completed: boolean;
  seatTitle: string | null;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function MeetingsAgenda() {
  const params = useParams<{ id: string }>();
  const agendaId = Number(params.id);
  const [section, setSection] = useState<string>("iceBreaker");

  const { data: agenda } = useQuery<Agenda>({
    queryKey: [`/api/meeting-agendas/${agendaId}`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const current = SECTIONS.find((s) => s.key === section)!;
  const raw = agenda?.sectionData?.[current.key];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        href={
          agenda
            ? `/meetings/leadership/series/${agenda.seriesId}`
            : "/meetings/leadership"
        }
        className="inline-flex items-center gap-1 text-2xl font-bold hover:text-primary transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-primary" />
        {agenda?.name ?? "Weekly Agenda"}
      </Link>

      <Select value={section} onValueChange={setSection}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SECTIONS.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {agenda && current.type === "iceBreaker" && (
        <IceBreakerSection
          agendaId={agendaId}
          sectionKey={current.key}
          label={current.label}
          description={current.description}
          raw={raw}
        />
      )}

      {agenda && current.type === "winsShoutouts" && (
        <WinsShoutoutsSection
          agendaId={agendaId}
          sectionKey={current.key}
          label={current.label}
          description={current.description}
          raw={raw}
        />
      )}

      {agenda && current.type === "scoreCard" && (
        <ScoreCardSection
          agendaId={agendaId}
          sectionKey={current.key}
          label={current.label}
          description={current.description}
          raw={raw}
        />
      )}

      {agenda && current.type === "desiredFuture" && (
        <DesiredFutureSection
          agendaId={agendaId}
          sectionKey={current.key}
          label={current.label}
          description={current.description}
          raw={raw}
        />
      )}

      {agenda && current.type === "closeTheLoop" && (
        <CloseTheLoopSection
          agendaId={agendaId}
          sectionKey={current.key}
          label={current.label}
          description={current.description}
          raw={raw}
        />
      )}

      {current.type === "keyTopics" && <KeyTopicsSection agendaId={agendaId} />}

      {current.type === "actionItems" && (
        <ActionItemsSection agendaId={agendaId} />
      )}
    </div>
  );
}

function useSectionSave<T>(agendaId: number, sectionKey: string) {
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `pending` holds the latest unsaved value; `inflight` tracks whether a
  // PATCH is currently mid-flight. We serialize requests through `drain`
  // so closely-spaced edits cannot land out-of-order on the server.
  const pending = useRef<{ value: T } | null>(null);
  const inflight = useRef(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  async function drain() {
    if (inflight.current) return;
    if (!pending.current) return;
    inflight.current = true;
    try {
      while (pending.current) {
        const next = pending.current.value;
        pending.current = null;
        try {
          const res = await fetch(`/api/meeting-agendas/${agendaId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sectionData: { [sectionKey]: next } }),
          });
          if (!res.ok) {
            setHasError(true);
            continue;
          }
          queryClient.setQueriesData<Agenda>(
            { queryKey: [`/api/meeting-agendas/${agendaId}`] },
            (old) =>
              old
                ? {
                    ...old,
                    sectionData: {
                      ...old.sectionData,
                      [sectionKey]: next as unknown,
                    },
                  }
                : old
          );
          setHasError(false);
          setSavedAt(Date.now());
        } catch {
          setHasError(true);
        }
      }
    } finally {
      inflight.current = false;
    }
  }

  useEffect(() => {
    return () => {
      // Flush any pending edit on unmount so switching sections within
      // the 800ms debounce window does not drop the user's last keystroke.
      // The drain promise survives unmount (fetch + cache update are
      // independent of React); state setters become no-ops on unmounted
      // components, which is harmless.
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (pending.current) {
        void drain();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaId, sectionKey]);

  function save(next: T) {
    pending.current = { value: next };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void drain();
    }, 800);
  }

  return { save, savedAt, hasError };
}

function SavedFooter({
  savedAt,
  hasError,
}: {
  savedAt: number | null;
  hasError: boolean;
}) {
  if (hasError) {
    return (
      <div className="text-xs text-destructive" role="status">
        Save failed — your last change wasn't stored. Please try again.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Lock className="w-3 h-3" />
      {savedAt ? "Saved" : "Changes Saved Automatically"}
    </div>
  );
}

function SectionShell({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="text-lg font-bold">{label}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

// --- Ice Breaker ---------------------------------------------------------

type IceBreakerData = { prompt: string; notes: string };

function coerceIceBreaker(raw: unknown): IceBreakerData {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    return {
      prompt: typeof r.prompt === "string" ? r.prompt : "",
      notes: typeof r.notes === "string" ? r.notes : "",
    };
  }
  if (typeof raw === "string") return { prompt: "", notes: raw };
  return { prompt: "", notes: "" };
}

function IceBreakerSection({
  agendaId,
  sectionKey,
  label,
  description,
  raw,
}: {
  agendaId: number;
  sectionKey: string;
  label: string;
  description: string;
  raw: unknown;
}) {
  const [val, setVal] = useState<IceBreakerData>(() => coerceIceBreaker(raw));
  const { save, savedAt, hasError } = useSectionSave<IceBreakerData>(
    agendaId,
    sectionKey
  );

  useEffect(() => {
    setVal(coerceIceBreaker(raw));
  }, [raw]);

  function update(patch: Partial<IceBreakerData>) {
    const next = { ...val, ...patch };
    setVal(next);
    save(next);
  }

  return (
    <SectionShell label={label} description={description}>
      <div>
        <label className="text-sm font-semibold block mb-2">Prompt</label>
        <Input
          value={val.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder="e.g. What's one win you had this week?"
          data-testid="ice-breaker-prompt"
        />
      </div>
      <div>
        <label className="text-sm font-semibold block mb-2">Notes</label>
        <Textarea
          value={val.notes}
          onChange={(e) => update({ notes: e.target.value })}
          rows={6}
          placeholder="Capture the team's responses or any takeaways…"
          data-testid="ice-breaker-notes"
        />
      </div>
      <SavedFooter savedAt={savedAt} hasError={hasError} />
    </SectionShell>
  );
}

// --- Wins and Shoutouts --------------------------------------------------

type WinsItem = { id: string; who: string; message: string };

function coerceWins(raw: unknown): WinsItem[] {
  if (Array.isArray(raw)) {
    return raw
      .map((r) => {
        if (r && typeof r === "object") {
          const o = r as Record<string, unknown>;
          return {
            id: typeof o.id === "string" ? o.id : newId(),
            who: typeof o.who === "string" ? o.who : "",
            message: typeof o.message === "string" ? o.message : "",
          };
        }
        return null;
      })
      .filter((x): x is WinsItem => x !== null);
  }
  if (typeof raw === "string" && raw.trim()) {
    return [{ id: newId(), who: "", message: raw }];
  }
  return [];
}

function WinsShoutoutsSection({
  agendaId,
  sectionKey,
  label,
  description,
  raw,
}: {
  agendaId: number;
  sectionKey: string;
  label: string;
  description: string;
  raw: unknown;
}) {
  const [items, setItems] = useState<WinsItem[]>(() => coerceWins(raw));
  const { save, savedAt, hasError } = useSectionSave<WinsItem[]>(agendaId, sectionKey);

  useEffect(() => {
    setItems(coerceWins(raw));
  }, [raw]);

  function commit(next: WinsItem[]) {
    setItems(next);
    save(next);
  }

  return (
    <SectionShell label={label} description={description}>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
          No wins yet. Add the first one below.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="border rounded-md p-3 space-y-2"
              data-testid="wins-row"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={it.who}
                  placeholder="Who (e.g. Brooks Paine)"
                  onChange={(e) =>
                    commit(
                      items.map((x) =>
                        x.id === it.id ? { ...x, who: e.target.value } : x
                      )
                    )
                  }
                />
                <button
                  onClick={() => commit(items.filter((x) => x.id !== it.id))}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Remove win"
                  data-testid="wins-remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Textarea
                value={it.message}
                rows={2}
                placeholder="What's the win or shoutout?"
                onChange={(e) =>
                  commit(
                    items.map((x) =>
                      x.id === it.id ? { ...x, message: e.target.value } : x
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-primary"
        onClick={() =>
          commit([...items, { id: newId(), who: "", message: "" }])
        }
        data-testid="wins-add"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Win or Shoutout
      </Button>
      <SavedFooter savedAt={savedAt} hasError={hasError} />
    </SectionShell>
  );
}

// --- Score Card ----------------------------------------------------------

type ScoreMetric = {
  id: string;
  name: string;
  goal: string;
  actual: string;
  status: "on" | "off" | "";
};

function coerceScoreCard(raw: unknown): ScoreMetric[] {
  if (Array.isArray(raw)) {
    return raw
      .map((r) => {
        if (r && typeof r === "object") {
          const o = r as Record<string, unknown>;
          const status = o.status === "on" || o.status === "off" ? o.status : "";
          return {
            id: typeof o.id === "string" ? o.id : newId(),
            name: typeof o.name === "string" ? o.name : "",
            goal: typeof o.goal === "string" ? o.goal : "",
            actual: typeof o.actual === "string" ? o.actual : "",
            status: status as ScoreMetric["status"],
          };
        }
        return null;
      })
      .filter((x): x is ScoreMetric => x !== null);
  }
  if (typeof raw === "string" && raw.trim()) {
    return [
      { id: newId(), name: raw, goal: "", actual: "", status: "" },
    ];
  }
  return [];
}

function ScoreCardSection({
  agendaId,
  sectionKey,
  label,
  description,
  raw,
}: {
  agendaId: number;
  sectionKey: string;
  label: string;
  description: string;
  raw: unknown;
}) {
  const [items, setItems] = useState<ScoreMetric[]>(() => coerceScoreCard(raw));
  const { save, savedAt, hasError } = useSectionSave<ScoreMetric[]>(
    agendaId,
    sectionKey
  );

  useEffect(() => {
    setItems(coerceScoreCard(raw));
  }, [raw]);

  function commit(next: ScoreMetric[]) {
    setItems(next);
    save(next);
  }

  return (
    <SectionShell label={label} description={description}>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
          No metrics yet. Add the first one below.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div
              key={m.id}
              className="border rounded-md p-3 space-y-2"
              data-testid="scorecard-row"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={m.name}
                  placeholder="Metric name"
                  onChange={(e) =>
                    commit(
                      items.map((x) =>
                        x.id === m.id ? { ...x, name: e.target.value } : x
                      )
                    )
                  }
                />
                <button
                  onClick={() => commit(items.filter((x) => x.id !== m.id))}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Remove metric"
                  data-testid="scorecard-remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Goal
                  </label>
                  <Input
                    value={m.goal}
                    placeholder="e.g. 95%"
                    onChange={(e) =>
                      commit(
                        items.map((x) =>
                          x.id === m.id ? { ...x, goal: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Actual
                  </label>
                  <Input
                    value={m.actual}
                    placeholder="e.g. 91%"
                    onChange={(e) =>
                      commit(
                        items.map((x) =>
                          x.id === m.id ? { ...x, actual: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <button
                  onClick={() =>
                    commit(
                      items.map((x) =>
                        x.id === m.id
                          ? {
                              ...x,
                              status: x.status === "on" ? "" : "on",
                            }
                          : x
                      )
                    )
                  }
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    m.status === "on"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-background text-muted-foreground border-muted-foreground/30"
                  }`}
                  data-testid="scorecard-status-on"
                >
                  On Track
                </button>
                <button
                  onClick={() =>
                    commit(
                      items.map((x) =>
                        x.id === m.id
                          ? {
                              ...x,
                              status: x.status === "off" ? "" : "off",
                            }
                          : x
                      )
                    )
                  }
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    m.status === "off"
                      ? "bg-rose-100 text-rose-700 border-rose-200"
                      : "bg-background text-muted-foreground border-muted-foreground/30"
                  }`}
                  data-testid="scorecard-status-off"
                >
                  Off Track
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-primary"
        onClick={() =>
          commit([
            ...items,
            { id: newId(), name: "", goal: "", actual: "", status: "" },
          ])
        }
        data-testid="scorecard-add"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Metric
      </Button>
      <SavedFooter savedAt={savedAt} hasError={hasError} />
    </SectionShell>
  );
}

// --- Desired Future ------------------------------------------------------

type DesiredFutureData = { goal: string; pace: string };

function coerceDesiredFuture(raw: unknown): DesiredFutureData {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    return {
      goal: typeof r.goal === "string" ? r.goal : "",
      pace: typeof r.pace === "string" ? r.pace : "",
    };
  }
  if (typeof raw === "string") return { goal: raw, pace: "" };
  return { goal: "", pace: "" };
}

function DesiredFutureSection({
  agendaId,
  sectionKey,
  label,
  description,
  raw,
}: {
  agendaId: number;
  sectionKey: string;
  label: string;
  description: string;
  raw: unknown;
}) {
  const [val, setVal] = useState<DesiredFutureData>(() =>
    coerceDesiredFuture(raw)
  );
  const { save, savedAt, hasError } = useSectionSave<DesiredFutureData>(
    agendaId,
    sectionKey
  );

  useEffect(() => {
    setVal(coerceDesiredFuture(raw));
  }, [raw]);

  function update(patch: Partial<DesiredFutureData>) {
    const next = { ...val, ...patch };
    setVal(next);
    save(next);
  }

  return (
    <SectionShell label={label} description={description}>
      <div>
        <label className="text-sm font-semibold block mb-2">
          Long-Term Goal
        </label>
        <Textarea
          value={val.goal}
          rows={4}
          onChange={(e) => update({ goal: e.target.value })}
          placeholder="e.g. $10M revenue by end of 2027"
          data-testid="desired-future-goal"
        />
      </div>
      <div>
        <label className="text-sm font-semibold block mb-2">
          Current Pace
        </label>
        <Textarea
          value={val.pace}
          rows={4}
          onChange={(e) => update({ pace: e.target.value })}
          placeholder="Where are we today vs. the goal?"
          data-testid="desired-future-pace"
        />
      </div>
      <SavedFooter savedAt={savedAt} hasError={hasError} />
    </SectionShell>
  );
}

// --- Close the Loop ------------------------------------------------------

type LoopItem = { id: string; text: string; done: boolean };

function coerceLoop(raw: unknown): LoopItem[] {
  if (Array.isArray(raw)) {
    return raw
      .map((r) => {
        if (r && typeof r === "object") {
          const o = r as Record<string, unknown>;
          return {
            id: typeof o.id === "string" ? o.id : newId(),
            text: typeof o.text === "string" ? o.text : "",
            done: o.done === true,
          };
        }
        return null;
      })
      .filter((x): x is LoopItem => x !== null);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ id: newId(), text: line, done: false }));
  }
  return [];
}

function CloseTheLoopSection({
  agendaId,
  sectionKey,
  label,
  description,
  raw,
}: {
  agendaId: number;
  sectionKey: string;
  label: string;
  description: string;
  raw: unknown;
}) {
  const [items, setItems] = useState<LoopItem[]>(() => coerceLoop(raw));
  const { save, savedAt, hasError } = useSectionSave<LoopItem[]>(agendaId, sectionKey);

  useEffect(() => {
    setItems(coerceLoop(raw));
  }, [raw]);

  function commit(next: LoopItem[]) {
    setItems(next);
    save(next);
  }

  return (
    <SectionShell label={label} description={description}>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
          No follow-ups yet. Add items from last week to close out.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-start gap-3 p-3 border rounded-md"
              data-testid="loop-row"
            >
              <button
                onClick={() =>
                  commit(
                    items.map((x) =>
                      x.id === it.id ? { ...x, done: !x.done } : x
                    )
                  )
                }
                className={`mt-1.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                  it.done
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                }`}
                aria-label="Toggle done"
                data-testid="loop-toggle"
              >
                {it.done && <Check className="w-3 h-3" />}
              </button>
              <Input
                value={it.text}
                placeholder="What needs to be revisited?"
                onChange={(e) =>
                  commit(
                    items.map((x) =>
                      x.id === it.id ? { ...x, text: e.target.value } : x
                    )
                  )
                }
                className={
                  it.done ? "line-through text-muted-foreground" : undefined
                }
              />
              <button
                onClick={() => commit(items.filter((x) => x.id !== it.id))}
                className="text-muted-foreground hover:text-destructive mt-1.5"
                aria-label="Remove item"
                data-testid="loop-remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-primary"
        onClick={() =>
          commit([...items, { id: newId(), text: "", done: false }])
        }
        data-testid="loop-add"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Follow-Up
      </Button>
      <SavedFooter savedAt={savedAt} hasError={hasError} />
    </SectionShell>
  );
}

// --- Key Topics (unchanged) ---------------------------------------------

function KeyTopicsSection({ agendaId }: { agendaId: number }) {
  const [open, setOpen] = useState(false);
  const [coreIssue, setCoreIssue] = useState("");
  const [owner, setOwner] = useState("Brooks Paine");
  const queryClient = useQueryClient();

  const { data: topics = [] } = useQuery<KeyTopic[]>({
    queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}/key-topics`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}/key-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreIssue, owner }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
      });
      setCoreIssue("");
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<KeyTopic>;
    }) => {
      const res = await fetch(`/api/meeting-key-topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/meeting-key-topics/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
      });
    },
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Key Topics</h2>
          <Button
            size="sm"
            variant="ghost"
            className="text-primary"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Key Topic
          </Button>
        </div>
        {topics.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No key topics yet.
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-3 border rounded-md"
              >
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      id: t.id,
                      patch: { resolved: !t.resolved },
                    })
                  }
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    t.resolved
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  }`}
                  aria-label="Toggle resolved"
                >
                  {t.resolved && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      t.resolved ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {t.coreIssue}
                  </div>
                  {t.owner && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <MemberAvatar
                        name={t.owner}
                        className="w-5 h-5"
                        fallbackClassName="text-[10px] bg-primary/15 text-primary"
                      />
                      <span className="text-xs text-muted-foreground">
                        {t.owner}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Key Topic</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Create a New Key Topic.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">
                Core Issue
              </label>
              <Input
                value={coreIssue}
                onChange={(e) => setCoreIssue(e.target.value)}
                placeholder="Enter Key Topic here"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Owner</label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!coreIssue.trim() || createMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// --- Action Items (unchanged) -------------------------------------------

function ActionItemsSection({ agendaId }: { agendaId: number }) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState("");
  const [owner, setOwner] = useState("Brooks Paine");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isDailyTop3, setIsDailyTop3] = useState(false);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery<ActionItem[]>({
    queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}/action-items`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/meeting-agendas/${agendaId}/action-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item, owner, dueDate, isDailyTop3, notes }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
      });
      setItem("");
      setNotes("");
      setIsDailyTop3(false);
      setOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      completed,
      source,
    }: {
      id: number;
      completed: boolean;
      source: ActionItem["source"];
    }) => {
      // Phase 4: meeting items are stored in `action_items`, so toggling
      // them goes through the canonical PATCH /api/action-items/:id
      // (which expects `done`, not `completed`). Seat tasks still live
      // in their own table for now.
      const url =
        source === "seatTask"
          ? `/api/seat-tasks/${id}`
          : `/api/action-items/${id}`;
      const body =
        source === "seatTask"
          ? JSON.stringify({ completed, status: completed ? "done" : "todo" })
          : JSON.stringify({ done: completed });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      source,
    }: {
      id: number;
      source: ActionItem["source"];
    }) => {
      if (source === "seatTask") return;
      // Phase 4: meeting items live in `action_items`, so deletes go
      // through the canonical endpoint.
      await fetch(`/api/action-items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
      });
    },
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Action Items</h2>
          <Button
            size="sm"
            variant="ghost"
            className="text-primary"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Action Item
          </Button>
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No action items yet.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div
                key={`${a.source}-${a.id}`}
                className="flex items-start gap-3 p-3 border rounded-md"
              >
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      id: a.id,
                      completed: !a.completed,
                      source: a.source,
                    })
                  }
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    a.completed
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  }`}
                  aria-label="Toggle complete"
                >
                  {a.completed && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      a.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {a.item}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                    {a.owner && (
                      <div className="flex items-center gap-1.5">
                        <MemberAvatar
                          name={a.owner}
                          className="w-5 h-5"
                          fallbackClassName="text-[10px] bg-primary/15 text-primary"
                        />
                        <span>{a.owner}</span>
                      </div>
                    )}
                    {a.dueDate && <span>Due {a.dueDate}</span>}
                    {a.isDailyTop3 && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        Daily Top 3
                      </span>
                    )}
                    {a.source === "seatTask" && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-secondary text-foreground/80 font-medium"
                        title={a.seatTitle ?? undefined}
                      >
                        Org Chart{a.seatTitle ? ` · ${a.seatTitle}` : ""}
                      </span>
                    )}
                  </div>
                  {a.notes && (
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {a.notes}
                    </div>
                  )}
                </div>
                {a.source === "meeting" ? (
                  <button
                    onClick={() =>
                      deleteMutation.mutate({ id: a.id, source: a.source })
                    }
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">
                Action Item
              </label>
              <Textarea
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Enter Action Item here"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Owner</label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={isDailyTop3}
                onCheckedChange={setIsDailyTop3}
                id="daily-top-3"
              />
              <label htmlFor="daily-top-3" className="text-sm">
                Make this Action Item a Daily Top 3
              </label>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">
                Action Item Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!item.trim() || createMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

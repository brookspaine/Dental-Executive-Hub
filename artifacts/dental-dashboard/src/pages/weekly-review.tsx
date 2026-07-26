import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";
import { useCcTop3, useOnDeck, ccBusinessHeaders, useAllObjectives } from "@/pages/ideal-week";
import {
  paceOf,
  objectiveDoneKrs,
  useBusinessName,
  ON_DECK_CAP,
  type OnDeckItem,
  type CommandObjective,
} from "@/pages/command-center";

const base = import.meta.env.BASE_URL || "/";

function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
}
function getISOWeekYear(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  return target.getFullYear();
}

type FieldDef = { key: string; label: string; multi: boolean };

const REFLECT_FIELDS: FieldDef[] = [
  { key: "wins", label: "Wins", multi: true },
  { key: "losses", label: "Losses", multi: true },
  { key: "fixes", label: "Fixes", multi: true },
  { key: "ahHas", label: "Ah-HAs", multi: true },
  { key: "learned", label: "What I learned", multi: true },
  { key: "drains", label: "Unexpected Time Drains", multi: false },
  { key: "gratefulFor", label: "Something I'm grateful for (in detail)", multi: false },
  { key: "gratefulLoss", label: "A loss I'm grateful for", multi: false },
];
const REVIEW_FIELDS: FieldDef[] = [
  { key: "bannerGoals", label: "Banner Goals for the Year", multi: true },
  { key: "quarterlyBig3", label: "Quarterly Big 3", multi: true },
];
const PLAN_FIELDS: FieldDef[] = [
  {
    key: "lastWeekTest",
    label: "If this week were my last week, would I be doing what I plan to do this week?",
    multi: false,
  },
  { key: "topEvents", label: "Three Most Important Events", multi: true },
  { key: "habits", label: "Habits I'm developing", multi: true },
  { key: "studying", label: "Personal development I'm studying", multi: true },
];

type WeeklyReviewEntry = {
  id: number;
  year: number;
  week: number;
  fieldKey: string;
  content: string;
};

/* A field is either one textarea (single) or three input boxes persisted as
   one field key joined by newlines (multi — see KTD8). */
function FieldBlock({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!field.multi) {
    return (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="text-[11px] font-bold text-slate-600 mb-1.5">{field.label}</div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your reflection…"
          className="min-h-[60px] resize-y text-sm"
          data-testid={`textarea-${field.key}`}
        />
      </div>
    );
  }
  const lines = (value ? value.split("\n") : []).concat(["", "", ""]).slice(0, 3);
  const setLine = (i: number, v: string) => {
    const next = [...lines];
    next[i] = v;
    onChange(next.join("\n").replace(/\n+$/, (m) => (next.some((l) => l) ? m : "")));
  };
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[11px] font-bold text-slate-600 mb-1.5">{field.label}</div>
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <Input
            key={i}
            value={lines[i]}
            onChange={(e) => setLine(i, e.target.value)}
            className="h-8 text-sm"
            data-testid={`input-${field.key}-${i}`}
          />
        ))}
      </div>
    </div>
  );
}

/* Read-mostly objectives anchor with pace pills; objective text is
   click-to-edit (R14). Scoped to the current business (x-business-id). */
function ObjectivesAnchor() {
  const qc = useQueryClient();
  const { data: objectives = [] } = useAllObjectives();
  const businessName = useBusinessName();
  const bizLabel = (o: CommandObjective) =>
    o.businessIds.length === 0 ? "Personal" : (businessName(o.businessIds[0]) ?? "—");
  const patch = async (o: CommandObjective, text: string) => {
    const bizId = o.businessIds[0] ?? 1;
    await fetch(`${base}api/command-center/objectives/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-business-id": String(bizId) },
      body: JSON.stringify({ text }),
    });
    qc.invalidateQueries({ queryKey: ["cc-objectives-all"] });
  };

  if (objectives.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No objectives yet — add them in the Command Center to anchor your week.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {objectives.map((o) => {
        const pace = paceOf(o);
        const done = objectiveDoneKrs(o);
        return (
          <div key={o.id} className="flex items-center gap-2.5 py-1 border-b last:border-0">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 w-14 shrink-0 truncate">{bizLabel(o)}</span>
            <input
              defaultValue={o.text}
              onBlur={(e) => {
                const t = e.target.value.trim();
                if (t && t !== o.text) void patch(o, t);
              }}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none focus:bg-muted/40 rounded px-1"
              title="Click to edit"
            />
            {o.keyResults.length > 0 && (
              <span className="text-[10.5px] text-slate-400 tabular-nums whitespace-nowrap">
                {done}/{o.keyResults.length} KRs
              </span>
            )}
            {pace && (
              <span
                className="rounded-full text-[10.5px] font-semibold px-2 py-0.5 whitespace-nowrap"
                style={{ background: pace.bg, color: pace.fg }}
              >
                {pace.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Minimal On Deck → Weekly Big 3 picker: click an On Deck item to drop it into
   the next open Top-3 slot; add to / set up On Deck inline. Reuses the shared
   Top 3 + On Deck state (cc-top3 / cc-on-deck). */
function WeeklyBig3Picker() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: top3 = [] } = useCcTop3();
  const { data: onDeck = [] } = useOnDeck();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const slots = [1, 2, 3].map((s) => top3.find((r) => r.period === "week" && r.slot === s) ?? null);
  const firstEmpty = [1, 2, 3].find((s) => {
    const row = top3.find((r) => r.period === "week" && r.slot === s);
    return !row || !row.text.trim();
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["cc-top3"] });
    qc.invalidateQueries({ queryKey: ["cc-on-deck"] });
    window.dispatchEvent(new CustomEvent("cc:top3-changed"));
  };
  const putSlot = async (slot: number, body: Record<string, unknown>) => {
    await fetch(`${base}api/command-center/top3/week/${slot}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...ccBusinessHeaders() },
      body: JSON.stringify(body),
    });
  };
  const pin = async (item: OnDeckItem) => {
    if (!firstEmpty) {
      window.alert("All three Weekly Big 3 slots are full — clear one first.");
      return;
    }
    await putSlot(firstEmpty, {
      text: item.text,
      done: false,
      sourceBusinessId: item.sourceBusinessId ?? item.businessId,
      sourceTaskId: item.sourceTaskId ?? null,
      priority: item.priority,
      dueDate: item.dueDate,
      ownerDirectReportId: item.ownerDirectReportId,
      ownerName: item.ownerName,
    });
    await fetch(`${base}api/command-center/on-deck/${item.id}`, {
      method: "DELETE",
      headers: ccBusinessHeaders(),
    });
    refresh();
  };
  const clearSlot = async (slot: number) => {
    await putSlot(slot, { text: "", done: false });
    refresh();
  };
  const addOnDeck = async () => {
    const text = draft.trim();
    if (!text) return;
    if (onDeck.length >= ON_DECK_CAP) {
      window.alert(`On Deck is full (${ON_DECK_CAP}). Remove one before adding another.`);
      return;
    }
    await fetch(`${base}api/command-center/on-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ccBusinessHeaders() },
      body: JSON.stringify({ text }),
    });
    setDraft("");
    setAdding(false);
    refresh();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">On Deck</div>
        {onDeck.length === 0 ? (
          <button
            type="button"
            onClick={() => setLocation("/ideal-week")}
            className="text-sm text-blue-600 font-semibold"
          >
            Set up your On Deck →
          </button>
        ) : (
          <div className="flex flex-col gap-1.5">
            {onDeck.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void pin(item)}
                className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm text-left hover:border-slate-400"
                title="Add to the next Weekly Big 3 slot"
              >
                {item.text}
              </button>
            ))}
          </div>
        )}
        {adding ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => (draft.trim() ? void addOnDeck() : setAdding(false))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addOnDeck();
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="Add to On Deck — Enter to save"
            className="mt-2 h-8 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-2 text-xs font-semibold text-blue-600"
          >
            + Add to On Deck
          </button>
        )}
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">
          Weekly Big 3 (This Week's Top 3)
        </div>
        <div className="flex flex-col gap-2">
          {slots.map((row, i) => {
            const filled = Boolean(row && row.text.trim());
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 min-h-[40px] ${
                  filled ? "bg-muted/40" : "border-dashed"
                }`}
              >
                <span className="text-sm font-extrabold text-slate-300 w-3.5 text-center">{i + 1}</span>
                {filled ? (
                  <>
                    <span className="flex-1 text-sm">{row!.text}</span>
                    <button
                      type="button"
                      onClick={() => void clearSlot(i + 1)}
                      className="text-slate-400 hover:text-slate-600 text-sm"
                      title="Clear slot"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="flex-1 text-sm italic text-slate-400">
                    click an On Deck item…
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const STEPS = ["Reflect", "Review", "Plan"] as const;

export function WeeklyReview() {
  const now = useMemo(() => new Date(), []);
  const currentWeek = useMemo(() => getISOWeek(now), [now]);
  const currentYear = useMemo(() => getISOWeekYear(now), [now]);
  const [week, setWeek] = useState<number>(currentWeek);
  const year = currentYear;

  const queryClient = useQueryClient();
  const [location] = useLocation();

  // Hybrid: Page by default, Guided (stepper) when ?mode=guided or toggled.
  const [guided, setGuided] = useState<boolean>(() => location.includes("mode=guided"));
  const [step, setStep] = useState(0);

  const queryKey = ["weekly-review", year, week] as const;
  const { data: entries } = useQuery<WeeklyReviewEntry[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${base}api/weekly-review/${year}/${week}`);
      if (!res.ok) throw new Error("Failed to load weekly review");
      return res.json();
    },
  });

  const serverValues = useMemo(() => {
    const m: Record<string, string> = {};
    (entries ?? []).forEach((e) => {
      m[e.fieldKey] = e.content;
    });
    return m;
  }, [entries]);

  const pendingKey = (y: number, w: number, f: string) => `${y}:${w}:${f}`;
  const [localByWeek, setLocalByWeek] = useState<Record<string, Record<string, string>>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const weekKey = `${year}:${week}`;

  useEffect(() => {
    setLocalByWeek((prev) => {
      const prevForWeek = prev[weekKey] ?? {};
      const next: Record<string, string> = { ...serverValues };
      Object.keys(prevForWeek).forEach((f) => {
        if (pending.has(pendingKey(year, week, f))) next[f] = prevForWeek[f];
      });
      return { ...prev, [weekKey]: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValues, weekKey]);

  const localValues = localByWeek[weekKey] ?? {};
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = debounceRefs.current;
    return () => Object.values(timers).forEach((t) => clearTimeout(t));
  }, []);

  const saveMut = useMutation({
    mutationFn: async (vars: { year: number; week: number; fieldKey: string; content: string }) => {
      const res = await fetch(
        `${base}api/weekly-review/${vars.year}/${vars.week}/${vars.fieldKey}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: vars.content }),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      return (await res.json()) as WeeklyReviewEntry;
    },
    onSuccess: (_d, vars) => {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(pendingKey(vars.year, vars.week, vars.fieldKey));
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["weekly-review", vars.year, vars.week] });
    },
  });

  const setField = (key: string, v: string) => {
    const editYear = year;
    const editWeek = week;
    const editWeekKey = `${editYear}:${editWeek}`;
    const pKey = pendingKey(editYear, editWeek, key);
    setLocalByWeek((prev) => ({
      ...prev,
      [editWeekKey]: { ...(prev[editWeekKey] ?? {}), [key]: v },
    }));
    setPending((prev) => new Set(prev).add(pKey));
    if (debounceRefs.current[pKey]) clearTimeout(debounceRefs.current[pKey]);
    debounceRefs.current[pKey] = setTimeout(() => {
      saveMut.mutate({ year: editYear, week: editWeek, fieldKey: key, content: v });
    }, 500);
  };

  // Completion — stops the reminder pop-up for this week (U1/U3).
  type ReviewCompletion = { kind: string; year: number; period: number };
  const { data: completions } = useQuery<ReviewCompletion[]>({
    queryKey: ["reviews-status"],
    queryFn: async () => {
      const res = await fetch(`${base}api/reviews/status`);
      if (!res.ok) throw new Error("Failed to load review status");
      return res.json();
    },
  });
  const isCompleted = (completions ?? []).some(
    (c) => c.kind === "weekly" && c.year === year && c.period === week,
  );
  const completeMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${base}api/reviews/weekly/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, period: week }),
      });
      if (!res.ok) throw new Error("Failed to mark complete");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews-status"] }),
  });

  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

  const fieldGrid = (fields: FieldDef[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {fields.map((f) => (
        <FieldBlock key={f.key} field={f} value={localValues[f.key] || ""} onChange={(v) => setField(f.key, v)} />
      ))}
    </div>
  );

  const sections = [
    { title: "Reflect on last week", body: fieldGrid(REFLECT_FIELDS) },
    {
      title: "Review — anchor to the quarter",
      body: (
        <>
          <ObjectivesAnchor />
          <div className="mt-3">{fieldGrid(REVIEW_FIELDS)}</div>
        </>
      ),
    },
    {
      title: "Plan the week",
      body: (
        <>
          <WeeklyBig3Picker />
          <div className="mt-3">{fieldGrid(PLAN_FIELDS)}</div>
        </>
      ),
    },
  ];

  const finishBar = (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">Autosaves as you type</span>
      {isCompleted ? (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
          ✓ Completed
        </span>
      ) : (
        <button
          type="button"
          onClick={() => completeMut.mutate()}
          disabled={completeMut.isPending}
          className="rounded-md bg-[#0F2A47] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Finish — set my week ✓
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4" data-testid="page-weekly-review">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-purple-700" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Weekly Review · Week {week}</h2>
          {!isCompleted && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              Not completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGuided(false)}
              className={`px-2.5 py-1 ${!guided ? "bg-[#0F2A47] text-white" : "text-muted-foreground"}`}
            >
              Page
            </button>
            <button
              type="button"
              onClick={() => {
                setGuided(true);
                setStep(0);
              }}
              className={`px-2.5 py-1 ${guided ? "bg-[#0F2A47] text-white" : "text-muted-foreground"}`}
            >
              Guided
            </button>
          </div>
          <Select value={String(week)} onValueChange={(v) => setWeek(Number(v))}>
            <SelectTrigger className="w-[130px]" data-testid="select-week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Week {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {guided ? (
        <>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-xs font-bold">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    i < step
                      ? "bg-emerald-600 text-white"
                      : i === step
                        ? "bg-[#0F2A47] text-white"
                        : "bg-muted text-slate-400"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={i === step ? "text-[#0F2A47]" : i < step ? "text-emerald-700" : "text-slate-400"}>
                  {s}
                </span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-muted" />}
              </div>
            ))}
          </div>
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div className="text-sm font-bold uppercase tracking-wide text-[#0F2A47]">
                {step + 1} · {sections[step].title}
              </div>
              {sections[step].body}
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-md border px-3 py-1.5 text-sm font-semibold text-muted-foreground disabled:opacity-40"
            >
              ← Back
            </button>
            <span className="text-xs text-slate-400">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="rounded-md bg-[#0F2A47] px-4 py-1.5 text-sm font-semibold text-white"
              >
                Next: {STEPS[step + 1]} →
              </button>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                ✓ Completed
              </span>
            ) : (
              <button
                type="button"
                onClick={() => completeMut.mutate()}
                disabled={completeMut.isPending}
                className="rounded-md bg-[#0F2A47] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Finish — set my week ✓
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {sections.map((sec, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6 space-y-3">
                <div className="text-sm font-bold uppercase tracking-wide text-[#0F2A47]">
                  {i + 1} · {sec.title}
                </div>
                {sec.body}
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="p-4">{finishBar}</CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default WeeklyReview;

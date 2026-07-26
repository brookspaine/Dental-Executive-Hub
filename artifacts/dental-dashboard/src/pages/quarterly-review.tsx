import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Target } from "lucide-react";
import { ccBusinessHeaders } from "@/pages/ideal-week";
import { paceOf, objectiveDoneKrs, type CommandObjective } from "@/pages/command-center";

const base = import.meta.env.BASE_URL || "/";

function currentQuarter(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1;
}

type FieldDef = { key: string; label: string; multi: boolean };
const REFLECT_FIELDS: FieldDef[] = [
  { key: "qWorked", label: "What worked this quarter", multi: true },
  { key: "qChange", label: "What I'd change", multi: true },
  { key: "qLesson", label: "Biggest lessons", multi: true },
  { key: "qIdentity", label: "The identity I'm becoming", multi: true },
];

type QuarterlyEntry = { id: number; year: number; quarter: number; fieldKey: string; content: string };

function FieldBlock({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const lines = (value ? value.split("\n") : []).concat(["", "", ""]).slice(0, 3);
  const setLine = (i: number, v: string) => {
    const next = [...lines];
    next[i] = v;
    onChange(next.join("\n"));
  };
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[11px] font-bold text-slate-600 mb-1.5">{field.label}</div>
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <Input key={i} value={lines[i]} onChange={(e) => setLine(i, e.target.value)} className="h-8 text-sm" />
        ))}
      </div>
    </div>
  );
}

/* Score step — objectives auto-pulled with their key-result progress; the score
   is a snapshot saved into the review (fieldKey score_<id>), never written back
   to the objective. */
function ScoreSection({
  objectives,
  scoreValue,
  onScore,
}: {
  objectives: CommandObjective[];
  scoreValue: (key: string) => string;
  onScore: (key: string, v: string) => void;
}) {
  if (objectives.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No objectives to score — add them in the Command Center, then run this review.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {objectives.map((o) => {
        const pace = paceOf(o);
        const done = objectiveDoneKrs(o);
        const frac = o.keyResults.length
          ? o.keyResults.reduce((s, k) => s + Math.min(k.current / Math.max(k.target, 1), 1), 0) / o.keyResults.length
          : 0;
        return (
          <div key={o.id} className="flex items-center gap-3 py-1.5 border-b last:border-0 text-sm">
            <span className="flex-1 min-w-0">{o.text}</span>
            {o.keyResults.length > 0 && (
              <>
                <span className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${Math.round(frac * 100)}%` }} />
                </span>
                <span className="text-[10.5px] text-slate-400 tabular-nums w-12">{done}/{o.keyResults.length} KRs</span>
              </>
            )}
            {pace && (
              <span className="rounded-full text-[10.5px] font-semibold px-2 py-0.5 whitespace-nowrap" style={{ background: pace.bg, color: pace.fg }}>
                {pace.label}
              </span>
            )}
            <Input
              value={scoreValue(`score_${o.id}`)}
              onChange={(e) => onScore(`score_${o.id}`, e.target.value)}
              placeholder="score"
              className="w-16 h-8 text-sm text-center"
            />
          </div>
        );
      })}
    </div>
  );
}

/* Set next quarter — edit existing objectives (carry forward = leave as-is) or
   add new ones, via the existing objectives endpoints. */
function SetNextSection({ objectives, onChanged }: { objectives: CommandObjective[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const currentBiz = Number(ccBusinessHeaders()["x-business-id"]) || 1;

  const patch = async (id: number, text: string) => {
    await fetch(`${base}api/command-center/objectives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...ccBusinessHeaders() },
      body: JSON.stringify({ text }),
    });
    onChanged();
  };
  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    await fetch(`${base}api/command-center/objectives`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ccBusinessHeaders() },
      body: JSON.stringify({
        text,
        parentType: "business",
        parentId: currentBiz,
        businessIds: [currentBiz],
        sortOrder: objectives.length,
      }),
    });
    setDraft("");
    setAdding(false);
    onChanged();
  };

  return (
    <div className="flex flex-col gap-1.5">
      {objectives.map((o) => (
        <div key={o.id} className="flex items-center gap-2 py-1 border-b last:border-0">
          <span className="text-slate-400 text-xs">◆</span>
          <input
            defaultValue={o.text}
            onBlur={(e) => {
              const t = e.target.value.trim();
              if (t && t !== o.text) void patch(o.id, t);
            }}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none focus:bg-muted/40 rounded px-1"
            title="Click to edit — carry forward or revise"
          />
        </div>
      ))}
      {adding ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => (draft.trim() ? void add() : setAdding(false))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="New objective — Enter to save"
          className="h-8 text-sm mt-1"
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-1 text-xs font-semibold text-blue-600 text-left">
          + Add an objective for next quarter
        </button>
      )}
    </div>
  );
}

const STEPS = ["Score", "Reflect", "Set next quarter"] as const;

export function QuarterlyReview() {
  const now = useMemo(() => new Date(), []);
  const [quarter, setQuarter] = useState<number>(currentQuarter(now));
  const year = now.getFullYear();

  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [guided, setGuided] = useState<boolean>(() => location.includes("mode=guided"));
  const [step, setStep] = useState(0);

  const { data: objectives = [] } = useQuery<CommandObjective[]>({
    queryKey: ["cc-objectives"],
    queryFn: async () => {
      const res = await fetch(`${base}api/command-center/objectives`, { headers: ccBusinessHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const qKey = ["quarterly-review", year, quarter] as const;
  const { data: entries } = useQuery<QuarterlyEntry[]>({
    queryKey: qKey,
    queryFn: async () => {
      const res = await fetch(`${base}api/quarterly-review/${year}/${quarter}`);
      if (!res.ok) throw new Error("Failed to load quarterly review");
      return res.json();
    },
  });

  const serverValues = useMemo(() => {
    const m: Record<string, string> = {};
    (entries ?? []).forEach((e) => (m[e.fieldKey] = e.content));
    return m;
  }, [entries]);

  const pendingKey = (y: number, q: number, f: string) => `${y}:${q}:${f}`;
  const [localByQ, setLocalByQ] = useState<Record<string, Record<string, string>>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const qStoreKey = `${year}:${quarter}`;

  useEffect(() => {
    setLocalByQ((prev) => {
      const prevForQ = prev[qStoreKey] ?? {};
      const next: Record<string, string> = { ...serverValues };
      Object.keys(prevForQ).forEach((f) => {
        if (pending.has(pendingKey(year, quarter, f))) next[f] = prevForQ[f];
      });
      return { ...prev, [qStoreKey]: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValues, qStoreKey]);

  const localValues = localByQ[qStoreKey] ?? {};
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = debounceRefs.current;
    return () => Object.values(timers).forEach((t) => clearTimeout(t));
  }, []);

  const saveMut = useMutation({
    mutationFn: async (vars: { year: number; quarter: number; fieldKey: string; content: string }) => {
      const res = await fetch(`${base}api/quarterly-review/${vars.year}/${vars.quarter}/${vars.fieldKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: vars.content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return (await res.json()) as QuarterlyEntry;
    },
    onSuccess: (_d, vars) => {
      setPending((prev) => {
        const n = new Set(prev);
        n.delete(pendingKey(vars.year, vars.quarter, vars.fieldKey));
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["quarterly-review", vars.year, vars.quarter] });
    },
  });

  const setField = (key: string, v: string) => {
    const eY = year;
    const eQ = quarter;
    const sk = `${eY}:${eQ}`;
    const pk = pendingKey(eY, eQ, key);
    setLocalByQ((prev) => ({ ...prev, [sk]: { ...(prev[sk] ?? {}), [key]: v } }));
    setPending((prev) => new Set(prev).add(pk));
    if (debounceRefs.current[pk]) clearTimeout(debounceRefs.current[pk]);
    debounceRefs.current[pk] = setTimeout(() => {
      saveMut.mutate({ year: eY, quarter: eQ, fieldKey: key, content: v });
    }, 500);
  };

  // Completion — stops the quarterly reminder pop-up.
  type ReviewCompletion = { kind: string; year: number; period: number };
  const { data: completions } = useQuery<ReviewCompletion[]>({
    queryKey: ["reviews-status"],
    queryFn: async () => {
      const res = await fetch(`${base}api/reviews/status`);
      if (!res.ok) throw new Error("status");
      return res.json();
    },
  });
  const isCompleted = (completions ?? []).some((c) => c.kind === "quarterly" && c.year === year && c.period === quarter);
  const completeMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${base}api/reviews/quarterly/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, period: quarter }),
      });
      if (!res.ok) throw new Error("Failed to mark complete");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews-status"] }),
  });

  const reflectGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {REFLECT_FIELDS.map((f) => (
        <FieldBlock key={f.key} field={f} value={localValues[f.key] || ""} onChange={(v) => setField(f.key, v)} />
      ))}
    </div>
  );

  const sections = [
    {
      title: "Score the quarter",
      body: (
        <ScoreSection objectives={objectives} scoreValue={(k) => localValues[k] || ""} onScore={(k, v) => setField(k, v)} />
      ),
    },
    { title: "Reflect", body: reflectGrid },
    {
      title: "Set next quarter",
      body: <SetNextSection objectives={objectives} onChanged={() => queryClient.invalidateQueries({ queryKey: ["cc-objectives"] })} />,
    },
  ];

  const finishBtn = isCompleted ? (
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
      Finish — set the quarter ✓
    </button>
  );

  return (
    <div className="space-y-4" data-testid="page-quarterly-review">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-700" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Quarterly Review · Q{quarter} {year}</h2>
          {!isCompleted && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Not completed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border text-xs font-semibold">
            <button type="button" onClick={() => setGuided(false)} className={`px-2.5 py-1 ${!guided ? "bg-[#0F2A47] text-white" : "text-muted-foreground"}`}>Page</button>
            <button type="button" onClick={() => { setGuided(true); setStep(0); }} className={`px-2.5 py-1 ${guided ? "bg-[#0F2A47] text-white" : "text-muted-foreground"}`}>Guided</button>
          </div>
          <div className="inline-flex overflow-hidden rounded-md border text-xs font-semibold">
            {[1, 2, 3, 4].map((q) => (
              <button key={q} type="button" onClick={() => setQuarter(q)} className={`px-2.5 py-1 ${q === quarter ? "bg-slate-100 text-[#0F2A47]" : "text-muted-foreground"}`}>Q{q}</button>
            ))}
          </div>
        </div>
      </div>

      {guided ? (
        <>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-xs font-bold">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i < step ? "bg-emerald-600 text-white" : i === step ? "bg-[#0F2A47] text-white" : "bg-muted text-slate-400"}`}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={i === step ? "text-[#0F2A47]" : i < step ? "text-emerald-700" : "text-slate-400"}>{s}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-muted" />}
              </div>
            ))}
          </div>
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div className="text-sm font-bold uppercase tracking-wide text-[#0F2A47]">{step + 1} · {sections[step].title}</div>
              {sections[step].body}
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-md border px-3 py-1.5 text-sm font-semibold text-muted-foreground disabled:opacity-40">← Back</button>
            <span className="text-xs text-slate-400">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="rounded-md bg-[#0F2A47] px-4 py-1.5 text-sm font-semibold text-white">Next: {STEPS[step + 1]} →</button>
            ) : (
              finishBtn
            )}
          </div>
        </>
      ) : (
        <>
          {sections.map((sec, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6 space-y-3">
                <div className="text-sm font-bold uppercase tracking-wide text-[#0F2A47]">{i + 1} · {sec.title}</div>
                {sec.body}
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Scores &amp; reflections autosave</span>
              {finishBtn}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default QuarterlyReview;

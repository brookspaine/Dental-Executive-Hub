import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";

const base = import.meta.env.BASE_URL || "/";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type FieldDef = { key: string; label: string; multi: boolean };

/* Personal finances / wealth review — grounded in the app's monthly_review
   ritual (pay CC, transfer to savings, invest HSA/brokerage). */
const FINANCE_FIELDS: FieldDef[] = [
  { key: "income", label: "Income this month vs. plan", multi: false },
  { key: "spending", label: "Spending — top categories & biggest leak", multi: true },
  { key: "money_moves", label: "Money moves — CC paid, savings transfer, invested (HSA/brokerage)", multi: true },
  { key: "net_worth", label: "Net worth / cash position", multi: false },
  { key: "win", label: "Money win this month", multi: false },
  { key: "next_move", label: "Next month's #1 money move", multi: false },
];

/* Light capture of the personal assessment taken outside the app. */
const ASSESSMENT_FIELDS: FieldDef[] = [
  { key: "assessment_link", label: "Link to my assessment", multi: false },
  { key: "assessment_takeaways", label: "Key takeaways", multi: true },
  { key: "assessment_focus", label: "Focus for next month", multi: false },
];

type MonthlyEntry = { id: number; year: number; month: number; fieldKey: string; content: string };

/* Single-box for one-line fields; three newline-joined boxes for multi fields
   (persisted as one field key, split back on load — mirrors the quarterly page). */
function FieldBlock({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.multi) {
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
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[11px] font-bold text-slate-600 mb-1.5">{field.label}</div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

const STEPS = ["Finances", "Personal Assessment"] as const;

export function MonthlyReview() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const year = now.getFullYear();

  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [guided, setGuided] = useState<boolean>(() => location.includes("mode=guided"));
  const [step, setStep] = useState(0);

  const mKey = ["monthly-review", year, month] as const;
  const { data: entries } = useQuery<MonthlyEntry[]>({
    queryKey: mKey,
    queryFn: async () => {
      const res = await fetch(`${base}api/monthly-review/${year}/${month}`);
      if (!res.ok) throw new Error("Failed to load monthly review");
      return res.json();
    },
  });

  const serverValues = useMemo(() => {
    const m: Record<string, string> = {};
    (entries ?? []).forEach((e) => (m[e.fieldKey] = e.content));
    return m;
  }, [entries]);

  const pendingKey = (y: number, mo: number, f: string) => `${y}:${mo}:${f}`;
  const [localByM, setLocalByM] = useState<Record<string, Record<string, string>>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const mStoreKey = `${year}:${month}`;

  useEffect(() => {
    setLocalByM((prev) => {
      const prevForM = prev[mStoreKey] ?? {};
      const next: Record<string, string> = { ...serverValues };
      Object.keys(prevForM).forEach((f) => {
        if (pending.has(pendingKey(year, month, f))) next[f] = prevForM[f];
      });
      return { ...prev, [mStoreKey]: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValues, mStoreKey]);

  const localValues = localByM[mStoreKey] ?? {};
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = debounceRefs.current;
    return () => Object.values(timers).forEach((t) => clearTimeout(t));
  }, []);

  const saveMut = useMutation({
    mutationFn: async (vars: { year: number; month: number; fieldKey: string; content: string }) => {
      const res = await fetch(`${base}api/monthly-review/${vars.year}/${vars.month}/${vars.fieldKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: vars.content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return (await res.json()) as MonthlyEntry;
    },
    onSuccess: (_d, vars) => {
      setPending((prev) => {
        const n = new Set(prev);
        n.delete(pendingKey(vars.year, vars.month, vars.fieldKey));
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["monthly-review", vars.year, vars.month] });
    },
  });

  const setField = (key: string, v: string) => {
    const eY = year;
    const eM = month;
    const sk = `${eY}:${eM}`;
    const pk = pendingKey(eY, eM, key);
    setLocalByM((prev) => ({ ...prev, [sk]: { ...(prev[sk] ?? {}), [key]: v } }));
    setPending((prev) => new Set(prev).add(pk));
    if (debounceRefs.current[pk]) clearTimeout(debounceRefs.current[pk]);
    debounceRefs.current[pk] = setTimeout(() => {
      saveMut.mutate({ year: eY, month: eM, fieldKey: key, content: v });
    }, 500);
  };

  // Completion — stops the monthly reminder pop-up.
  type ReviewCompletion = { kind: string; year: number; period: number };
  const { data: completions } = useQuery<ReviewCompletion[]>({
    queryKey: ["reviews-status"],
    queryFn: async () => {
      const res = await fetch(`${base}api/reviews/status`);
      if (!res.ok) throw new Error("status");
      return res.json();
    },
  });
  const isCompleted = (completions ?? []).some((c) => c.kind === "monthly" && c.year === year && c.period === month);
  const completeMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${base}api/reviews/monthly/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, period: month }),
      });
      if (!res.ok) throw new Error("Failed to mark complete");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews-status"] }),
  });

  const financeGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {FINANCE_FIELDS.map((f) => (
        <FieldBlock key={f.key} field={f} value={localValues[f.key] || ""} onChange={(v) => setField(f.key, v)} />
      ))}
    </div>
  );

  const assessmentBody = (
    <div className="space-y-2.5">
      <div className="text-xs text-muted-foreground">
        Take your personal assessment outside the app, then capture the essentials here.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {ASSESSMENT_FIELDS.map((f) => (
          <FieldBlock key={f.key} field={f} value={localValues[f.key] || ""} onChange={(v) => setField(f.key, v)} />
        ))}
      </div>
    </div>
  );

  const sections = [
    { title: "Finances", body: financeGrid },
    { title: "Personal Assessment", body: assessmentBody },
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
      Finish — log this month ✓
    </button>
  );

  return (
    <div className="space-y-4" data-testid="page-monthly-review">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-700" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Monthly Review · {MONTHS[month - 1]} {year}</h2>
          {!isCompleted && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Not completed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border text-xs font-semibold">
            <button type="button" onClick={() => setGuided(false)} className={`px-2.5 py-1 ${!guided ? "bg-[#0F2A47] text-white" : "text-muted-foreground"}`}>Page</button>
            <button type="button" onClick={() => { setGuided(true); setStep(0); }} className={`px-2.5 py-1 ${guided ? "bg-[#0F2A47] text-white" : "text-muted-foreground"}`}>Guided</button>
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border bg-white px-2 py-1 text-xs font-semibold text-[#0F2A47]"
            aria-label="Select month"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
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
              <span className="text-xs text-muted-foreground">Entries autosave</span>
              {finishBtn}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default MonthlyReview;

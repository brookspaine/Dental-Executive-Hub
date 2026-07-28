import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

type MonthlyEntry = { id: number; year: number; month: number; fieldKey: string; content: string };

/* ---- Monarch snapshot (Path A) --------------------------------------------
   The app never calls Monarch. Claude pulls the month's numbers via the Monarch
   MCP and writes this JSON into the `money_snapshot` field; the page just
   renders whatever is stored (or an empty state when nothing has been pulled). */
type SnapshotTile = { k: string; v: string; d?: string; dir?: "up" | "down" | "flat" };
type SnapshotCat = { name: string; amount: string; pct?: number };
type Snapshot = {
  range?: string;
  syncedAt?: string;
  tiles?: SnapshotTile[];
  categories?: SnapshotCat[];
  categoriesTotal?: string;
};

function parseSnapshot(raw: string): Snapshot | null {
  if (!raw || !raw.trim()) return null;
  try {
    const s = JSON.parse(raw);
    return s && typeof s === "object" ? (s as Snapshot) : null;
  } catch {
    return null;
  }
}

function MonarchSnapshot({ raw, monthName }: { raw: string; monthName: string }) {
  const snap = parseSnapshot(raw);
  if (!snap || !(snap.tiles?.length || snap.categories?.length)) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        No {monthName} snapshot yet — run your monthly review with Claude to pull your Monarch numbers.
      </div>
    );
  }
  const dirClass = (dir?: string) =>
    dir === "up" ? "text-emerald-700" : dir === "down" ? "text-red-700" : "text-slate-400";
  return (
    <div className="space-y-3">
      {(snap.range || snap.syncedAt) && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">● Monarch</span>
          {snap.range}
          {snap.syncedAt ? ` · synced ${snap.syncedAt}` : ""}
        </div>
      )}
      {snap.tiles && snap.tiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {snap.tiles.map((t, i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{t.k}</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{t.v}</div>
              {t.d && <div className={`mt-0.5 text-[11px] font-semibold ${dirClass(t.dir)}`}>{t.d}</div>}
            </div>
          ))}
        </div>
      )}
      {snap.categories && snap.categories.length > 0 && (
        <div className="rounded-lg border p-3.5">
          <div className="mb-2.5 flex justify-between text-[11px] font-bold text-slate-600">
            <span>Spending by category</span>
            {snap.categoriesTotal && <span className="font-semibold tabular-nums text-slate-500">{snap.categoriesTotal}</span>}
          </div>
          <div className="space-y-1.5">
            {snap.categories.map((c, i) => (
              <div key={i} className="grid grid-cols-[110px_1fr_64px] items-center gap-2.5">
                <span className="truncate text-xs text-slate-700">{c.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-[#0F2A47]" style={{ width: `${Math.max(0, Math.min(100, c.pct ?? 0))}%` }} />
                </span>
                <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{c.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldBox({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[11px] font-bold text-slate-600 mb-1.5">{label}</div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}

const STEPS = ["Money", "Personal Assessment"] as const;

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

  const moneyBody = (
    <div className="space-y-3">
      <MonarchSnapshot raw={localValues["money_snapshot"] || ""} monthName={MONTHS[month - 1]} />
      <FieldBox
        label="One money move for next month"
        value={localValues["money_move"] || ""}
        onChange={(v) => setField("money_move", v)}
        placeholder="e.g. Automate the brokerage transfer"
      />
    </div>
  );

  const assessmentBody = (
    <div className="space-y-2.5">
      <div className="text-xs text-muted-foreground">
        Take your assessment outside the app, then capture the essentials here.
      </div>
      <FieldBox
        label="Link to my assessment"
        value={localValues["assessment_link"] || ""}
        onChange={(v) => setField("assessment_link", v)}
        placeholder="https://…"
      />
      <FieldBox
        label="Takeaway + focus for next month"
        value={localValues["assessment_focus"] || ""}
        onChange={(v) => setField("assessment_focus", v)}
        placeholder="e.g. Health trending up — protect deep-work mornings"
      />
    </div>
  );

  const sections = [
    { title: "Money", body: moneyBody },
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
              <span className="text-xs text-muted-foreground">Autosaves</span>
              {finishBtn}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default MonthlyReview;

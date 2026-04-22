import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";

function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
}

function getISOWeekYear(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  return target.getFullYear();
}

type FieldDef = { key: string; label: string; helper?: string; minRows?: number };

const REVIEW_FIELDS: FieldDef[] = [
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "drains", label: "Unexpected Time Drains" },
  { key: "fixes", label: "Fixes" },
  { key: "ahHas", label: "Ah-HAs" },
  {
    key: "gratefulFor",
    label: "Something in detail I am Grateful for this Past Week",
  },
  {
    key: "gratefulLoss",
    label: "A Loss that I am Grateful for this Past Week",
  },
  {
    key: "learned",
    label:
      "What Else I learned from Personal Development and Skill Improvement Study This Week",
  },
];

const PLANNING_FIELDS: FieldDef[] = [
  { key: "bannerGoals", label: "Banner Goals for the Year" },
  { key: "quarterlyBig3", label: "Quarterly Big 3" },
  {
    key: "weeklyBig3",
    label: "Weekly Big 3",
    helper:
      'What can I do this week that will have the biggest impact to achieve my goals?',
  },
  {
    key: "topEvents",
    label: "Three Most Important Events for the Week",
    helper:
      "Be Excellent in the few meetings/events that will have the biggest impact on your goals.",
  },
  {
    key: "habits",
    label: "Habits I'm Developing and Practicing This Month",
  },
  {
    key: "studying",
    label: "Personal Development Materials I'm Studying This Week",
  },
];

type WeeklyReviewEntry = {
  id: number;
  year: number;
  week: number;
  fieldKey: string;
  content: string;
};

function FieldBlock({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="bg-muted/60 border rounded px-2.5 py-1 inline-block">
        <span className="text-sm font-semibold">{field.label}:</span>
        {field.helper && (
          <span className="text-xs text-muted-foreground italic ml-2">
            "{field.helper}"
          </span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your reflection..."
        className="min-h-[88px] resize-y"
        data-testid={`textarea-${field.key}`}
      />
    </div>
  );
}

function SectionBlock({
  label,
  fields,
  values,
  onFieldChange,
}: {
  label: string;
  fields: FieldDef[];
  values: Record<string, string>;
  onFieldChange: (key: string, v: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4">
          <div className="text-base font-semibold italic text-muted-foreground">
            {label}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <FieldBlock
                key={f.key}
                field={f}
                value={values[f.key] || ""}
                onChange={(v) => onFieldChange(f.key, v)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyReview() {
  const now = useMemo(() => new Date(), []);
  const currentWeek = useMemo(() => getISOWeek(now), [now]);
  const currentYear = useMemo(() => getISOWeekYear(now), [now]);
  const [week, setWeek] = useState<number>(currentWeek);
  const year = currentYear;

  const base = import.meta.env.BASE_URL || "/";
  const queryClient = useQueryClient();

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

  // Local edits and pending-save tracking are scoped to (year, week, field)
  // so switching weeks never bleeds in-flight values into the wrong week.
  const pendingKey = (y: number, w: number, f: string) => `${y}:${w}:${f}`;
  const [localByWeek, setLocalByWeek] = useState<
    Record<string, Record<string, string>>
  >({});
  const [pending, setPending] = useState<Set<string>>(new Set());

  const weekKey = `${year}:${week}`;

  // Sync server values into the local store for the current week, but keep
  // any field that still has a pending unsaved edit to avoid clobbering it.
  useEffect(() => {
    setLocalByWeek((prev) => {
      const prevForWeek = prev[weekKey] ?? {};
      const next: Record<string, string> = { ...serverValues };
      Object.keys(prevForWeek).forEach((f) => {
        if (pending.has(pendingKey(year, week, f))) {
          next[f] = prevForWeek[f];
        }
      });
      return { ...prev, [weekKey]: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValues, weekKey]);

  const localValues = localByWeek[weekKey] ?? {};

  // Debounce timers keyed by (year, week, field) so a queued save from a
  // prior week cannot fire after the user switches contexts.
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    const timers = debounceRefs.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const saveMut = useMutation({
    mutationFn: async (vars: {
      year: number;
      week: number;
      fieldKey: string;
      content: string;
    }) => {
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
    onSuccess: (_data, vars) => {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(pendingKey(vars.year, vars.week, vars.fieldKey));
        return next;
      });
      queryClient.invalidateQueries({
        queryKey: ["weekly-review", vars.year, vars.week],
      });
    },
  });

  const setField = (key: string, v: string) => {
    // Capture the (year, week) at edit time so the save is guaranteed to
    // target the week the user was editing, even if they switch weeks
    // before the debounce fires.
    const editYear = year;
    const editWeek = week;
    const editWeekKey = `${editYear}:${editWeek}`;
    const pKey = pendingKey(editYear, editWeek, key);

    setLocalByWeek((prev) => ({
      ...prev,
      [editWeekKey]: { ...(prev[editWeekKey] ?? {}), [key]: v },
    }));
    setPending((prev) => {
      const next = new Set(prev);
      next.add(pKey);
      return next;
    });

    if (debounceRefs.current[pKey]) clearTimeout(debounceRefs.current[pKey]);
    debounceRefs.current[pKey] = setTimeout(() => {
      saveMut.mutate({
        year: editYear,
        week: editWeek,
        fieldKey: key,
        content: v,
      });
    }, 500);
  };

  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

  return (
    <div className="space-y-4" data-testid="page-weekly-review">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-purple-700" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Weekly Review
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Week</label>
          <Select
            value={String(week)}
            onValueChange={(v) => setWeek(Number(v))}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-week">
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

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="text-2xl font-bold" data-testid="text-week-heading">
            Week {week}
          </div>
        </CardContent>
      </Card>

      <SectionBlock
        label="Review"
        fields={REVIEW_FIELDS}
        values={localValues}
        onFieldChange={setField}
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start">
            <div className="text-base font-semibold italic text-muted-foreground">
              Planning
            </div>
            <div>
              <div className="font-semibold">Review Epic 2026</div>
              <div className="text-sm text-muted-foreground">
                Living Your Best Year Ever - 2026
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionBlock
        label=""
        fields={PLANNING_FIELDS}
        values={localValues}
        onFieldChange={setField}
      />
    </div>
  );
}

export default WeeklyReview;

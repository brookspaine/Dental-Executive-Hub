import { useMemo, useState } from "react";
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
  const currentWeek = useMemo(() => getISOWeek(new Date()), []);
  const [week, setWeek] = useState<number>(currentWeek);
  const [byWeek, setByWeek] = useState<Record<number, Record<string, string>>>(
    {},
  );

  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);
  const values = byWeek[week] || {};
  const setField = (key: string, v: string) => {
    setByWeek((prev) => ({
      ...prev,
      [week]: { ...(prev[week] || {}), [key]: v },
    }));
  };

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
        values={values}
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
        values={values}
        onFieldChange={setField}
      />
    </div>
  );
}

export default WeeklyReview;

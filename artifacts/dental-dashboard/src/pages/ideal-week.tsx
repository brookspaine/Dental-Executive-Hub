import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListIdealWeekRituals,
  useToggleIdealWeekCompletion,
  useListDailyTop3,
  useCreateDailyTop3,
  useUpdateDailyTop3,
  useDeleteDailyTop3,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
  Trash2,
  Star,
  Target,
  Sun,
  Rocket,
} from "lucide-react";
import {
  schedule,
  categoryColors,
  categoryLabels,
  DAYS,
  TIME_SLOTS,
  formatHour,
  type ScheduleBlock,
} from "@/data/ideal-week-schedule";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isCurrentWeek(monday: Date): boolean {
  const today = new Date();
  const currentMonday = getMonday(today);
  return formatDate(monday) === formatDate(currentMonday);
}

function isToday(d: Date): boolean {
  const today = new Date();
  return formatDate(d) === formatDate(today);
}

function useWeekCompletions(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["ideal-week-completions-range", startDate, endDate],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(
        `${base}api/ideal-week/completions?date=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) return [];
      return res.json();
    },
  });
}

type WeeklyItem = {
  id: number;
  title: string;
  completed: boolean;
  priority: number;
  weekStart: string;
  createdAt: string;
};

function useWeeklyTop3(weekStart: string) {
  return useQuery<WeeklyItem[]>({
    queryKey: ["weekly-top3", weekStart],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(
        `${base}api/ideal-week/weekly-top3?weekStart=${weekStart}`
      );
      if (!res.ok) return [];
      return res.json();
    },
  });
}

const MORNING_RITUAL_ITEMS = [
  { key: "devotional", label: "Daily Devotional" },
  { key: "journal", label: "Morning Journal Questions" },
  { key: "process", label: "Get it out on paper (process thoughts, decisions, think, etc)" },
  { key: "meditation", label: "Mindful Breathing/Meditation (Calm App)" },
  { key: "read", label: "Read (15 min) - personal growth and develop wisdom" },
];

const JOURNAL_PROMPTS = [
  { key: "grateful", label: "Something I am Grateful for this morning:" },
  { key: "stressors", label: "Current Stressors or Frogs:" },
  { key: "easy", label: "What would this fix look like if it were easy?:" },
];

type MorningRitualCompletion = {
  id: number;
  itemKey: string;
  date: string;
  completed: boolean;
};

type JournalResponse = {
  id: number;
  promptKey: string;
  date: string;
  response: string;
};

function useMorningRitual(date: string) {
  return useQuery<MorningRitualCompletion[]>({
    queryKey: ["morning-ritual", date],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/ideal-week/morning-ritual?date=${date}`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

function useJournalResponses(date: string) {
  return useQuery<JournalResponse[]>({
    queryKey: ["journal-responses", date],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/ideal-week/journal?date=${date}`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

function EditableItem({
  item,
  onToggle,
  onDelete,
  onRename,
}: {
  item: { id: number; title: string; completed: boolean };
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const editRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditValue(item.title);
    setEditing(true);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== item.title) {
      onRename(item.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 group p-2 rounded-md hover:bg-muted/50 transition-colors">
      <Checkbox
        checked={item.completed}
        onCheckedChange={(checked) => onToggle(item.id, checked === true)}
      />
      {editing ? (
        <Input
          ref={editRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 text-sm flex-1"
        />
      ) : (
        <span
          onClick={startEdit}
          className={`flex-1 text-sm cursor-pointer rounded px-1 -mx-1 hover:bg-muted transition-colors ${
            item.completed
              ? "line-through text-muted-foreground"
              : "font-medium"
          }`}
        >
          {item.title}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

function Big3Section({
  title,
  icon: Icon,
  items,
  completedCount,
  totalCount,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  canAdd,
  addPlaceholder,
}: {
  title: string;
  icon: React.ElementType;
  items: { id: number; title: string; completed: boolean }[];
  completedCount: number;
  totalCount: number;
  onAdd: (title: string) => void;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => void;
  canAdd: boolean;
  addPlaceholder: string;
}) {
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle("");
    inputRef.current?.focus();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          <Badge
            variant={completedCount === totalCount && totalCount > 0 ? "default" : "secondary"}
            className="text-xs"
          >
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <EditableItem
            key={item.id}
            item={item}
            onToggle={onToggle}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
        {canAdd && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={addPlaceholder}
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAdd}
              disabled={!newTitle.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {items.length === 0 && !canAdd && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No items yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function JournalPromptField({
  prompt,
  date,
  savedResponse,
}: {
  prompt: { key: string; label: string };
  date: string;
  savedResponse: string;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(savedResponse);
  const [dirty, setDirty] = useState(false);
  const base = import.meta.env.BASE_URL || "/";
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const saveResponse = useMutation({
    mutationFn: async (response: string) => {
      const res = await fetch(`${base}api/ideal-week/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptKey: prompt.key, date, response }),
      });
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["journal-responses", date] });
    },
  });

  const handleChange = (newVal: string) => {
    setValue(newVal);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveResponse.mutate(newVal);
    }, 800);
  };

  const handleBlur = () => {
    if (dirty) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      saveResponse.mutate(value);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <label className="text-xs font-medium text-muted-foreground whitespace-nowrap pt-2 min-w-[200px]">
        {prompt.label}
      </label>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Type your response..."
        rows={1}
        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y min-h-[36px]"
      />
    </div>
  );
}

function MorningRitualSection() {
  const queryClient = useQueryClient();
  const today = formatDate(new Date());
  const { data: completions = [] } = useMorningRitual(today);
  const { data: journalResponses = [] } = useJournalResponses(today);
  const base = import.meta.env.BASE_URL || "/";

  const toggleMorningItem = useMutation({
    mutationFn: async (data: { itemKey: string; date: string; completed: boolean }) => {
      const res = await fetch(`${base}api/ideal-week/morning-ritual/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["morning-ritual", today] }),
  });

  const isItemCompleted = (key: string) =>
    completions.some((c) => c.itemKey === key && c.completed);

  const completedCount = MORNING_RITUAL_ITEMS.filter((i) =>
    isItemCompleted(i.key)
  ).length;

  const getJournalResponse = (promptKey: string) =>
    journalResponses.find((r) => r.promptKey === promptKey)?.response || "";

  return (
    <Card className="border-t-0">
      <div className="rounded-t-lg px-6 py-3 flex items-center justify-between bg-[#f7e26d]">
        <div className="flex items-center gap-2 text-amber-900 font-semibold">
          <Sun className="h-4 w-4" />
          Morning Ritual
        </div>
      </div>
      <CardContent className="space-y-1">
        {MORNING_RITUAL_ITEMS.map((item) => {
          const checked = isItemCompleted(item.key);
          return (
            <div key={item.key}>
              <div className="flex items-center gap-3 p-2 rounded-md">
                <span className="text-muted-foreground">•</span>
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              </div>
              {item.key === "journal" && (
                <div className="ml-9 mt-1 mb-2 space-y-3 border-l-2 border-muted pl-4">
                  {JOURNAL_PROMPTS.map((prompt) => (
                    <JournalPromptField
                      key={prompt.key}
                      prompt={prompt}
                      date={today}
                      savedResponse={getJournalResponse(prompt.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const STARTUP_RITUAL_ITEMS = [
  "Daily Brainwashing Sheet or Words of Wisdom",
  "Review Weekly Goals and Yearly Goals",
  "Set Big 3",
  "Block Deep Work session(s)",
  "Time Journal catch-up",
  "If I decide it's important → Reply to Emails\n(be timely, reply quickly, don't do other's jobs for them)",
];

function StartupRitualSection() {
  return (
    <Card className="border-t-0">
      <div className="rounded-t-lg px-6 py-3 flex items-center justify-between bg-[#93c47d]">
        <div className="flex items-center gap-2 text-green-900 font-semibold">
          <Rocket className="h-4 w-4" />
          Startup Ritual
        </div>
      </div>
      <CardContent className="space-y-1">
        {STARTUP_RITUAL_ITEMS.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-2 rounded-md">
            <span className="text-muted-foreground mt-0.5">•</span>
            <span className="text-sm font-medium whitespace-pre-line">
              {item}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function IdealWeek() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const startStr = formatDate(weekDates[0]);
  const endStr = formatDate(weekDates[6]);

  const { data: rituals, isLoading: ritualsLoading } =
    useListIdealWeekRituals();
  const { data: completions, isLoading: completionsLoading } =
    useWeekCompletions(startStr, endStr);
  const toggleCompletion = useToggleIdealWeekCompletion();

  const { data: dailyTop3 = [] } = useListDailyTop3();
  const createDaily = useCreateDailyTop3();
  const updateDaily = useUpdateDailyTop3();
  const deleteDaily = useDeleteDailyTop3();

  const { data: weeklyTop3 = [] } = useWeeklyTop3(startStr);

  const base = import.meta.env.BASE_URL || "/";

  const createWeekly = useMutation({
    mutationFn: async (data: { title: string; priority: number; weekStart: string }) => {
      const res = await fetch(`${base}api/ideal-week/weekly-top3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["weekly-top3", startStr] }),
  });

  const updateWeekly = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; completed?: boolean; title?: string }) => {
      const res = await fetch(`${base}api/ideal-week/weekly-top3/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["weekly-top3", startStr] }),
  });

  const deleteWeekly = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${base}api/ideal-week/weekly-top3/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["weekly-top3", startStr] }),
  });

  const isLoading = ritualsLoading || completionsLoading;

  const goToPrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const goToNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToThisWeek = () => setWeekStart(getMonday(new Date()));

  const isCompleted = (ritualId: number, dateStr: string): boolean => {
    if (!completions) return false;
    return completions.some(
      (c: any) =>
        c.ritualId === ritualId &&
        (c.date === dateStr || c.date?.split("T")[0] === dateStr) &&
        c.completed
    );
  };

  const handleToggle = (ritualId: number, dateStr: string) => {
    const current = isCompleted(ritualId, dateStr);
    toggleCompletion.mutate(
      { data: { ritualId, date: dateStr, completed: !current } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["ideal-week-completions-range", startStr, endStr],
          });
        },
      }
    );
  };

  const getScoreForRitual = (ritualId: number): number => {
    return weekDates.filter((d) => isCompleted(ritualId, formatDate(d))).length;
  };

  const totalChecks = rituals
    ? rituals.reduce((sum, r) => sum + getScoreForRitual(r.id), 0)
    : 0;
  const totalPossible = (rituals?.length ?? 0) * 7;
  const weeklyPercent =
    totalPossible > 0 ? Math.round((totalChecks / totalPossible) * 100) : 0;

  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const dailyCompleted = dailyTop3.filter((i) => i.completed).length;
  const weeklyCompleted = weeklyTop3.filter((i) => i.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ideal Week</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Weekly scorecard and schedule template
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold">
                {isCurrentWeek(weekStart) ? "This Week" : weekLabel}
              </p>
              {isCurrentWeek(weekStart) && (
                <p className="text-xs text-muted-foreground">{weekLabel}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!isCurrentWeek(weekStart) && (
                <Button variant="outline" size="sm" onClick={goToThisWeek}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  This Week
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Big3Section
          title="Today's Big 3"
          icon={Star}
          items={dailyTop3}
          completedCount={dailyCompleted}
          totalCount={dailyTop3.length}
          canAdd={dailyTop3.length < 3}
          addPlaceholder="Add today's priority..."
          onAdd={(title) =>
            createDaily.mutate({
              data: { title, priority: dailyTop3.length + 1 },
            })
          }
          onToggle={(id, completed) =>
            updateDaily.mutate({ id, data: { completed } })
          }
          onDelete={(id) => deleteDaily.mutate({ id })}
          onRename={(id, title) =>
            updateDaily.mutate({ id, data: { title } })
          }
        />
        <Big3Section
          title="This Week's Big 3"
          icon={Target}
          items={weeklyTop3}
          completedCount={weeklyCompleted}
          totalCount={weeklyTop3.length}
          canAdd={weeklyTop3.length < 3}
          addPlaceholder="Add weekly priority..."
          onAdd={(title) =>
            createWeekly.mutate({
              title,
              priority: weeklyTop3.length + 1,
              weekStart: startStr,
            })
          }
          onToggle={(id, completed) => updateWeekly.mutate({ id, completed })}
          onDelete={(id) => deleteWeekly.mutate(id)}
          onRename={(id, title) => updateWeekly.mutate({ id, title })}
        />
      </div>

      <MorningRitualSection />

      <StartupRitualSection />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Weekly Score</span>
            <span className="text-sm text-muted-foreground">
              {totalChecks}/{totalPossible} ({weeklyPercent}%)
            </span>
          </div>
          <Progress value={weeklyPercent} className="h-2.5" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Scorecard</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-muted-foreground min-w-[200px]">
                      Habit
                    </th>
                    {weekDates.map((d, i) => (
                      <th
                        key={i}
                        className={`p-2 text-center font-semibold min-w-[52px] ${
                          isToday(d)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div className="text-xs">{DAYS[i]}</div>
                        <div className="text-xs font-normal">{d.getDate()}</div>
                      </th>
                    ))}
                    <th className="p-2 text-center font-semibold text-muted-foreground min-w-[52px]">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rituals?.map((ritual, idx) => {
                    const score = getScoreForRitual(ritual.id);
                    return (
                      <tr
                        key={ritual.id}
                        className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                          idx % 2 === 0 ? "" : "bg-muted/10"
                        }`}
                      >
                        <td className="p-3 font-medium text-sm">
                          {ritual.name}
                        </td>
                        {weekDates.map((d, i) => {
                          const dateStr = formatDate(d);
                          const checked = isCompleted(ritual.id, dateStr);
                          return (
                            <td
                              key={i}
                              className={`p-2 text-center ${
                                isToday(d) ? "bg-primary/5" : ""
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  handleToggle(ritual.id, dateStr)
                                }
                                className="h-4.5 w-4.5 mx-auto"
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 text-center">
                          <span
                            className={`text-xs font-bold ${
                              score === 7
                                ? "text-emerald-600"
                                : score >= 5
                                  ? "text-blue-600"
                                  : score >= 3
                                    ? "text-amber-600"
                                    : "text-muted-foreground"
                            }`}
                          >
                            {score}/7
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Schedule Template</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(categoryLabels).map(([key, label]) => {
              const c = categoryColors[key];
              return (
                <span
                  key={key}
                  className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text} font-medium`}
                >
                  {label}
                </span>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0.5">
                <div className="h-8" />
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted/50 rounded-t"
                  >
                    {day}
                  </div>
                ))}

                {TIME_SLOTS.map((hour) => (
                  <div key={hour} className="contents">
                    <div className="h-14 flex items-start justify-end pr-2 text-xs text-muted-foreground pt-0.5">
                      {formatHour(hour)}
                    </div>
                    {DAYS.map((day) => {
                      const blocks = schedule[day] || [];
                      const block = blocks.find(
                        (b) => hour >= b.start && hour < b.start + b.duration
                      );
                      const isBlockStart =
                        block && hour === Math.floor(block.start);
                      const c = block ? categoryColors[block.category] : null;

                      if (block && !isBlockStart) {
                        return (
                          <div
                            key={day}
                            className={`h-14 border-x ${c?.bg} ${c?.border}`}
                          />
                        );
                      }

                      if (block && isBlockStart) {
                        return (
                          <div
                            key={day}
                            className={`h-14 border rounded-t text-xs font-medium flex items-start justify-center pt-1 ${c?.bg} ${c?.text} ${c?.border}`}
                          >
                            <span className="truncate px-0.5 text-center leading-tight">
                              {block.label}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={day}
                          className="h-14 border border-dashed border-muted bg-background"
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

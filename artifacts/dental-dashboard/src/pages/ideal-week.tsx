import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListIdealWeekRituals,
  useToggleIdealWeekCompletion,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
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

export function IdealWeek() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const startStr = formatDate(weekDates[0]);
  const endStr = formatDate(weekDates[6]);

  const { data: rituals, isLoading: ritualsLoading } = useListIdealWeekRituals();
  const { data: completions, isLoading: completionsLoading } = useWeekCompletions(startStr, endStr);
  const toggleCompletion = useToggleIdealWeekCompletion();

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

  const getBlockStyle = (block: ScheduleBlock) => {
    const top = (block.start - 6) * 3.5;
    const height = block.duration * 3.5;
    return { top: `${top}rem`, height: `${height}rem` };
  };

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
                      const isBlockStart = block && hour === Math.floor(block.start);
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

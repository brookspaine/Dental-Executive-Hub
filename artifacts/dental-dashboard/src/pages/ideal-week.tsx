import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListIdealWeekRituals,
  useListIdealWeekCompletions,
  useToggleIdealWeekCompletion,
  getListIdealWeekCompletionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunrise,
  Sunset,
  BookOpen,
  Brain,
  Target,
  Calendar,
  CalendarDays,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const ritualIcons: Record<string, any> = {
  "Morning Ritual": Sunrise,
  "Morning Journal": BookOpen,
  "Startup Rituals": Sun,
  "Daily Big 3": Target,
  "Daily Brainwashing": Brain,
  "Shutdown Rituals": Sunset,
  "Evening Ritual Reflection": Sparkles,
  "Weekly Review": Calendar,
  "Monthly Review": CalendarDays,
};

const ritualColors: Record<string, { text: string; bg: string }> = {
  "Morning Ritual": { text: "text-amber-600", bg: "bg-amber-50" },
  "Morning Journal": { text: "text-blue-600", bg: "bg-blue-50" },
  "Startup Rituals": { text: "text-orange-600", bg: "bg-orange-50" },
  "Daily Big 3": { text: "text-emerald-600", bg: "bg-emerald-50" },
  "Daily Brainwashing": { text: "text-violet-600", bg: "bg-violet-50" },
  "Shutdown Rituals": { text: "text-rose-600", bg: "bg-rose-50" },
  "Evening Ritual Reflection": { text: "text-indigo-600", bg: "bg-indigo-50" },
  "Weekly Review": { text: "text-teal-600", bg: "bg-teal-50" },
  "Monthly Review": { text: "text-pink-600", bg: "bg-pink-50" },
};

const frequencyLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  daily: { label: "Daily", variant: "default" },
  weekly: { label: "Weekly", variant: "secondary" },
  monthly: { label: "Monthly", variant: "outline" },
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

export function IdealWeek() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = formatDate(selectedDate);

  const { data: rituals, isLoading: ritualsLoading } = useListIdealWeekRituals();
  const { data: completions, isLoading: completionsLoading } = useListIdealWeekCompletions({ date: dateStr });
  const toggleCompletion = useToggleIdealWeekCompletion();

  const isLoading = ritualsLoading || completionsLoading;

  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isRitualCompleted = (ritualId: number) => {
    return completions?.some((c) => c.ritualId === ritualId && c.completed) ?? false;
  };

  const handleToggle = (ritualId: number) => {
    const currentlyCompleted = isRitualCompleted(ritualId);
    toggleCompletion.mutate(
      { data: { ritualId, date: dateStr, completed: !currentlyCompleted } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListIdealWeekCompletionsQueryKey({ date: dateStr }),
          });
        },
      }
    );
  };

  const dailyRituals = rituals?.filter((r) => r.frequency === "daily") ?? [];
  const weeklyRituals = rituals?.filter((r) => r.frequency === "weekly") ?? [];
  const monthlyRituals = rituals?.filter((r) => r.frequency === "monthly") ?? [];

  const completedCount = rituals?.filter((r) => isRitualCompleted(r.id)).length ?? 0;
  const totalCount = rituals?.length ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const renderRitualItem = (ritual: { id: number; name: string; frequency: string }) => {
    const completed = isRitualCompleted(ritual.id);
    const Icon = ritualIcons[ritual.name] || Target;
    const colors = ritualColors[ritual.name] || { text: "text-gray-600", bg: "bg-gray-50" };
    const freq = frequencyLabels[ritual.frequency] || frequencyLabels.daily;

    return (
      <div
        key={ritual.id}
        className={`flex items-center gap-4 p-3.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
          completed
            ? "bg-muted/50 border-muted"
            : "bg-card border-border hover:border-primary/30"
        }`}
        onClick={() => handleToggle(ritual.id)}
      >
        <Checkbox
          checked={completed}
          onCheckedChange={() => handleToggle(ritual.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5"
        />
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.text}`} />
        </div>
        <span
          className={`flex-1 text-sm font-medium ${
            completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {ritual.name}
        </span>
        <Badge variant={freq.variant} className="text-xs">
          {freq.label}
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ideal Week</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track your daily rituals and routines
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold">
                {isToday(selectedDate) ? "Today" : formatDisplayDate(selectedDate)}
              </p>
              {isToday(selectedDate) && (
                <p className="text-xs text-muted-foreground">{formatDisplayDate(selectedDate)}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!isToday(selectedDate) && (
                <Button variant="outline" size="sm" onClick={goToToday}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Today
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Daily Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} completed
            </span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          {progressPercent === 100 && (
            <p className="text-xs text-emerald-600 font-medium mt-2 text-center">
              All rituals completed! Great work!
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {dailyRituals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Daily Rituals
              </h3>
              {dailyRituals.map(renderRitualItem)}
            </div>
          )}

          {weeklyRituals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Weekly Rituals
              </h3>
              {weeklyRituals.map(renderRitualItem)}
            </div>
          )}

          {monthlyRituals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Rituals
              </h3>
              {monthlyRituals.map(renderRitualItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

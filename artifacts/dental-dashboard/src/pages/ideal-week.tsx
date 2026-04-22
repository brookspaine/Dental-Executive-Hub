import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListIdealWeekRituals,
  useToggleIdealWeekCompletion,
  useListDailyTop3,
  useCreateDailyTop3,
  useUpdateDailyTop3,
  useDeleteDailyTop3,
  getListDailyTop3QueryKey,
  useListScheduleBlocks,
  useCreateScheduleBlock,
  useUpdateScheduleBlock,
  useDeleteScheduleBlock,
  getListScheduleBlocksQueryKey,
  useListWisdomQuotes,
  useGetTodayWisdomQuotes,
  useCreateWisdomQuote,
  useDeleteWisdomQuote,
  getListWisdomQuotesQueryKey,
  getGetTodayWisdomQuotesQueryKey,
} from "@workspace/api-client-react";
import type { ScheduleBlock as ScheduleBlockType } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Moon,
  ClipboardCheck,
  Calendar,
  BarChart3,
  Pencil,
  Check,
  X,
  Anchor,
  Brain,
  Zap,
  Heart,
  Stethoscope,
  BookOpen,
  ChevronDown,
  CalendarDays,
  Copy,
  Play,
  Pause,
  Square,
  Loader2,
} from "lucide-react";
import {
  categoryColors,
  categoryLabels,
  DAYS,
  TIME_SLOTS,
  formatHour,
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

function isDayToday(day: string, weekStart: Date): boolean {
  const dayIndex = DAYS.indexOf(day as typeof DAYS[number]);
  if (dayIndex < 0) return false;
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  return isToday(d);
}

function formatTimeRange(start: number, end: number): string {
  const fmt = (t: number) => {
    const h = Math.floor(t) % 12 || 12;
    const m = t % 1 >= 0.5 ? "30" : "00";
    const ampm = t < 12 ? "AM" : "PM";
    return `${h}:${m}${ampm}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}

const HOUR_HEIGHT = 34;
const FIRST_HOUR = 6;
const LAST_HOUR = 21;
const GRID_HEIGHT = (LAST_HOUR - FIRST_HOUR) * HOUR_HEIGHT;

const snapToHalf = (h: number) => Math.round(h * 2) / 2;
const clampHour = (h: number) => Math.max(FIRST_HOUR, Math.min(LAST_HOUR, h));

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

const EVENING_PROMPTS = [
  { key: "evening_handled_well", label: "A situation or task I handled well today:" },
  { key: "evening_coach", label: "If I was my own high performance coach, I'd tell myself today:" },
  { key: "evening_mice_antelopes", label: "Did I spend today chasing field mice or hunting antelopes?" },
  { key: "evening_time_energy", label: "How could I have managed my time and energy better today?" },
  { key: "evening_learned", label: "Something I realized or learned today is..." },
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

function DailyBrainwashing() {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const category = "brainwashing";
  const { data: items = [] } = useRitualItems(category);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const createItem = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch(`${base}api/ideal-week/ritual-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, label, sortOrder: items.length }),
      });
      return res.json();
    },
    onSuccess: () => {
      setNewLabel("");
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: ["ritual-items", category] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${base}api/ideal-week/ritual-items/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ritual-items", category] });
    },
  });

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) {
      setAdding(false);
      return;
    }
    createItem.mutate(label);
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-primary" />
          Daily Brainwashing
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {items.map((item) => (
          <BrainwashingItemRow
            key={item.id}
            item={item}
            category={category}
            onDelete={() => deleteItem.mutate(item.id)}
          />
        ))}

        {adding && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-primary select-none leading-none">•</span>
            <Input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                } else if (e.key === "Escape") {
                  setAdding(false);
                  setNewLabel("");
                }
              }}
              onBlur={handleAdd}
              placeholder="New principle…"
              className="h-8 text-sm"
            />
          </div>
        )}

        {items.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground italic py-1">
            No items yet — click Add to create one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BrainwashingItemRow({
  item,
  category,
  onDelete,
}: {
  item: { id: number; label: string };
  category: string;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const [value, setValue] = useState(item.label);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!dirty) setValue(item.label);
  }, [item.label, dirty]);

  const updateItem = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch(`${base}api/ideal-week/ritual-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["ritual-items", category] });
    },
  });

  const handleChange = (newVal: string) => {
    setValue(newVal);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateItem.mutate(newVal);
    }, 800);
  };

  const handleBlur = () => {
    if (dirty) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      updateItem.mutate(value);
    }
  };

  return (
    <div className="group flex items-center gap-2 py-0.5 rounded hover:bg-muted/40">
      <span className="text-primary select-none leading-none">•</span>
      <div
        contentEditable
        suppressContentEditableWarning
        className="text-sm leading-relaxed flex-1 outline-none focus:bg-muted/50 rounded px-1 -mx-1 cursor-text whitespace-pre-wrap"
        onInput={(e) => handleChange(e.currentTarget.textContent || "")}
        onBlur={handleBlur}
      >
        {value}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={onDelete}
        aria-label="Delete item"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

function WordsOfWisdom() {
  const queryClient = useQueryClient();
  const { data: todayQuotes = [], isLoading: todayLoading } =
    useGetTodayWisdomQuotes();
  const { data: allQuotes = [] } = useListWisdomQuotes();

  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [newText, setNewText] = useState("");
  const [newAuthor, setNewAuthor] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListWisdomQuotesQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetTodayWisdomQuotesQueryKey(),
    });
  };

  const createQuote = useCreateWisdomQuote({
    mutation: { onSuccess: invalidate },
  });
  const deleteQuote = useDeleteWisdomQuote({
    mutation: { onSuccess: invalidate },
  });

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) {
      setAdding(false);
      return;
    }
    createQuote.mutate({
      data: { text, author: newAuthor.trim() || undefined },
    });
    setNewText("");
    setNewAuthor("");
    setAdding(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          Words of Wisdom
        </CardTitle>
        <div className="flex items-center gap-1">
          {allQuotes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setManaging((m) => !m)}
            >
              {managing ? "Done" : `Manage (${allQuotes.length})`}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {todayLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : todayQuotes.length > 0 ? (
          <div className="space-y-3">
            {todayQuotes.map((q) => (
              <div
                key={q.id}
                className="border-l-2 border-primary/40 pl-3 py-1"
              >
                <p className="text-sm leading-relaxed italic text-foreground/90">
                  <span className="text-primary/60 select-none mr-0.5">
                    &ldquo;
                  </span>
                  {q.text}
                  <span className="text-primary/60 select-none ml-0.5">
                    &rdquo;
                  </span>
                </p>
                {q.author && (
                  <p className="text-xs text-muted-foreground mt-1">
                    — {q.author}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !adding && (
            <p className="text-sm text-muted-foreground italic py-1">
              No quotes yet — add some to start receiving 3 each day.
            </p>
          )
        )}

        {adding && (
          <div className="space-y-2 pt-1 border-t">
            <Input
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                } else if (e.key === "Escape") {
                  setAdding(false);
                  setNewText("");
                  setNewAuthor("");
                }
              }}
              placeholder="Quote text…"
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <Input
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  } else if (e.key === "Escape") {
                    setAdding(false);
                    setNewText("");
                    setNewAuthor("");
                  }
                }}
                placeholder="Author (optional)"
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" className="h-8" onClick={handleAdd}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setAdding(false);
                  setNewText("");
                  setNewAuthor("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {managing && allQuotes.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">
              Quote pool ({allQuotes.length})
            </p>
            {allQuotes.map((q) => (
              <div
                key={q.id}
                className="group flex items-start gap-2 py-1 rounded hover:bg-muted/40 px-1"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug truncate">
                    &ldquo;{q.text}&rdquo;
                    {q.author && (
                      <span className="text-muted-foreground"> — {q.author}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={() => deleteQuote.mutate({ id: q.id })}
                  aria-label="Delete quote"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
    <div className="space-y-0.5">
      <label className="text-[10px] font-medium text-muted-foreground leading-tight block">
        {prompt.label}
      </label>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Type your response..."
        rows={1}
        className="w-full rounded border border-input bg-background px-2 py-1 text-[11px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[24px]"
      />
    </div>
  );
}

function useRitualItems(category: string) {
  const base = import.meta.env.BASE_URL || "/";
  return useQuery({
    queryKey: ["ritual-items", category],
    queryFn: async () => {
      const res = await fetch(`${base}api/ideal-week/ritual-items?category=${category}`);
      return res.json() as Promise<{ id: number; category: string; label: string; sortOrder: number }[]>;
    },
  });
}

type DevotionalPayload = {
  title: string;
  url: string;
  paragraphs: string[];
  text: string;
};

const DEVOTIONAL_VOICES = [
  { id: "onyx", label: "Onyx (deep male)" },
  { id: "echo", label: "Echo (warm male)" },
  { id: "fable", label: "Fable (British male)" },
  { id: "alloy", label: "Alloy (neutral)" },
  { id: "nova", label: "Nova (warm female)" },
  { id: "shimmer", label: "Shimmer (bright female)" },
] as const;

function DailyDevotionalPlayer() {
  const base = import.meta.env.BASE_URL || "/";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DevotionalPayload | null>(null);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState<string>(() => {
    if (typeof window === "undefined") return "onyx";
    return window.localStorage.getItem("devotional-voice") || "onyx";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("devotional-voice", voice);
    }
  }, [voice]);

  const ensureLoaded = async (): Promise<DevotionalPayload | null> => {
    if (data) return data;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}api/daily-devotional`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as DevotionalPayload;
      setData(payload);
      return payload;
    } catch (e) {
      setError((e as Error).message || "Failed to load");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) {
      setOpen(true);
      await ensureLoaded();
      return;
    }
    setOpen(false);
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Resume if paused
    if (audioRef.current && !audioRef.current.ended && audioRef.current.currentTime > 0 && audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {}
      return;
    }

    setError(null);
    setAudioLoading(true);
    try {
      // Stop any prior audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      const audio = new Audio(`${base}api/daily-devotional/audio?voice=${voice}&t=${Date.now()}`);
      audio.preload = "auto";
      audio.onended = () => {
        setPlaying(false);
      };
      audio.onerror = () => {
        setError("Audio failed to load. Try again.");
        setPlaying(false);
        setAudioLoading(false);
      };
      audio.onplaying = () => {
        setAudioLoading(false);
        setPlaying(true);
      };
      audio.onpause = () => {
        if (!audio.ended) setPlaying(false);
      };
      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      setError((err as Error).message || "Playback failed");
      setAudioLoading(false);
      setPlaying(false);
    }
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlaying(false);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlaying(false);
    setAudioLoading(false);
  };

  const handleVoiceChange = (newVoice: string) => {
    setVoice(newVoice);
    // Stop current playback when switching voices
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlaying(false);
    setAudioLoading(false);
  };

  return (
    <>
      <div className="flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
        {!playing && (
          <button
            type="button"
            onClick={handlePlay}
            disabled={audioLoading}
            title="Read devotional aloud (AI voice)"
            className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-muted text-primary disabled:opacity-50"
          >
            {audioLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          </button>
        )}
        {playing && (
          <button
            type="button"
            onClick={handlePause}
            title="Pause"
            className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-muted text-primary"
          >
            <Pause className="h-3 w-3" />
          </button>
        )}
        {(playing || audioLoading || (audioRef.current && !audioRef.current.ended)) && (
          <button
            type="button"
            onClick={handleStop}
            title="Stop"
            className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <Square className="h-3 w-3" />
          </button>
        )}
        <button
          type="button"
          onClick={handleToggle}
          title={open ? "Hide text" : "Show text"}
          className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="basis-full ml-5 mt-1 mb-1 p-2 rounded-md bg-muted/40 border border-border max-h-64 overflow-y-auto">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Voice:</span>
            <select
              value={voice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="text-[10px] bg-background border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {DEVOTIONAL_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            {audioLoading && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Generating…
              </span>
            )}
          </div>
          {loading && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading today's devotional…
            </div>
          )}
          {error && (
            <div className="text-[10px] text-destructive">Error: {error}</div>
          )}
          {data && (
            <div className="space-y-1.5">
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                {data.title}
              </a>
              {data.paragraphs.map((p, i) => (
                <p key={i} className="text-[10.5px] leading-snug text-foreground whitespace-pre-wrap">
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function EditableRitualItem({
  item,
  category,
  journalPrompts,
  journalResponses,
}: {
  item: { id: number; label: string };
  category: string;
  journalPrompts?: { key: string; label: string }[];
  journalResponses?: { promptKey: string; response: string }[];
}) {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const [value, setValue] = useState(item.label);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const labelToHtml = (label: string) =>
    label.replace(
      /(https?:\/\/\S+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[10px] text-primary underline">$1</a>'
    );

  // The HTML used for `dangerouslySetInnerHTML` is intentionally only updated
  // when the user is NOT actively editing. While `dirty` is true (i.e., the
  // user is typing), we keep returning the same string so React leaves the
  // contentEditable's DOM completely alone — otherwise each re-render would
  // rewrite innerHTML and reset the caret to position 0 (which made letters
  // appear in reverse order).
  const [stableHtml, setStableHtml] = useState(() => labelToHtml(item.label));
  useEffect(() => {
    if (!dirty) {
      const next = labelToHtml(item.label);
      setStableHtml((prev) => (prev === next ? prev : next));
      setValue(item.label);
    }
  }, [item.label, dirty]);

  const updateItem = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch(`${base}api/ideal-week/ritual-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      return res.json();
    },
    onSuccess: (updated: any) => {
      setDirty(false);
      // Patch the cached list in place instead of invalidating, so the
      // contentEditable is not torn down/re-rendered while the user types.
      queryClient.setQueriesData(
        { queryKey: ["ritual-items", category] },
        (prev: any) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((it: any) =>
            it && it.id === item.id ? { ...it, ...updated } : it
          );
        }
      );
    },
  });

  const handleChange = (newVal: string) => {
    setValue(newVal);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateItem.mutate(newVal);
    }, 800);
  };

  const handleBlur = () => {
    if (dirty) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      updateItem.mutate(value);
    }
  };

  const today = formatDate(new Date());
  const showJournalPrompts =
    journalPrompts &&
    journalResponses &&
    (item.label.toLowerCase().includes("journal questions") ||
      item.label.toLowerCase().includes("evening ritual reflection"));
  const isDailyDevotional = item.label
    .toLowerCase()
    .includes("daily devotional");
  const isLivingYourBestYearEver = item.label
    .toLowerCase()
    .includes("living your best year ever");

  return (
    <div>
      <div className="flex items-center gap-1.5 px-1 py-0.5 rounded-md">
        <span className="text-muted-foreground text-[10px] leading-none">•</span>
        {isLivingYourBestYearEver ? (
          <a
            href={`${base}living-your-best-year-ever`}
            className="text-[11px] leading-tight font-medium flex-1 text-primary underline hover:text-primary/80 cursor-pointer"
          >
            {item.label}
          </a>
        ) : (
          <div
            contentEditable
            suppressContentEditableWarning
            className="text-[11px] leading-tight font-medium flex-1 outline-none focus:bg-muted/30 rounded px-0.5 cursor-text min-h-[16px] whitespace-pre-wrap"
            onInput={(e) => handleChange(e.currentTarget.textContent || "")}
            onBlur={handleBlur}
            dangerouslySetInnerHTML={{ __html: stableHtml }}
          />
        )}
        {isDailyDevotional && <DailyDevotionalPlayer />}
      </div>
      {showJournalPrompts && (
        <div className="ml-5 mt-0.5 mb-1 space-y-2 border-l-2 border-muted pl-3">
          {journalPrompts!.map((prompt) => (
            <JournalPromptField
              key={prompt.key}
              prompt={prompt}
              date={today}
              savedResponse={
                journalResponses!.find((r) => r.promptKey === prompt.key)?.response || ""
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EditableRitualSection({
  category,
  title,
  icon: Icon,
  bannerColor,
  textColor,
  journalPrompts,
}: {
  category: string;
  title: string;
  icon: LucideIcon;
  bannerColor: string;
  textColor: string;
  journalPrompts?: { key: string; label: string }[];
}) {
  const { data: items = [] } = useRitualItems(category);

  const today = formatDate(new Date());
  const { data: journalResponses = [] } = useJournalResponses(today);

  return (
    <Card className="border-t-0">
      <div className={`rounded-t-lg px-3 py-1.5 flex items-center justify-between ${bannerColor}`}>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${textColor}`}>
          <Icon className="h-3 w-3" />
          {title}
        </div>
      </div>
      <CardContent className="px-3 py-1.5 space-y-0">
        {items.map((item) => (
          <EditableRitualItem
            key={item.id}
            item={item}
            category={category}
            journalPrompts={journalPrompts}
            journalResponses={journalResponses as any}
          />
        ))}
      </CardContent>
    </Card>
  );
}

const DURATION_OPTIONS = [
  { value: "0.5", label: "30 min" },
  { value: "1", label: "1 hour" },
  { value: "1.5", label: "1.5 hours" },
  { value: "2", label: "2 hours" },
  { value: "2.5", label: "2.5 hours" },
  { value: "3", label: "3 hours" },
  { value: "3.5", label: "3.5 hours" },
  { value: "4", label: "4 hours" },
  { value: "4.5", label: "4.5 hours" },
  { value: "5", label: "5 hours" },
  { value: "5.5", label: "5.5 hours" },
  { value: "6", label: "6 hours" },
];

const START_TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const t = 6 + i * 0.5;
  const h = Math.floor(t) % 12 || 12;
  const m = t % 1 === 0.5 ? "30" : "00";
  const ampm = t < 12 ? "AM" : "PM";
  return { value: String(t), label: `${h}:${m} ${ampm}` };
});

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  calendarName: string;
  calendarColor: string;
};

type CalendarData = {
  calendars: { id: string; name: string; color: string }[];
  events: CalendarEvent[];
};

function useCalendarEvents(timeMin: string, timeMax: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  return useQuery({
    queryKey: ["calendar-events", timeMin, timeMax],
    queryFn: async () => {
      const params = new URLSearchParams({ timeMin, timeMax });
      const res = await fetch(`${base}/api/ideal-week/calendar-events?${params}`);
      if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
      return res.json() as Promise<CalendarData>;
    },
    staleTime: 60000,
  });
}

type ReadingItem = { id: number; title: string; completed: boolean; sortOrder: number };

function useReadingList() {
  const base = import.meta.env.BASE_URL || "/";
  return useQuery({
    queryKey: ["reading-list"],
    queryFn: async () => {
      const res = await fetch(`${base}api/ideal-week/reading-list`);
      return res.json() as Promise<ReadingItem[]>;
    },
  });
}

function ReadingListItem({ item }: { item: ReadingItem }) {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const [value, setValue] = useState(item.title);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!dirty) setValue(item.title);
  }, [item.title, dirty]);

  const patchItem = useMutation({
    mutationFn: async (body: Partial<{ title: string; completed: boolean }>) => {
      const res = await fetch(`${base}api/ideal-week/reading-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["reading-list"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async () => {
      await fetch(`${base}api/ideal-week/reading-list/${item.id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-list"] });
    },
  });

  const handleChange = (newVal: string) => {
    setValue(newVal);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patchItem.mutate({ title: newVal });
    }, 800);
  };

  const handleBlur = () => {
    if (dirty) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      patchItem.mutate({ title: value });
    }
  };

  return (
    <li className="group flex items-center gap-1.5 text-sm">
      <Checkbox
        checked={item.completed}
        onCheckedChange={(checked) => patchItem.mutate({ completed: !!checked })}
        className="h-3.5 w-3.5 shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={`flex-1 bg-transparent outline-none focus:bg-muted/30 rounded px-0.5 py-0.5 ${item.completed ? "line-through text-muted-foreground" : "text-foreground/80"}`}
      />
      <button
        onClick={() => deleteItem.mutate()}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </li>
  );
}

function ReadingList() {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { data: items = [] } = useReadingList();
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`${base}api/ideal-week/reading-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-list"] });
      setNewTitle("");
      setAdding(false);
    },
  });

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Reading List</span>
          <span className="text-xs text-muted-foreground">({items.length} books)</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <CardContent className="pt-0 pb-3 px-4">
          <ul className="space-y-1">
            {items.map((item) => (
              <ReadingListItem key={item.id} item={item} />
            ))}
          </ul>
          {adding ? (
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Book title..."
                className="text-sm h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTitle.trim()) addItem.mutate(newTitle.trim());
                  if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
                }}
              />
              <Button size="sm" className="h-8" onClick={() => newTitle.trim() && addItem.mutate(newTitle.trim())}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-2 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add book
            </button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function WeeklyScheduleTemplate({ weekStart }: { weekStart: Date }) {
  const queryClient = useQueryClient();
  const { data: blocks = [], isLoading } = useListScheduleBlocks();
  const createBlock = useCreateScheduleBlock();
  const updateBlock = useUpdateScheduleBlock();
  const deleteBlock = useDeleteScheduleBlock();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlockType | null>(null);
  const [formDay, setFormDay] = useState<string>("Mon");
  const [formStart, setFormStart] = useState<string>("9");
  const [formDuration, setFormDuration] = useState<string>("1");
  const [formLabel, setFormLabel] = useState("");
  const [formCategory, setFormCategory] = useState<string>("deepwork");

  type DragState = {
    type: "create" | "resize" | "resize-top" | "move";
    day: string;
    startHour: number;
    currentHour: number;
    currentDay: string;
    blockId?: number;
    offsetHour?: number;
    columnsRect: DOMRect;
    columnBodyTop: number;
  };
  const [dragState, setDragState] = useState<DragState | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);

  type ClipboardBlock = { label: string; duration: number; category: string };
  type ContextMenu = { x: number; y: number; day: string; hour: number; block?: ScheduleBlockType };
  const [clipboard, setClipboard] = useState<ClipboardBlock | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
    };
  }, [contextMenu]);

  function handleContextMenu(e: React.MouseEvent, day: string, block?: ScheduleBlockType) {
    e.preventDefault();
    e.stopPropagation();
    const colEl = (e.currentTarget as HTMLElement).closest("[data-day-column]") as HTMLElement;
    if (!colEl) return;
    const colRect = colEl.getBoundingClientRect();
    const hour = clampHour(snapToHalf(FIRST_HOUR + (e.clientY - colRect.top) / HOUR_HEIGHT));
    setContextMenu({ x: e.clientX, y: e.clientY, day, hour, block });
  }

  function handleCopy() {
    if (!contextMenu?.block) return;
    const b = contextMenu.block;
    setClipboard({ label: b.label, duration: b.duration, category: b.category });
    setContextMenu(null);
  }

  function handleDuplicate() {
    if (!contextMenu?.block) return;
    const b = contextMenu.block;
    const inv = () => queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });
    createBlock.mutate({ data: { day: b.day, start: b.start, duration: b.duration, label: b.label, category: b.category } }, { onSuccess: inv });
    setContextMenu(null);
  }

  function handlePaste() {
    if (!clipboard || !contextMenu) return;
    const inv = () => queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });
    createBlock.mutate({ data: { day: contextMenu.day, start: contextMenu.hour, duration: clipboard.duration, label: clipboard.label, category: clipboard.category } }, { onSuccess: inv });
    setContextMenu(null);
  }

  function handleContextDelete() {
    if (!contextMenu?.block) return;
    const inv = () => queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });
    deleteBlock.mutate({ id: contextMenu.block.id }, { onSuccess: inv });
    setContextMenu(null);
  }

  useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e: MouseEvent) => {
      const colWidth = dragState.columnsRect.width / 7;
      const dayIndex = Math.max(0, Math.min(6, Math.floor((e.clientX - dragState.columnsRect.left) / colWidth)));
      const currentDay = DAYS[dayIndex];
      const currentHour = clampHour(snapToHalf(FIRST_HOUR + (e.clientY - dragState.columnBodyTop) / HOUR_HEIGHT));
      setDragState(prev => prev ? { ...prev, currentHour, currentDay } : null);
    };
    const handleMouseUp = () => {
      setDragState(prev => {
        if (!prev) return null;
        if (prev.type === "create") {
          const minH = Math.min(prev.startHour, prev.currentHour);
          const maxH = Math.max(prev.startHour, prev.currentHour);
          const duration = maxH - minH;
          if (duration < 0.5) {
            openCreateDialog(prev.day, prev.startHour);
          } else {
            setFormDay(prev.currentDay);
            setFormStart(String(minH));
            setFormDuration(String(duration));
            setFormLabel("");
            setFormCategory("deepwork");
            setEditingBlock(null);
            setDialogOpen(true);
          }
        } else if (prev.type === "resize" && prev.blockId) {
          const block = blocks.find(b => b.id === prev.blockId);
          if (block) {
            const newDuration = Math.max(0.5, snapToHalf(prev.currentHour - block.start));
            if (newDuration !== block.duration) {
              const inv = () => queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });
              updateBlock.mutate({ id: block.id, data: { duration: newDuration } }, { onSuccess: inv });
            }
          }
        } else if (prev.type === "resize-top" && prev.blockId) {
          const block = blocks.find(b => b.id === prev.blockId);
          if (block) {
            const blockEnd = block.start + block.duration;
            const newStart = Math.min(snapToHalf(prev.currentHour), blockEnd - 0.5);
            const clampedStart = clampHour(newStart);
            const newDuration = Math.max(0.5, snapToHalf(blockEnd - clampedStart));
            if (clampedStart !== block.start || newDuration !== block.duration) {
              const inv = () => queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });
              updateBlock.mutate({ id: block.id, data: { start: clampedStart, duration: newDuration } }, { onSuccess: inv });
            }
          }
        } else if (prev.type === "move" && prev.blockId) {
          const block = blocks.find(b => b.id === prev.blockId);
          if (block) {
            const newStart = snapToHalf(prev.currentHour - (prev.offsetHour || 0));
            const clampedStart = clampHour(newStart);
            const maxStart = Math.max(FIRST_HOUR, LAST_HOUR - block.duration);
            const finalStart = Math.min(clampedStart, maxStart);
            if (finalStart !== block.start || prev.currentDay !== block.day) {
              const inv = () => queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });
              updateBlock.mutate({ id: block.id, data: { day: prev.currentDay, start: finalStart } }, { onSuccess: inv });
            } else {
              openEditDialog(block);
            }
          }
        }
        return null;
      });
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, blocks, queryClient, updateBlock]);

  function startCreateDrag(e: React.MouseEvent, day: string) {
    if (e.button !== 0) return;
    const colEl = e.currentTarget as HTMLElement;
    const colRect = colEl.getBoundingClientRect();
    const columnsRect = columnsRef.current?.getBoundingClientRect() || colRect;
    const hour = clampHour(snapToHalf(FIRST_HOUR + (e.clientY - colRect.top) / HOUR_HEIGHT));
    setDragState({ type: "create", day, startHour: hour, currentHour: hour, currentDay: day, columnsRect, columnBodyTop: colRect.top });
    e.preventDefault();
  }

  function startMoveDrag(e: React.MouseEvent, block: ScheduleBlockType) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const colEl = (e.currentTarget as HTMLElement).closest("[data-day-column]") as HTMLElement;
    if (!colEl) return;
    const colRect = colEl.getBoundingClientRect();
    const columnsRect = columnsRef.current?.getBoundingClientRect() || colRect;
    const clickHour = clampHour(snapToHalf(FIRST_HOUR + (e.clientY - colRect.top) / HOUR_HEIGHT));
    const offsetHour = clickHour - block.start;
    setDragState({ type: "move", day: block.day, startHour: block.start, currentHour: clickHour, currentDay: block.day, blockId: block.id, offsetHour, columnsRect, columnBodyTop: colRect.top });
  }

  function startResizeDrag(e: React.MouseEvent, block: ScheduleBlockType, edge: "bottom" | "top" = "bottom") {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const colEl = (e.currentTarget as HTMLElement).closest("[data-day-column]") as HTMLElement;
    if (!colEl) return;
    const colRect = colEl.getBoundingClientRect();
    const columnsRect = columnsRef.current?.getBoundingClientRect() || colRect;
    const hour = clampHour(snapToHalf(FIRST_HOUR + (e.clientY - colRect.top) / HOUR_HEIGHT));
    const type = edge === "top" ? "resize-top" : "resize";
    setDragState({ type, day: block.day, startHour: block.start, currentHour: hour, currentDay: block.day, blockId: block.id, columnsRect, columnBodyTop: colRect.top });
  }

  const calTimeMin = useMemo(() => {
    const d = new Date(weekStart);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [weekStart]);
  const calTimeMax = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [weekStart]);
  const { data: calData } = useCalendarEvents(calTimeMin, calTimeMax);
  const calEvents = calData?.events || [];

  const calEventsByDayHour = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const day of DAYS) {
      for (const hour of TIME_SLOTS) {
        map[`${day}-${hour}`] = [];
      }
      map[`${day}-allday`] = [];
    }
    for (const ev of calEvents) {
      const isAllDay = !ev.start.includes("T");
      if (isAllDay) {
        const d = new Date(ev.start + "T12:00:00");
        const dayIdx = (d.getDay() + 6) % 7;
        const dayName = DAYS[dayIdx];
        if (dayName && map[`${dayName}-allday`]) {
          map[`${dayName}-allday`].push(ev);
        }
      } else {
        const d = new Date(ev.start);
        const dayIdx = (d.getDay() + 6) % 7;
        const dayName = DAYS[dayIdx];
        const hour = d.getHours();
        if (dayName && map[`${dayName}-${hour}`]) {
          map[`${dayName}-${hour}`].push(ev);
        }
      }
    }
    return map;
  }, [calEvents]);

  const scheduleByDay = useMemo(() => {
    const map: Record<string, ScheduleBlockType[]> = {};
    for (const day of DAYS) {
      map[day] = [];
    }
    for (const block of blocks) {
      if (map[block.day]) {
        map[block.day].push(block);
      }
    }
    return map;
  }, [blocks]);

  function openCreateDialog(day: string, hour: number) {
    setEditingBlock(null);
    setFormDay(day);
    setFormStart(String(hour));
    setFormDuration("1");
    setFormLabel("");
    setFormCategory("deepwork");
    setDialogOpen(true);
  }

  function openEditDialog(block: ScheduleBlockType) {
    setEditingBlock(block);
    setFormDay(block.day);
    setFormStart(String(block.start));
    setFormDuration(String(block.duration));
    setFormLabel(block.label);
    setFormCategory(block.category);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formLabel.trim()) return;

    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });

    if (editingBlock) {
      updateBlock.mutate(
        {
          id: editingBlock.id,
          data: {
            day: formDay,
            start: parseFloat(formStart),
            duration: parseFloat(formDuration),
            label: formLabel.trim(),
            category: formCategory,
          },
        },
        { onSuccess: () => { invalidate(); setDialogOpen(false); } }
      );
    } else {
      createBlock.mutate(
        {
          data: {
            day: formDay,
            start: parseFloat(formStart),
            duration: parseFloat(formDuration),
            label: formLabel.trim(),
            category: formCategory,
          },
        },
        { onSuccess: () => { invalidate(); setDialogOpen(false); } }
      );
    }
  }

  function handleDelete() {
    if (!editingBlock) return;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: getListScheduleBlocksQueryKey() });
    deleteBlock.mutate(
      { id: editingBlock.id },
      { onSuccess: () => { invalidate(); setDialogOpen(false); } }
    );
  }

  const isSaving = createBlock.isPending || updateBlock.isPending || deleteBlock.isPending;

  return (
    <>
      <Card>
        <CardContent className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-semibold mr-1">Ideal Week</span>
            {Object.entries(categoryLabels).map(([key, label]) => {
              const c = categoryColors[key];
              return (
                <span
                  key={key}
                  className={`text-[9px] px-1.5 py-px rounded-full ${c.bg} ${c.text} font-medium leading-tight`}
                >
                  {label}
                </span>
              );
            })}
            {(calData?.calendars || []).length > 0 && (
              <span
                className={`text-[9px] px-1.5 py-px rounded-full font-medium leading-tight inline-flex items-center gap-0.5 ${categoryColors["calendar"].bg} ${categoryColors["calendar"].text}`}
              >
                <CalendarDays className="h-2 w-2" />
                Google Calendar
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-1">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {(() => {
                  const hasAnyAllDay = DAYS.some(day => (calEventsByDayHour[`${day}-allday`] || []).length > 0);
                  const cc = categoryColors["calendar"];
                  return (
                    <>
                      {hasAnyAllDay && (
                        <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0.5 mb-0.5">
                          <div />
                          {DAYS.map(day => {
                            const allDayEvs = calEventsByDayHour[`${day}-allday`] || [];
                            return (
                              <div key={day} className="min-h-[20px] flex flex-col gap-px p-px">
                                {allDayEvs.map(ev => (
                                  <div
                                    key={ev.id}
                                    className={`rounded px-1 py-px text-[9px] leading-tight font-medium truncate border ${cc.bg} ${cc.text} ${cc.border}`}
                                    title={`${ev.summary} (${ev.calendarName})`}
                                  >
                                    {ev.summary}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className={`flex ${dragState ? "select-none" : ""}`}>
                        <div className="w-[50px] flex-shrink-0 pt-7">
                          <div className="relative" style={{ height: GRID_HEIGHT }}>
                            {TIME_SLOTS.map(hour => (
                              <div
                                key={hour}
                                className="absolute right-1.5 text-[10px] text-muted-foreground leading-none"
                                style={{ top: (hour - FIRST_HOUR) * HOUR_HEIGHT - 5 }}
                              >
                                {formatHour(hour)}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div ref={columnsRef} className="flex flex-1">
                          {DAYS.map(day => (
                            <div key={day} className="flex-1 min-w-0">
                              <div className="h-7 flex items-center justify-center text-[11px] font-semibold text-muted-foreground bg-muted/50 rounded-t border-l">
                                {day}
                              </div>
                              <div
                                data-day-column={day}
                                className="relative border-l border-b cursor-crosshair"
                                style={{ height: GRID_HEIGHT }}
                                onMouseDown={(e) => {
                                  if ((e.target as HTMLElement).closest("[data-block]")) return;
                                  startCreateDrag(e, day);
                                }}
                                onContextMenu={(e) => {
                                  if ((e.target as HTMLElement).closest("[data-block]")) return;
                                  handleContextMenu(e, day);
                                }}
                              >
                                {Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => i + FIRST_HOUR).map(hour => (
                                  <div key={hour}>
                                    <div
                                      className="absolute w-full border-t border-muted/60 pointer-events-none"
                                      style={{ top: (hour - FIRST_HOUR) * HOUR_HEIGHT }}
                                    />
                                    <div
                                      className="absolute w-full border-t border-dashed border-muted/30 pointer-events-none"
                                      style={{ top: (hour - FIRST_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                                    />
                                  </div>
                                ))}
                                <div
                                  className="absolute w-full border-t border-muted/60 pointer-events-none"
                                  style={{ top: GRID_HEIGHT }}
                                />

                                {(scheduleByDay[day] || []).map(block => {
                                  const c = categoryColors[block.category];
                                  let blockStart = block.start;
                                  let blockDuration = block.duration;

                                  if (dragState?.type === "resize" && dragState.blockId === block.id) {
                                    blockDuration = Math.max(0.5, snapToHalf(dragState.currentHour - block.start));
                                  }
                                  if (dragState?.type === "resize-top" && dragState.blockId === block.id) {
                                    const blockEnd = block.start + block.duration;
                                    const newStart = Math.min(snapToHalf(dragState.currentHour), blockEnd - 0.5);
                                    blockStart = clampHour(newStart);
                                    blockDuration = Math.max(0.5, snapToHalf(blockEnd - blockStart));
                                  }
                                  if (dragState?.type === "move" && dragState.blockId === block.id) {
                                    blockStart = snapToHalf(dragState.currentHour - (dragState.offsetHour || 0));
                                    blockStart = clampHour(blockStart);
                                  }
                                  const isMovingThisBlock = dragState?.type === "move" && dragState.blockId === block.id;
                                  const showInThisColumn = isMovingThisBlock ? dragState.currentDay === day : true;
                                  if (!showInThisColumn) return null;

                                  const top = (blockStart - FIRST_HOUR) * HOUR_HEIGHT;
                                  const height = Math.max(blockDuration * HOUR_HEIGHT, HOUR_HEIGHT * 0.5);

                                  const hasOverlappingCalEvent = calEvents.some(ev => {
                                    if (!ev.start.includes("T")) return false;
                                    const evD = new Date(ev.start);
                                    const evDayIdx = (evD.getDay() + 6) % 7;
                                    if (DAYS[evDayIdx] !== day) return false;
                                    const evStart = evD.getHours() + evD.getMinutes() / 60;
                                    const evEnd = new Date(ev.end).getHours() + new Date(ev.end).getMinutes() / 60;
                                    return evStart < blockStart + blockDuration && evEnd > blockStart;
                                  });

                                  return (
                                    <div
                                      key={block.id}
                                      data-block
                                      className={`absolute rounded-md border hover:shadow-md transition-shadow z-10 ${c.bg} ${c.text} ${c.border} ${isMovingThisBlock ? "opacity-80 shadow-lg ring-2 ring-primary/30" : ""}`}
                                      style={{ top, height, left: "2px", right: hasOverlappingCalEvent ? "50%" : "2px" }}
                                      onMouseMove={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const distFromBottom = rect.bottom - e.clientY;
                                        const distFromTop = e.clientY - rect.top;
                                        if (distFromBottom <= 8) {
                                          e.currentTarget.style.cursor = "s-resize";
                                        } else if (distFromTop <= 8) {
                                          e.currentTarget.style.cursor = "n-resize";
                                        } else {
                                          e.currentTarget.style.cursor = "grab";
                                        }
                                      }}
                                      onMouseDown={(e) => {
                                        if (e.button !== 0) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const distFromBottom = rect.bottom - e.clientY;
                                        const distFromTop = e.clientY - rect.top;
                                        if (distFromBottom <= 8) {
                                          startResizeDrag(e, block, "bottom");
                                        } else if (distFromTop <= 8) {
                                          startResizeDrag(e, block, "top");
                                        } else {
                                          startMoveDrag(e, block);
                                        }
                                      }}
                                      onContextMenu={(e) => handleContextMenu(e, day, block)}
                                    >
                                      <div className="px-1.5 py-0.5 text-[11px] font-semibold leading-tight truncate">
                                        {block.label}
                                      </div>
                                      {height >= HOUR_HEIGHT * 0.75 && (
                                        <div className="px-1.5 text-[9px] opacity-70">
                                          {formatTimeRange(blockStart, blockStart + blockDuration)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {calEvents.filter(ev => {
                                  if (!ev.start.includes("T")) return false;
                                  const d = new Date(ev.start);
                                  const dayIdx = (d.getDay() + 6) % 7;
                                  return DAYS[dayIdx] === day;
                                }).map(ev => {
                                  const dayBlocks = scheduleByDay[day] || [];
                                  const d = new Date(ev.start);
                                  const endD = new Date(ev.end);
                                  const startH = d.getHours() + d.getMinutes() / 60;
                                  const endH = endD.getHours() + endD.getMinutes() / 60;
                                  const top = (startH - FIRST_HOUR) * HOUR_HEIGHT;
                                  const height = Math.max((endH - startH) * HOUR_HEIGHT, HOUR_HEIGHT * 0.4);
                                  if (startH >= LAST_HOUR || endH <= FIRST_HOUR) return null;
                                  const overlapsBlock = dayBlocks.some(b => startH < b.start + b.duration && endH > b.start);
                                  return (
                                    <div
                                      key={ev.id}
                                      className={`absolute rounded-md border overflow-hidden z-[15] ${cc.bg} ${cc.text} ${cc.border}`}
                                      style={{
                                        top: Math.max(top, 0),
                                        height,
                                        left: overlapsBlock ? "50%" : "2px",
                                        right: "2px",
                                      }}
                                      title={`${ev.summary} (${ev.calendarName})`}
                                    >
                                      <div className="px-1 py-0.5 text-[10px] font-medium leading-tight truncate">
                                        {ev.summary}
                                      </div>
                                      {height >= HOUR_HEIGHT * 0.75 && (
                                        <div className="px-1 text-[8px] opacity-70">
                                          {formatTimeRange(startH, endH)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {dragState?.type === "create" && dragState.day === day && (() => {
                                  const minH = Math.min(dragState.startHour, dragState.currentHour);
                                  const maxH = Math.max(dragState.startHour, dragState.currentHour);
                                  const dur = maxH - minH;
                                  if (dur < 0.25) return null;
                                  return (
                                    <div
                                      className="absolute left-0.5 right-0.5 rounded-md border-2 border-dashed border-primary/50 bg-primary/10 z-20 pointer-events-none"
                                      style={{
                                        top: (minH - FIRST_HOUR) * HOUR_HEIGHT,
                                        height: dur * HOUR_HEIGHT,
                                      }}
                                    >
                                      <div className="px-1.5 py-0.5 text-[10px] font-medium text-primary/70">
                                        {formatTimeRange(minH, maxH)}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {isDayToday(day, weekStart) && (() => {
                                  const now = new Date();
                                  const currentH = now.getHours() + now.getMinutes() / 60;
                                  if (currentH < FIRST_HOUR || currentH > LAST_HOUR) return null;
                                  return (
                                    <div
                                      className="absolute left-0 right-0 z-30 pointer-events-none"
                                      style={{ top: (currentH - FIRST_HOUR) * HOUR_HEIGHT }}
                                    >
                                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-[5px] -top-[5px]" />
                                      <div className="h-[2px] bg-red-500 w-full" />
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? "Edit Schedule Block" : "New Schedule Block"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Label</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Morning Ritual"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Day</Label>
                <Select value={formDay} onValueChange={setFormDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Select value={formStart} onValueChange={setFormStart}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {START_TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Duration</Label>
                <Select value={formDuration} onValueChange={setFormDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editingBlock && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isSaving}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !formLabel.trim()}
              >
                {isSaving ? "Saving..." : editingBlock ? "Update" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.block ? (
            <>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                onClick={handleCopy}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                onClick={handleDuplicate}
              >
                <Plus className="h-3.5 w-3.5" />
                Duplicate
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                onClick={() => { openEditDialog(contextMenu.block!); setContextMenu(null); }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                onClick={handleContextDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          ) : (
            <>
              {clipboard ? (
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                  onClick={handlePaste}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Paste "{clipboard.label}"
                </button>
              ) : (
                <div className="px-2.5 py-1.5 text-sm text-muted-foreground">
                  No block copied
                </div>
              )}
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                onClick={() => { openCreateDialog(contextMenu.day, contextMenu.hour); setContextMenu(null); }}
              >
                <Plus className="h-3.5 w-3.5" />
                New block here
              </button>
            </>
          )}
        </div>
      )}
    </>
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
  const invalidateDaily = () =>
    queryClient.invalidateQueries({ queryKey: getListDailyTop3QueryKey() });
  const createDaily = useCreateDailyTop3({
    mutation: { onSuccess: invalidateDaily },
  });
  const updateDaily = useUpdateDailyTop3({
    mutation: { onSuccess: invalidateDaily },
  });
  const deleteDaily = useDeleteDailyTop3({
    mutation: { onSuccess: invalidateDaily },
  });

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
    <div className="space-y-3">
      {document.getElementById("header-actions") && createPortal(
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevWeek}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="text-center whitespace-nowrap">
            <span className="text-xs font-semibold">
              {isCurrentWeek(weekStart) ? "This Week" : weekLabel}
            </span>
            {isCurrentWeek(weekStart) && (
              <span className="text-[10px] text-muted-foreground ml-1.5">{weekLabel}</span>
            )}
          </div>
          {!isCurrentWeek(weekStart) && (
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={goToThisWeek}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Today
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextWeek}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>,
        document.getElementById("header-actions")!
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
        <div className="space-y-4">
          <WeeklyScheduleTemplate weekStart={weekStart} />

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

          <Card className="bg-white border-primary/20">
            <CardContent className="p-4 flex items-center justify-center">
              <p className="text-sm md:text-base italic text-center text-foreground/90">
                <span className="text-primary/60 select-none mr-1">&ldquo;</span>
                What you think of yourself and what you believe is likely what
                actually will happen.
                <span className="text-primary/60 select-none ml-1">&rdquo;</span>
              </p>
            </CardContent>
          </Card>

          <DailyBrainwashing />

          <WordsOfWisdom />

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

          <ReadingList />
        </div>

        <div className="space-y-2 lg:sticky lg:top-4 min-w-0 overflow-hidden">
          <EditableRitualSection
            category="morning"
            title="Morning Ritual"
            icon={Sun}
            bannerColor="bg-[#f7e26d]"
            textColor="text-amber-900"
            journalPrompts={JOURNAL_PROMPTS}
          />
          <EditableRitualSection
            category="startup"
            title="Startup Ritual"
            icon={Rocket}
            bannerColor="bg-[#93c47d]"
            textColor="text-green-900"
          />
          <EditableRitualSection
            category="shutdown"
            title="Shutdown Ritual"
            icon={Moon}
            bannerColor="bg-[#a4c2f4]"
            textColor="text-blue-900"
            journalPrompts={EVENING_PROMPTS}
          />
          <EditableRitualSection
            category="weekly_review"
            title="Weekly Review"
            icon={ClipboardCheck}
            bannerColor="bg-[#b4a7d6]"
            textColor="text-purple-900"
          />
          <EditableRitualSection
            category="monthly_review"
            title="Monthly Review"
            icon={Calendar}
            bannerColor="bg-[#ea9999]"
            textColor="text-red-900"
          />
          <EditableRitualSection
            category="quarterly_review"
            title="Quarterly Review"
            icon={BarChart3}
            bannerColor="bg-[#f9cb9c]"
            textColor="text-orange-900"
          />
          <EditableRitualSection
            category="anchor_meetings"
            title="Anchor Meetings"
            icon={Anchor}
            bannerColor="bg-[#c9daf8]"
            textColor="text-blue-900"
          />
          <EditableRitualSection
            category="deepwork"
            title="Deepwork"
            icon={Brain}
            bannerColor="bg-[#d5a6bd]"
            textColor="text-pink-900"
          />
          <EditableRitualSection
            category="execution_block"
            title="Execution Block"
            icon={Zap}
            bannerColor="bg-[#ffe599]"
            textColor="text-yellow-900"
          />
          <EditableRitualSection
            category="family_friends"
            title="Family/Friends"
            icon={Heart}
            bannerColor="bg-[#b6d7a8]"
            textColor="text-green-900"
          />
          <EditableRitualSection
            category="patient_care"
            title="Patient Care"
            icon={Stethoscope}
            bannerColor="bg-[#a2c4c9]"
            textColor="text-teal-900"
          />
        </div>
      </div>

    </div>
  );
}

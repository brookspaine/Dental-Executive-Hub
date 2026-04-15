import { useState, useMemo, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListIdealWeekRituals,
  useToggleIdealWeekCompletion,
  useListDailyTop3,
  useCreateDailyTop3,
  useUpdateDailyTop3,
  useDeleteDailyTop3,
  useListScheduleBlocks,
  useCreateScheduleBlock,
  useUpdateScheduleBlock,
  useDeleteScheduleBlock,
  getListScheduleBlocksQueryKey,
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

  const today = formatDate(new Date());
  const showJournalPrompts =
    journalPrompts &&
    journalResponses &&
    (item.label.toLowerCase().includes("journal questions") ||
      item.label.toLowerCase().includes("evening ritual reflection"));

  return (
    <div>
      <div className="flex items-start gap-1.5 px-1 py-0.5 rounded-md">
        <span className="text-muted-foreground text-[10px] mt-0.5">•</span>
        <div
          contentEditable
          suppressContentEditableWarning
          className="text-[11px] leading-tight font-medium flex-1 outline-none focus:bg-muted/30 rounded px-0.5 cursor-text min-h-[16px] whitespace-pre-wrap"
          onInput={(e) => handleChange(e.currentTarget.textContent || "")}
          onBlur={handleBlur}
          dangerouslySetInnerHTML={{ __html: item.label.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[10px] text-primary underline">$1</a>') }}
        />
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
];

const START_TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const t = 6 + i * 0.5;
  const h = Math.floor(t) % 12 || 12;
  const m = t % 1 === 0.5 ? "30" : "00";
  const ampm = t < 12 ? "AM" : "PM";
  return { value: String(t), label: `${h}:${m} ${ampm}` };
});

function WeeklyScheduleTemplate() {
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
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">Weekly Schedule Template</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Object.entries(categoryLabels).map(([key, label]) => {
              const c = categoryColors[key];
              return (
                <span
                  key={key}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} font-medium`}
                >
                  {label}
                </span>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-1">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[45px_repeat(7,1fr)] gap-0.5">
                  <div className="h-6" />
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="h-6 flex items-center justify-center text-[10px] font-semibold text-muted-foreground bg-muted/50 rounded-t"
                    >
                      {day}
                    </div>
                  ))}

                  {TIME_SLOTS.map((hour) => (
                    <div key={hour} className="contents">
                      <div className="h-8 flex items-start justify-end pr-1 text-[10px] text-muted-foreground pt-0.5">
                        {formatHour(hour)}
                      </div>
                      {DAYS.map((day) => {
                        const dayBlocks = scheduleByDay[day] || [];
                        const block = dayBlocks.find(
                          (b) => hour >= b.start && hour < b.start + b.duration
                        );
                        const isBlockStart =
                          block && hour === Math.floor(block.start);
                        const c = block ? categoryColors[block.category] : null;

                        if (block && !isBlockStart) {
                          return (
                            <div
                              key={day}
                              className={`h-8 border-x cursor-pointer ${c?.bg} ${c?.border}`}
                              onClick={() => openEditDialog(block)}
                            />
                          );
                        }

                        if (block && isBlockStart) {
                          return (
                            <div
                              key={day}
                              className={`h-8 border rounded-t text-[10px] font-medium flex items-center justify-center cursor-pointer hover:opacity-80 ${c?.bg} ${c?.text} ${c?.border}`}
                              onClick={() => openEditDialog(block)}
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
                            className="h-8 border border-dashed border-muted bg-background cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => openCreateDialog(day, hour)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
        <div className="space-y-4">
          <WeeklyScheduleTemplate />

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

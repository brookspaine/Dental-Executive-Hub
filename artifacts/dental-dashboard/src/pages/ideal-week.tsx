import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListFutureTodos,
  useCreateFutureTodo,
  useUpdateFutureTodo,
  useDeleteFutureTodo,
  getListFutureTodosQueryKey,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Layers,
  ArrowUp,
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
  ListTodo,
  Users,
  Crop,
  ZoomIn,
  ImagePlus,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useUpload } from "@workspace/object-storage-web";
import { useToast } from "@/hooks/use-toast";
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

type WeeklyItem = {
  id: number;
  title: string;
  completed: boolean;
  priority: number;
  weekStart: string;
  createdAt: string;
};

type CcTop3Row = {
  id: number;
  slot: number;
  period: "day" | "week";
  text: string;
  done: boolean;
  date: string;
};

function useCcTop3() {
  return useQuery<CcTop3Row[]>({
    queryKey: ["cc-top3"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/command-center/top3`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

type OnDeckTag = "move_the_needle" | "maintenance" | "follow_up";
type OnDeckItem = {
  id: number;
  businessId: number;
  text: string;
  ownerDirectReportId: number | null;
  ownerName: string | null;
  dueDate: string | null;
  tag: OnDeckTag;
  sourceTaskId: number | null;
  sortOrder: number;
};
type CcDirectReport = { id: number; name: string; hidden?: boolean };
type CcProject = { id: number; name: string };
type CcTaskRow = {
  id: number;
  parentType: "life_area" | "direct_report" | "project";
  parentId: number;
  ownerDirectReportId: number | null;
  ownerName: string | null;
  text: string;
  done: boolean;
  dueDate: string | null;
};

const ON_DECK_TAG_META: Record<OnDeckTag, { label: string; className: string }> = {
  move_the_needle: { label: "Move-the-needle", className: "bg-primary/10 text-primary" },
  maintenance: { label: "Maintenance", className: "bg-amber-100 text-amber-800" },
  follow_up: { label: "Follow-up", className: "bg-blue-100 text-blue-800" },
};
const ON_DECK_TAGS: OnDeckTag[] = ["move_the_needle", "maintenance", "follow_up"];
const ON_DECK_CAP = 7;

function onDeckFormatDue(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map((n) => Number(n));
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type OnDeckDueUrgency = "overdue" | "soon" | "week" | null;

// Mirrors the EDGE Lease Matrix critical-date convention (red = past due,
// orange = imminent, amber = this week) compressed for On Deck's weekly cadence.
function onDeckDueUrgency(d: string | null): OnDeckDueUrgency {
  if (!d) return null;
  const [y, m, day] = d.split("-").map((n) => Number(n));
  if (!y || !m || !day) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(y, m - 1, day);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  if (diffDays <= 7) return "week";
  return null;
}

const ON_DECK_DUE_CLASSES: Record<Exclude<OnDeckDueUrgency, null>, string> = {
  overdue: "bg-red-100 text-red-700",
  soon: "bg-orange-100 text-orange-700",
  week: "bg-amber-100 text-amber-800",
};
const ON_DECK_DUE_TITLES: Record<Exclude<OnDeckDueUrgency, null>, string> = {
  overdue: "Past due",
  soon: "Due within a few days",
  week: "Due this week",
};

function useOnDeck() {
  return useQuery<OnDeckItem[]>({
    queryKey: ["cc-on-deck"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/command-center/on-deck`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

function useCcDirectReports() {
  return useQuery<CcDirectReport[]>({
    queryKey: ["cc-direct-reports"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/command-center/direct-reports`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

function useCcProjects() {
  return useQuery<CcProject[]>({
    queryKey: ["cc-projects"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/command-center/projects`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

function useCcTasks() {
  return useQuery<CcTaskRow[]>({
    queryKey: ["cc-tasks-all"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/command-center/tasks`);
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
  { key: "easy", label: "What would my personal board of directors do if this were their problem?" },
];

const EVENING_PROMPTS = [
  { key: "evening_handled_well", label: "What would my personal board of directors tell me I did well today?" },
  { key: "evening_coach", label: "What would my personal board of directors critique me on today?" },
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

interface BoardMember {
  id: number;
  objectPath: string;
  name: string | null;
  x: number;
  y: number;
  size: number;
  focalX: number;
  focalY: number;
  zoom: number;
  sortOrder: number;
  createdAt: string;
}

const COLLAGE_HEIGHT = 240;

function boardImgSrc(base: string, objectPath: string): string {
  if (objectPath.startsWith("/objects/")) {
    return `${base}api/storage${objectPath}`;
  }
  return objectPath;
}

function BoardCropDialog({
  base,
  member,
  onSave,
  onClose,
}: {
  base: string;
  member: BoardMember;
  onSave: (data: { focalX: number; focalY: number; zoom: number }) => void;
  onClose: () => void;
}) {
  const VP = 260;
  const [focalX, setFocalX] = useState(member.focalX);
  const [focalY, setFocalY] = useState(member.focalY);
  const [zoom, setZoom] = useState(member.zoom);

  const panCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      panCleanupRef.current?.();
    };
  }, []);

  const handlePanStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const sfx = focalX;
    const sfy = focalY;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setFocalX(Math.max(0, Math.min(100, sfx - (dx / VP) * 100)));
      setFocalY(Math.max(0, Math.min(100, sfy - (dy / VP) * 100)));
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      panCleanupRef.current = null;
    };
    panCleanupRef.current = up;
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust photo</DialogTitle>
          <DialogDescription>
            Drag the photo to reposition the frame, slide to zoom.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div
            onPointerDown={handlePanStart}
            style={{ width: VP, height: VP }}
            className="relative overflow-hidden rounded-2xl border bg-muted cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <img
              src={boardImgSrc(base, member.objectPath)}
              draggable={false}
              alt={member.name ?? "Board member"}
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
                transform: `scale(${zoom})`,
              }}
            />
          </div>
          <div className="w-full px-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ZoomIn className="h-3.5 w-3.5" />
              Zoom
            </div>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave({ focalX, focalY, zoom })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PersonalBoardOfDirectors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const base = import.meta.env.BASE_URL || "/";
  const QKEY = ["board-members"];
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cropId, setCropId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  const { data: members = [] } = useQuery<BoardMember[]>({
    queryKey: QKEY,
    queryFn: async () => {
      const res = await fetch(`${base}api/ideal-week/board-members`);
      if (!res.ok) throw new Error("Failed to load board members");
      return res.json();
    },
  });

  const { uploadFile, isUploading } = useUpload({
    onError: (err) =>
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      }),
  });

  const createMember = useMutation({
    mutationFn: async (data: Partial<BoardMember> & { objectPath: string }) => {
      const res = await fetch(`${base}api/ideal-week/board-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add photo");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QKEY }),
    onError: (err: Error) =>
      toast({
        title: "Could not add photo",
        description: err.message,
        variant: "destructive",
      }),
  });

  const updateMember = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<BoardMember>;
    }) => {
      const res = await fetch(`${base}api/ideal-week/board-members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save change");
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: QKEY });
      const prev = queryClient.getQueryData<BoardMember[]>(QKEY);
      queryClient.setQueryData<BoardMember[]>(QKEY, (old = []) =>
        old.map((m) => (m.id === id ? { ...m, ...data } : m)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QKEY, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QKEY }),
  });

  const deleteMember = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${base}api/ideal-week/board-members/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove photo");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QKEY }),
    onError: (err: Error) =>
      toast({
        title: "Could not remove photo",
        description: err.message,
        variant: "destructive",
      }),
  });

  const setLive = (id: number, patch: Partial<BoardMember>) => {
    queryClient.setQueryData<BoardMember[]>(QKEY, (old = []) =>
      old.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  };

  const startMove = (e: React.PointerEvent, m: BoardMember) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(m.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const cw = containerRef.current?.clientWidth ?? 320;
    let last = { x: m.x, y: m.y };
    const move = (ev: PointerEvent) => {
      const nx = Math.max(0, Math.min(cw - m.size, m.x + (ev.clientX - startX)));
      const ny = Math.max(
        0,
        Math.min(COLLAGE_HEIGHT - m.size, m.y + (ev.clientY - startY)),
      );
      last = { x: nx, y: ny };
      setLive(m.id, { x: nx, y: ny });
    };
    const detach = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      dragCleanupRef.current = null;
    };
    const up = () => {
      detach();
      updateMember.mutate({ id: m.id, data: last });
    };
    dragCleanupRef.current = detach;
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };

  const startResize = (e: React.PointerEvent, m: BoardMember) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const cw = containerRef.current?.clientWidth ?? 320;
    let lastSize = m.size;
    const move = (ev: PointerEvent) => {
      const delta = Math.max(ev.clientX - startX, ev.clientY - startY);
      let ns = Math.max(48, Math.min(200, m.size + delta));
      ns = Math.min(ns, cw - m.x, COLLAGE_HEIGHT - m.y);
      lastSize = ns;
      setLive(m.id, { size: ns });
    };
    const detach = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      dragCleanupRef.current = null;
    };
    const up = () => {
      detach();
      updateMember.mutate({ id: m.id, data: { size: lastSize } });
    };
    dragCleanupRef.current = detach;
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const resp = await uploadFile(file);
    if (resp) {
      const n = members.length;
      createMember.mutate({
        objectPath: resp.objectPath,
        x: 10 + (n % 4) * 58,
        y: 10 + (Math.floor(n / 4) % 2) * 58,
        size: 92,
      });
    }
  };

  const cropMember = cropId
    ? members.find((m) => m.id === cropId) ?? null
    : null;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Personal Board of Directors
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            setEditMode((v) => {
              if (v) setSelectedId(null);
              return !v;
            });
          }}
        >
          {editMode ? "Done" : "Edit"}
        </Button>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFilePicked}
        />
        <div
          ref={containerRef}
          onClick={() => {
            if (!editMode) {
              setEditMode(true);
            } else {
              setSelectedId(null);
            }
          }}
          style={{ height: COLLAGE_HEIGHT }}
          className="relative w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted/40"
        >
          {members.map((m) => {
            const selected = editMode && selectedId === m.id;
            return (
              <div
                key={m.id}
                onPointerDown={(e) => startMove(e, m)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editMode) setSelectedId(m.id);
                }}
                style={{
                  left: m.x,
                  top: m.y,
                  width: m.size,
                  height: m.size,
                }}
                className={[
                  "absolute rounded-xl overflow-hidden shadow-md bg-muted touch-none",
                  editMode ? "cursor-move" : "",
                  selected
                    ? "ring-2 ring-primary ring-offset-1"
                    : "border-2 border-white",
                ].join(" ")}
              >
                <img
                  src={boardImgSrc(base, m.objectPath)}
                  draggable={false}
                  alt={m.name ?? "Board member"}
                  className="h-full w-full object-cover pointer-events-none select-none"
                  style={{
                    objectPosition: `${m.focalX}% ${m.focalY}%`,
                    transform: `scale(${m.zoom})`,
                  }}
                />
                {selected && (
                  <>
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCropId(m.id);
                        }}
                        className="h-6 w-6 flex items-center justify-center rounded-md bg-black/55 text-white hover:bg-black/75"
                        title="Crop / reposition"
                      >
                        <Crop className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMember.mutate(m.id);
                          setSelectedId(null);
                        }}
                        className="h-6 w-6 flex items-center justify-center rounded-md bg-black/55 text-white hover:bg-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div
                      onPointerDown={(e) => startResize(e, m)}
                      className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize bg-primary/90 rounded-tl-md"
                      title="Resize"
                    />
                  </>
                )}
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-4 pointer-events-none">
              <Users className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Your board is watching.
              </p>
              <p className="text-xs text-muted-foreground/70">
                {editMode
                  ? "Add the people whose standards you hold yourself to."
                  : "Click to build your collage."}
              </p>
            </div>
          )}
        </div>

        {editMode && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isUploading || createMember.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading || createMember.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5 mr-1" />
              )}
              Add photo
            </Button>
            {selectedId !== null && (
              <span className="text-[11px] text-muted-foreground">
                Drag to move · corner to resize · crop icon to reframe
              </span>
            )}
          </div>
        )}
      </CardContent>

      {cropMember && (
        <BoardCropDialog
          base={base}
          member={cropMember}
          onClose={() => setCropId(null)}
          onSave={({ focalX, focalY, zoom }) => {
            updateMember.mutate({
              id: cropMember.id,
              data: { focalX, focalY, zoom },
            });
            setCropId(null);
          }}
        />
      )}
    </Card>
  );
}

function DailyBrainwashing() {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const category = "brainwashing";
  const { data: items = [] } = useRitualItems(category);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editMode, setEditMode] = useState(false);

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
          onClick={() => {
            setEditMode((v) => {
              const next = !v;
              if (!next) {
                setAdding(false);
                setNewLabel("");
              }
              return next;
            });
          }}
        >
          {editMode ? "Done" : "Edit"}
        </Button>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {items.map((item) => (
          <BrainwashingItemRow
            key={item.id}
            item={item}
            category={category}
            editMode={editMode}
            onDelete={() => deleteItem.mutate(item.id)}
          />
        ))}

        {editMode && !adding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs mt-1"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )}

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

function AutomaticRulesForSuccess() {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const category = "automatic_rules";
  const { data: items = [] } = useRitualItems(category);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editMode, setEditMode] = useState(false);

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
          <Zap className="h-4 w-4 text-primary" />
          Automatic Rules for Success
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            setEditMode((v) => {
              const next = !v;
              if (!next) {
                setAdding(false);
                setNewLabel("");
              }
              return next;
            });
          }}
        >
          {editMode ? "Done" : "Edit"}
        </Button>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {items.map((item) => (
          <BrainwashingItemRow
            key={item.id}
            item={item}
            category={category}
            editMode={editMode}
            onDelete={() => deleteItem.mutate(item.id)}
          />
        ))}

        {editMode && !adding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs mt-1"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )}

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
              placeholder="New rule…"
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
  editMode,
  onDelete,
}: {
  item: { id: number; label: string };
  category: string;
  editMode: boolean;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const [value, setValue] = useState(item.label);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    onSuccess: (updated: any) => {
      setDirty(false);
      // Patch the cached list in place instead of invalidating, to avoid
      // re-render churn while the user is still editing.
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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    autoSize();
  }, [value]);

  return (
    <div className="flex items-start gap-2 py-0.5 rounded">
      <span className="text-primary select-none leading-relaxed">•</span>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        readOnly={!editMode}
        className="text-sm leading-relaxed flex-1 outline-none focus:bg-muted/50 rounded px-1 -mx-1 cursor-text bg-transparent border-0 w-full resize-none overflow-hidden"
      />
      {editMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onDelete}
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
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

function CcTop3Card({
  title,
  icon: Icon,
  period,
  rows,
  onChanged,
}: {
  title: string;
  icon: LucideIcon;
  period: "day" | "week";
  rows: CcTop3Row[];
  onChanged: () => void;
}) {
  const base = import.meta.env.BASE_URL || "/";
  const slots = [1, 2, 3].map(
    (slot) => rows.find((r) => r.slot === slot) ?? null,
  );
  const filled = slots.filter((r) => r && r.text.trim().length > 0);
  const completedCount = filled.filter((r) => r!.done).length;
  const totalCount = filled.length;

  const save = async (slot: number, body: { text?: string; done?: boolean }) => {
    await fetch(`${base}api/command-center/top3/${period}/${slot}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChanged();
    window.dispatchEvent(new CustomEvent("cc:top3-changed"));
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
      <CardContent className="space-y-2.5">
        {slots.map((row, idx) => (
          <CcTop3Slot
            key={idx}
            slot={idx + 1}
            text={row?.text ?? ""}
            done={row?.done ?? false}
            onSaveText={(text) => save(idx + 1, { text })}
            onToggleDone={(done) => save(idx + 1, { done })}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function CcTop3Slot({
  slot,
  text,
  done,
  onSaveText,
  onToggleDone,
}: {
  slot: number;
  text: string;
  done: boolean;
  onSaveText: (text: string) => void | Promise<void>;
  onToggleDone: (done: boolean) => void | Promise<void>;
}) {
  const [value, setValue] = useState(text);
  useEffect(() => setValue(text), [text]);
  const hasText = value.trim().length > 0;

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => hasText && onToggleDone(!done)}
        disabled={!hasText}
        title={done ? "Mark as not done" : "Mark as done"}
        className={[
          "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white border-none",
          done ? "bg-emerald-700" : "bg-primary",
          hasText ? "cursor-pointer" : "cursor-default opacity-90",
        ].join(" ")}
      >
        {done ? "✓" : slot}
      </button>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = value.trim();
          if (next !== text.trim()) onSaveText(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        placeholder="What's the one thing…"
        className={[
          "h-8 text-sm",
          done ? "line-through text-muted-foreground" : "",
        ].join(" ")}
      />
    </div>
  );
}

function IdealWeekOnDeckCard({
  items,
  dailyRows,
  onChanged,
}: {
  items: OnDeckItem[];
  dailyRows: CcTop3Row[];
  onChanged: () => void;
}) {
  const base = import.meta.env.BASE_URL || "/";
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"manual" | "pull">("manual");
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("none");
  const [customOwner, setCustomOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tag, setTag] = useState<OnDeckTag>("move_the_needle");

  const { data: directReports = [] } = useCcDirectReports();
  const { data: projects = [] } = useCcProjects();
  const { data: tasks = [] } = useCcTasks();

  const drName = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of directReports) m.set(d.id, d.name);
    return m;
  }, [directReports]);
  const projName = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  const atCap = items.length >= ON_DECK_CAP;
  const ownerLabel = (it: OnDeckItem) =>
    it.ownerDirectReportId != null
      ? drName.get(it.ownerDirectReportId) ?? "—"
      : it.ownerName ?? "";

  const create = async (body: Record<string, unknown>) => {
    const res = await fetch(`${base}api/command-center/on-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      window.alert("Couldn't add — On Deck may be full (max 7). Remove an item first.");
      return;
    }
    resetForm();
    onChanged();
  };

  const resetForm = () => {
    setText("");
    setOwner("none");
    setCustomOwner("");
    setDueDate("");
    setTag("move_the_needle");
    setAdding(false);
  };

  const remove = async (id: number) => {
    await fetch(`${base}api/command-center/on-deck/${id}`, { method: "DELETE" });
    onChanged();
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    await fetch(`${base}api/command-center/on-deck/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChanged();
  };

  const promote = async (it: OnDeckItem) => {
    const slots = [1, 2, 3].map((slot) => dailyRows.find((r) => r.slot === slot) ?? null);
    const openIdx = slots.findIndex((r) => !r || r.text.trim().length === 0);
    if (openIdx === -1) {
      window.alert(
        "All three of Today's Top 3 slots are full. Free a slot before promoting this item.",
      );
      return;
    }
    const putRes = await fetch(`${base}api/command-center/top3/day/${openIdx + 1}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: it.text, done: false }),
    });
    if (!putRes.ok) {
      window.alert("Couldn't promote — failed to update Today's Top 3. Try again.");
      return;
    }
    await fetch(`${base}api/command-center/on-deck/${it.id}`, { method: "DELETE" });
    window.dispatchEvent(new CustomEvent("cc:top3-changed"));
    onChanged();
  };

  const submitManual = () => {
    if (!text.trim()) return;
    void create({
      text: text.trim(),
      ownerDirectReportId: owner.startsWith("dr:") ? Number(owner.slice(3)) : null,
      ownerName: owner === "custom" ? customOwner.trim() || null : null,
      dueDate: dueDate || null,
      tag,
    });
  };

  const pullable = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.parentType === "project" || t.parentType === "direct_report") &&
          !t.done &&
          !items.some((i) => i.sourceTaskId === t.id),
      ),
    [tasks, items],
  );

  const submitPull = (t: CcTaskRow) => {
    const ownerDr =
      t.parentType === "direct_report" ? t.parentId : t.ownerDirectReportId ?? null;
    void create({
      text: t.text,
      ownerDirectReportId: ownerDr,
      ownerName: ownerDr == null ? t.ownerName : null,
      dueDate: t.dueDate,
      tag,
      sourceTaskId: t.id,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            On Deck
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {items.length}/{ON_DECK_CAP}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => {
                setEditing((e) => !e);
                setAdding(false);
              }}
            >
              {editing ? "Done" : "Edit"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground py-1">
            Nothing on deck yet. Tap Edit to add up to 7 priorities.
          </div>
        )}
        {items.map((it) => (
          <div
            key={it.id}
            className="flex items-center gap-2 border-b last:border-b-0 pb-2 last:pb-0"
          >
            <span
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                ON_DECK_TAG_META[it.tag].className,
              ].join(" ")}
            >
              {ON_DECK_TAG_META[it.tag].label}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{it.text}</div>
              {(ownerLabel(it) || it.dueDate) && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                  {ownerLabel(it) && <span>{ownerLabel(it)}</span>}
                  {ownerLabel(it) && it.dueDate ? <span>·</span> : null}
                  {it.dueDate ? (
                    (() => {
                      const u = onDeckDueUrgency(it.dueDate);
                      return u ? (
                        <span
                          title={ON_DECK_DUE_TITLES[u]}
                          className={`font-semibold rounded px-1.5 py-px ${ON_DECK_DUE_CLASSES[u]}`}
                        >
                          {u === "overdue" ? "overdue · " : ""}
                          due {onDeckFormatDue(it.dueDate)}
                        </span>
                      ) : (
                        <span>due {onDeckFormatDue(it.dueDate)}</span>
                      );
                    })()
                  ) : null}
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="h-7 text-xs px-2 shrink-0"
              onClick={() => void promote(it)}
              title="Promote to Today's Top 3"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              Top 3
            </Button>
            {editing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => void remove(it.id)}
                title="Remove from On Deck"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}

        {editing && (
          <div className="pt-2 space-y-3">
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((it) => (
                  <OnDeckEditRow
                    key={it.id}
                    item={it}
                    directReports={directReports}
                    onPatch={patch}
                  />
                ))}
              </div>
            )}
            {adding ? (
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                <div className="flex gap-2">
                  {(["manual", "pull"] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={mode === m ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setMode(m)}
                    >
                      {m === "manual" ? "New item" : "Pull from task"}
                    </Button>
                  ))}
                </div>
                {mode === "manual" ? (
                  <div className="space-y-2">
                    <Input
                      autoFocus
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitManual()}
                      placeholder="What needs to move this week…"
                      className="h-8 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Select value={owner} onValueChange={setOwner}>
                        <SelectTrigger className="h-8 text-xs flex-1 min-w-[120px]">
                          <SelectValue placeholder="Owner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No owner</SelectItem>
                          {directReports
                            .filter((d) => !d.hidden)
                            .map((d) => (
                              <SelectItem key={d.id} value={`dr:${d.id}`}>
                                {d.name}
                              </SelectItem>
                            ))}
                          <SelectItem value="custom">Other…</SelectItem>
                        </SelectContent>
                      </Select>
                      {owner === "custom" && (
                        <Input
                          value={customOwner}
                          onChange={(e) => setCustomOwner(e.target.value)}
                          placeholder="Owner name"
                          className="h-8 text-sm flex-1 min-w-[120px]"
                        />
                      )}
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-8 text-sm flex-1 min-w-[130px]"
                      />
                      <Select value={tag} onValueChange={(v) => setTag(v as OnDeckTag)}>
                        <SelectTrigger className="h-8 text-xs flex-1 min-w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ON_DECK_TAGS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {ON_DECK_TAG_META[t].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={submitManual}
                        disabled={!text.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Tag:</span>
                      <Select value={tag} onValueChange={(v) => setTag(v as OnDeckTag)}>
                        <SelectTrigger className="h-7 text-xs w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ON_DECK_TAGS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {ON_DECK_TAG_META[t].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {pullable.length === 0 && (
                        <div className="text-xs text-muted-foreground py-1">
                          No open Project or Direct Report tasks to pull.
                        </div>
                      )}
                      {pullable.map((t) => {
                        const where =
                          t.parentType === "project"
                            ? projName.get(t.parentId) ?? "Project"
                            : drName.get(t.parentId) ?? "Direct Report";
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => submitPull(t)}
                            className="w-full text-left rounded-md border bg-background px-3 py-2 hover:bg-muted/50"
                          >
                            <div className="text-sm">{t.text}</div>
                            <div className="text-[11px] text-muted-foreground">from {where}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs border-dashed"
                disabled={atCap}
                onClick={() =>
                  atCap
                    ? window.alert(
                        "On Deck is capped at 7 items. Remove one before adding another.",
                      )
                    : setAdding(true)
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {atCap ? "On Deck is full (7) — remove one to add" : "Add to On Deck"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OnDeckEditRow({
  item,
  directReports,
  onPatch,
}: {
  item: OnDeckItem;
  directReports: CcDirectReport[];
  onPatch: (id: number, body: Record<string, unknown>) => void | Promise<void>;
}) {
  const [text, setText] = useState(item.text);
  useEffect(() => setText(item.text), [item.text]);
  const ownerValue =
    item.ownerDirectReportId != null
      ? `dr:${item.ownerDirectReportId}`
      : item.ownerName
        ? "custom"
        : "none";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() =>
          text.trim() && text !== item.text && onPatch(item.id, { text: text.trim() })
        }
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="h-8 text-sm flex-[2] min-w-[160px]"
      />
      <Select
        value={ownerValue}
        onValueChange={(v) => {
          if (v === "none") onPatch(item.id, { ownerDirectReportId: null, ownerName: null });
          else if (v === "custom") {
            const name = window.prompt("Owner name", item.ownerName ?? "");
            if (name && name.trim()) onPatch(item.id, { ownerName: name.trim() });
          } else onPatch(item.id, { ownerDirectReportId: Number(v.slice(3)) });
        }}
      >
        <SelectTrigger className="h-8 text-xs flex-1 min-w-[110px]">
          <SelectValue placeholder="Owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No owner</SelectItem>
          {directReports
            .filter((d) => !d.hidden)
            .map((d) => (
              <SelectItem key={d.id} value={`dr:${d.id}`}>
                {d.name}
              </SelectItem>
            ))}
          <SelectItem value="custom">Other…</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={item.dueDate ?? ""}
        onChange={(e) => onPatch(item.id, { dueDate: e.target.value || null })}
        className="h-8 text-sm flex-1 min-w-[130px]"
      />
      <Select value={item.tag} onValueChange={(v) => onPatch(item.id, { tag: v as OnDeckTag })}>
        <SelectTrigger className="h-8 text-xs flex-1 min-w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ON_DECK_TAGS.map((t) => (
            <SelectItem key={t} value={t}>
              {ON_DECK_TAG_META[t].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FutureTodoSection({
  items,
  onAdd,
  onToggle,
  onDelete,
  onRename,
}: {
  items: { id: number; title: string; completed: boolean }[];
  onAdd: (title: string) => void;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle("");
    inputRef.current?.focus();
  };

  const openItems = items.filter((i) => !i.completed);
  const doneItems = items.filter((i) => i.completed);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Brain Dump
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {openItems.length} open
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {openItems.map((item) => (
          <EditableItem
            key={item.id}
            item={item}
            onToggle={onToggle}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}

        <div className="flex items-center gap-2 pt-1">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Dump a thought..."
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

        {doneItems.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCompleted ? "Hide" : "Show"} {doneItems.length} completed
            </button>
            {showCompleted && (
              <div className="mt-1 space-y-1">
                {doneItems.map((item) => (
                  <EditableItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onRename={onRename}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-1 italic">
            Capture future tasks you don't want to forget — but aren't ready to act on this week.
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync local value from the underlying record only when the user is not
  // actively editing. Otherwise their in-progress text would be overwritten
  // by stale data coming back from the server.
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
  const isVisionBoard = item.label.toLowerCase().includes("vision board");
  const isWeeklyReviewLink =
    category === "weekly_review" &&
    item.label.trim().toLowerCase() === "weekly review";

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
        ) : isVisionBoard ? (
          <a
            href={`${base}vision-board`}
            className="text-[11px] leading-tight font-medium flex-1 text-primary underline hover:text-primary/80 cursor-pointer"
          >
            {item.label}
          </a>
        ) : isWeeklyReviewLink ? (
          <a
            href={`${base}weekly-review`}
            data-testid="link-open-weekly-review"
            className="text-[11px] leading-tight font-medium flex-1 text-primary underline hover:text-primary/80 cursor-pointer"
          >
            {item.label}
          </a>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="text-[11px] leading-tight font-medium flex-1 outline-none focus:bg-muted/30 rounded px-0.5 cursor-text min-h-[16px] bg-transparent border-0 w-full"
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
            <span className="text-xs font-semibold mr-1">Today</span>
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

  const { data: ccTop3 = [] } = useCcTop3();
  const invalidateCcTop3 = () =>
    queryClient.invalidateQueries({ queryKey: ["cc-top3"] });
  const ccDailyRows = useMemo(
    () => ccTop3.filter((r) => r.period === "day"),
    [ccTop3],
  );
  const ccWeeklyRows = useMemo(
    () => ccTop3.filter((r) => r.period === "week"),
    [ccTop3],
  );

  useEffect(() => {
    const onChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["cc-top3"] });
      queryClient.invalidateQueries({ queryKey: ["cc-on-deck"] });
    };
    window.addEventListener("cc:top3-changed", onChanged);
    return () => window.removeEventListener("cc:top3-changed", onChanged);
  }, []);

  const { data: onDeckItems = [] } = useOnDeck();
  const invalidateOnDeck = () =>
    queryClient.invalidateQueries({ queryKey: ["cc-on-deck"] });

  const { data: futureTodos = [] } = useListFutureTodos();
  const invalidateFuture = () =>
    queryClient.invalidateQueries({ queryKey: getListFutureTodosQueryKey() });
  const createFuture = useCreateFutureTodo({
    mutation: { onSuccess: invalidateFuture },
  });
  const updateFuture = useUpdateFutureTodo({
    mutation: { onSuccess: invalidateFuture },
  });
  const deleteFuture = useDeleteFutureTodo({
    mutation: { onSuccess: invalidateFuture },
  });

  const base = import.meta.env.BASE_URL || "/";

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

  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

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
            <CcTop3Card
              title="Today's Top 3"
              icon={Star}
              period="day"
              rows={ccDailyRows}
              onChanged={invalidateCcTop3}
            />
            <CcTop3Card
              title="This Week's Top 3"
              icon={Target}
              period="week"
              rows={ccWeeklyRows}
              onChanged={invalidateCcTop3}
            />
          </div>

          <IdealWeekOnDeckCard
            items={onDeckItems}
            dailyRows={ccDailyRows}
            onChanged={invalidateOnDeck}
          />

          <AutomaticRulesForSuccess />

          <FutureTodoSection
            items={futureTodos}
            onAdd={(title) => {
              createFuture.mutate({
                data: { title, sortOrder: futureTodos.length },
              });
              void fetch(`${base}api/command-center/brain-dump`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: title }),
              });
            }}
            onToggle={(id, completed) =>
              updateFuture.mutate({ id, data: { completed } })
            }
            onDelete={(id) => deleteFuture.mutate({ id })}
            onRename={(id, title) =>
              updateFuture.mutate({ id, data: { title } })
            }
          />

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

          <PersonalBoardOfDirectors />

          <DailyBrainwashing />

          <WordsOfWisdom />

          <ReadingList />
        </div>

        <div className="space-y-2 min-w-0 overflow-hidden">
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
            title="Daily Planning Ritual"
            icon={Rocket}
            bannerColor="bg-[#9cc5cc]"
            textColor="text-slate-900"
          />
          <EditableRitualSection
            category="shutdown"
            title="Shutdown Ritual"
            icon={Moon}
            bannerColor="bg-[#9cc5cc]"
            textColor="text-slate-900"
            journalPrompts={EVENING_PROMPTS}
          />
          <EditableRitualSection
            category="weekly_review"
            title="Weekly Review"
            icon={ClipboardCheck}
            bannerColor="bg-[#cbe0c6]"
            textColor="text-green-900"
          />
          <EditableRitualSection
            category="monthly_review"
            title="Monthly Review"
            icon={Calendar}
            bannerColor="bg-[#cbe0c6]"
            textColor="text-green-900"
          />
          <EditableRitualSection
            category="quarterly_review"
            title="Quarterly Review"
            icon={BarChart3}
            bannerColor="bg-[#efcaa1]"
            textColor="text-orange-900"
          />
          <EditableRitualSection
            category="anchor_meetings"
            title="Anchor Meetings"
            icon={Anchor}
            bannerColor="bg-[#e89c4d]"
            textColor="text-white"
          />
          <EditableRitualSection
            category="deepwork"
            title="Deepwork"
            icon={Brain}
            bannerColor="bg-[#7fa9d4]"
            textColor="text-white"
          />
          <EditableRitualSection
            category="execution_block"
            title="Execution Block"
            icon={Zap}
            bannerColor="bg-[#7e6db0]"
            textColor="text-white"
          />
          <EditableRitualSection
            category="family_friends"
            title="Family/Friends"
            icon={Heart}
            bannerColor="bg-[#e89684]"
            textColor="text-white"
          />
          <EditableRitualSection
            category="patient_care"
            title="Patient Care"
            icon={Stethoscope}
            bannerColor="bg-[#2c3e70]"
            textColor="text-white"
          />
        </div>
      </div>

    </div>
  );
}

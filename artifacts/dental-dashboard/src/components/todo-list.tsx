import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Flag,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  CheckCircle2,
  Clock,
  User as UserIcon,
  MoreHorizontal,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { useListDirectReports } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Status = "todo" | "in_progress" | "awaiting" | "done";
type Priority = "low" | "medium" | "high" | "urgent";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  dueDate?: string;
  assignee?: string;
  createdAt: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  storageKey: string;
  placeholder?: string;
};

const STATUS_META: Record<Status, { label: string; order: number }> = {
  todo: { label: "To Do", order: 0 },
  in_progress: { label: "In Progress", order: 1 },
  awaiting: { label: "Awaiting For", order: 2 },
  done: { label: "Done", order: 3 },
};

const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; order: number }
> = {
  urgent: { label: "Urgent", color: "text-red-600", order: 0 },
  high: { label: "High", color: "text-orange-500", order: 1 },
  medium: { label: "Medium", color: "text-yellow-500", order: 2 },
  low: { label: "Low", color: "text-slate-400", order: 3 },
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "done")
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "in_progress")
    return <CircleDot className="h-4 w-4 text-blue-500" />;
  if (status === "awaiting")
    return <Clock className="h-4 w-4 text-purple-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function safeParseDate(iso?: string): Date | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function formatDue(iso?: string) {
  const d = safeParseDate(iso);
  if (!d) return null;
  if (isToday(d)) return { label: "Today", tone: "warn" as const };
  if (isTomorrow(d)) return { label: "Tomorrow", tone: "info" as const };
  if (isPast(d)) return { label: format(d, "MMM d"), tone: "danger" as const };
  return { label: format(d, "MMM d"), tone: "muted" as const };
}

export function TodoList({
  storageKey,
  placeholder = "Add a task…",
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let loaded: Task[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          loaded = parsed.map(
            (t: Partial<Task> & { text?: string; done?: boolean }) => ({
              id:
                t.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              title: t.title ?? t.text ?? "Untitled",
              description: t.description,
              status: (t.status as Status) ?? (t.done ? "done" : "todo"),
              priority: (t.priority as Priority) ?? "medium",
              dueDate: t.dueDate,
              assignee: t.assignee,
              createdAt: t.createdAt ?? Date.now(),
            }),
          );
        }
      }
    } catch {
      /* ignore */
    }
    setTasks(loaded);
    setHydratedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks, storageKey, hydratedKey]);

  const addTask = () => {
    const title = input.trim();
    if (!title) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        status: "todo",
        priority: "medium",
        createdAt: Date.now(),
      },
    ]);
    setInput("");
  };

  const update = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const remove = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const cycleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: Status =
          t.status === "todo"
            ? "in_progress"
            : t.status === "in_progress"
              ? "awaiting"
              : t.status === "awaiting"
                ? "done"
                : "todo";
        return { ...t, status: next };
      }),
    );
  };

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const sa = STATUS_META[a.status].order - STATUS_META[b.status].order;
      if (sa !== 0) return sa;
      const pa = PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order;
      if (pa !== 0) return pa;
      const da = a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
      if (da !== db) return da - db;
      return a.createdAt - b.createdAt;
    });
  }, [tasks]);

  const active = sorted.filter((t) => t.status !== "done");
  const done = sorted.filter((t) => t.status === "done");
  const total = tasks.length;
  const completed = done.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTask();
            }
          }}
          placeholder={placeholder}
          className="h-9"
        />
        <Button
          size="sm"
          onClick={addTask}
          disabled={!input.trim()}
          aria-label="Add task"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>
            {completed}/{total}
          </span>
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto max-h-80 pr-1 -mr-1">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            No tasks yet — add one above to get started
          </p>
        ) : (
          <>
            {active.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                expanded={!!expanded[t.id]}
                onToggleExpanded={() =>
                  setExpanded((s) => ({ ...s, [t.id]: !s[t.id] }))
                }
                onCycleStatus={() => cycleStatus(t.id)}
                onUpdate={(patch) => update(t.id, patch)}
                onRemove={() => remove(t.id)}
              />
            ))}

            {done.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowDone((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
                >
                  {showDone ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Completed ({done.length})
                </button>
                {showDone &&
                  done.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      expanded={!!expanded[t.id]}
                      onToggleExpanded={() =>
                        setExpanded((s) => ({ ...s, [t.id]: !s[t.id] }))
                      }
                      onCycleStatus={() => cycleStatus(t.id)}
                      onUpdate={(patch) => update(t.id, patch)}
                      onRemove={() => remove(t.id)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type RowProps = {
  task: Task;
  expanded: boolean;
  onToggleExpanded: () => void;
  onCycleStatus: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onRemove: () => void;
};

function TaskRow({
  task,
  expanded,
  onToggleExpanded,
  onCycleStatus,
  onUpdate,
  onRemove,
}: RowProps) {
  const due = formatDue(task.dueDate);
  const isDone = task.status === "done";

  return (
    <div className="group rounded border border-transparent hover:border-border hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          onClick={onCycleStatus}
          title={`Status: ${STATUS_META[task.status].label} (click to advance)`}
          aria-label={`Change status from ${STATUS_META[task.status].label}`}
          className="flex-shrink-0 hover:scale-110 transition-transform"
        >
          <StatusIcon status={task.status} />
        </button>

        <button
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse task details" : "Expand task details"}
          className="flex-1 text-left min-w-0"
        >
          <div
            className={`text-sm truncate ${isDone ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </div>
        </button>

        {task.assignee && (
          <span
            title={`Assigned to ${task.assignee}`}
            className="flex-shrink-0 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase"
          >
            {initials(task.assignee)}
          </span>
        )}

        {task.priority !== "medium" && (
          <Flag
            className={`h-3.5 w-3.5 flex-shrink-0 ${PRIORITY_META[task.priority].color}`}
          />
        )}

        {due && (
          <span
            className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded ${
              due.tone === "danger"
                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                : due.tone === "warn"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : due.tone === "info"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-muted-foreground"
            }`}
          >
            {due.label}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Task actions"
              className="opacity-40 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground transition-opacity p-0.5"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onUpdate({ status: "todo" })}>
              <Circle className="h-4 w-4 mr-2" /> To Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ status: "in_progress" })}>
              <CircleDot className="h-4 w-4 mr-2 text-blue-500" /> In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ status: "awaiting" })}>
              <Clock className="h-4 w-4 mr-2 text-purple-500" /> Awaiting For
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ status: "done" })}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Done
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="px-2 pb-2 pt-0 space-y-2 border-t border-border/50">
          <Input
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-8 text-sm mt-2"
            placeholder="Task title"
          />
          <Textarea
            value={task.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Add a description…"
            className="text-sm min-h-[60px] resize-none"
          />
          <AssigneePicker
            value={task.assignee}
            onChange={(v) => onUpdate({ assignee: v })}
          />
          <div className="flex flex-wrap gap-2">
            <Select
              value={task.priority}
              onValueChange={(v) => onUpdate({ priority: v as Priority })}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <Flag
                  className={`h-3.5 w-3.5 mr-1 ${PRIORITY_META[task.priority].color}`}
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <Flag className={`h-3.5 w-3.5 ${PRIORITY_META[p].color}`} />
                      {PRIORITY_META[p].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-normal"
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  {task.dueDate
                    ? format(parseISO(task.dueDate), "MMM d, yyyy")
                    : "Due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.dueDate ? parseISO(task.dueDate) : undefined}
                  onSelect={(d) =>
                    onUpdate({
                      dueDate: d ? format(d, "yyyy-MM-dd") : undefined,
                    })
                  }
                  initialFocus
                />
                {task.dueDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => onUpdate({ dueDate: undefined })}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}

function AssigneePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: reports, isLoading } = useListDirectReports();

  const list = reports ?? [];
  const selected = list.find((r) => r.name === value);
  const isMe = value === "Me";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="w-full h-8 justify-between font-normal text-sm"
        >
          {value ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase">
                {initials(value)}
              </span>
              <span className="truncate">{value}</span>
              {isMe ? (
                <span className="text-xs text-muted-foreground truncate">
                  · Me
                </span>
              ) : (
                selected?.role && (
                  <span className="text-xs text-muted-foreground truncate">
                    · {selected.role}
                  </span>
                )
              )}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserIcon className="h-3.5 w-3.5" />
              Assign to me or a direct report…
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search assignees…" className="h-9" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading…" : "No matches found"}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Me"
                onSelect={() => {
                  onChange("Me");
                  setOpen(false);
                }}
              >
                <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1 rounded-full bg-primary/20 text-primary text-[10px] font-semibold uppercase mr-2">
                  Me
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm truncate">Me</span>
                  <span className="text-xs text-muted-foreground truncate">
                    Assign to yourself
                  </span>
                </div>
              </CommandItem>
              {list.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.name}
                  onSelect={() => {
                    onChange(r.name);
                    setOpen(false);
                  }}
                >
                  <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase mr-2">
                    {initials(r.name)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate">{r.name}</span>
                    {r.role && (
                      <span className="text-xs text-muted-foreground truncate">
                        {r.role}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {value && (
              <div className="p-1 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs justify-start"
                  onClick={() => {
                    onChange(undefined);
                    setOpen(false);
                  }}
                >
                  Clear assignment
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

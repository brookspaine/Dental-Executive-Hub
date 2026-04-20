import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrgChartSeat,
  listOrgChartSeats,
  getGetOrgChartSeatQueryKey,
  getListOrgChartSeatsQueryKey,
  listSeatTasks,
  createSeatTask,
  updateSeatTask,
  deleteSeatTask,
  getListSeatTasksQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Trash2,
  UserCircle2,
  LayoutGrid,
  List,
  Flag,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Seat = {
  id: number;
  organizationId: number;
  parentSeatId?: number | null;
  title: string;
  name?: string | null;
  accountabilities: string[];
  keyResultsArea: string[];
  sortOrder: number;
};

type Task = {
  id: number;
  seatId: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignee?: string | null;
  dueDate?: string | null;
  completed: boolean;
  sortOrder: number;
  createdAt?: string;
};

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

const PRIORITIES = [
  { key: "high", label: "High", className: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  { key: "medium", label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { key: "low", label: "Low", className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
] as const;

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function priorityMeta(p: string) {
  return PRIORITIES.find((x) => x.key === p) ?? PRIORITIES[1];
}

function statusLabel(s: string) {
  return COLUMNS.find((c) => c.key === s)?.label ?? s;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDueDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(d?: string | null, completed?: boolean): boolean {
  if (!d || completed) return false;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  return new Date(d + "T00:00:00").getTime() < today;
}

export function SeatDetail() {
  const [match, params] = useRoute<{ id: string }>("/org-chart/seats/:id");
  const seatId = match ? parseInt(params!.id, 10) : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const seatQuery = useQuery({
    queryKey: seatId !== null ? getGetOrgChartSeatQueryKey(seatId) : ["seat", "none"],
    queryFn: () => getOrgChartSeat(seatId as number),
    enabled: seatId !== null,
    retry: false,
  });
  const seat = (seatQuery.data as Seat | undefined) ?? null;

  const peersQuery = useQuery({
    queryKey: seat
      ? getListOrgChartSeatsQueryKey(seat.organizationId)
      : ["seats", "none"],
    queryFn: () => listOrgChartSeats(seat!.organizationId),
    enabled: !!seat,
  });
  const allSeats: Seat[] = (peersQuery.data as Seat[] | undefined) ?? [];
  const parent = seat?.parentSeatId
    ? allSeats.find((s) => s.id === seat.parentSeatId) ?? null
    : null;

  const tasksQuery = useQuery({
    queryKey: seatId ? getListSeatTasksQueryKey(seatId) : ["tasks", "none"],
    queryFn: () => listSeatTasks(seatId as number),
    enabled: seatId !== null,
  });
  const tasks: Task[] = (tasksQuery.data as Task[] | undefined) ?? [];

  const invalidateTasks = () => {
    if (seatId !== null) {
      queryClient.invalidateQueries({
        queryKey: getListSeatTasksQueryKey(seatId),
      });
    }
  };

  const errToast = (label: string) => (err: any) => {
    const msg = err?.response?.data?.error ?? err?.message ?? "Something went wrong";
    toast({
      title: label,
      description: typeof msg === "string" ? msg : "Something went wrong",
      variant: "destructive",
    });
  };

  const createMut = useMutation({
    mutationFn: (data: any) => createSeatTask(seatId as number, data),
    onSuccess: invalidateTasks,
    onError: errToast("Could not add task"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateSeatTask(id, data),
    onSuccess: invalidateTasks,
    onError: errToast("Could not save task"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSeatTask(id),
    onSuccess: invalidateTasks,
    onError: errToast("Could not delete task"),
  });

  // View + filter state
  const [view, setView] = useState<"board" | "list">("board");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [listSort, setListSort] = useState<"due" | "priority" | "created">("due");

  // Quick add state
  const [quickAddCol, setQuickAddCol] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  // Edit dialog state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    dueDate: string;
    status: string;
    priority: string;
    assignee: string;
  }>({
    title: "",
    description: "",
    dueDate: "",
    status: "todo",
    priority: "medium",
    assignee: "",
  });

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.assignee && t.assignee.trim()) set.add(t.assignee.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "__unassigned__") {
          if (t.assignee && t.assignee.trim()) return false;
        } else if ((t.assignee ?? "").trim() !== assigneeFilter) return false;
      }
      if (!showCompleted && t.completed) return false;
      return true;
    });
  }, [tasks, priorityFilter, assigneeFilter, showCompleted]);

  const sortedListTasks = useMemo(() => {
    const arr = [...filteredTasks];
    if (listSort === "due") {
      arr.sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (ad !== bd) return ad - bd;
        return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      });
    } else if (listSort === "priority") {
      arr.sort((a, b) => {
        const ap = PRIORITY_RANK[a.priority] ?? 9;
        const bp = PRIORITY_RANK[b.priority] ?? 9;
        if (ap !== bp) return ap - bp;
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });
    } else {
      arr.sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() -
          new Date(b.createdAt ?? 0).getTime()
      );
    }
    return arr;
  }, [filteredTasks, listSort]);

  const handleQuickAdd = (status: string) => {
    if (!quickAddTitle.trim()) {
      setQuickAddCol(null);
      return;
    }
    createMut.mutate(
      { title: quickAddTitle.trim(), status, priority: "medium" },
      {
        onSuccess: () => {
          setQuickAddTitle("");
          setQuickAddCol(null);
        },
      }
    );
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setEditForm({
      title: t.title,
      description: t.description ?? "",
      dueDate: t.dueDate ?? "",
      status: t.status,
      priority: t.priority ?? "medium",
      assignee: t.assignee ?? "",
    });
  };

  const saveEdit = () => {
    if (!editingTask) return;
    if (!editForm.title.trim()) return;
    updateMut.mutate(
      {
        id: editingTask.id,
        data: {
          title: editForm.title.trim(),
          description: editForm.description.trim()
            ? editForm.description.trim()
            : null,
          dueDate: editForm.dueDate ? editForm.dueDate : null,
          status: editForm.status,
          priority: editForm.priority,
          assignee: editForm.assignee.trim() ? editForm.assignee.trim() : null,
        },
      },
      { onSuccess: () => setEditingTask(null) }
    );
  };

  const moveTo = (t: Task, status: string) => {
    updateMut.mutate({
      id: t.id,
      data: { status, completed: status === "done" },
    });
  };

  const setPriority = (t: Task, priority: string) => {
    updateMut.mutate({ id: t.id, data: { priority } });
  };

  const toggleComplete = (t: Task) => {
    const completed = !t.completed;
    updateMut.mutate({
      id: t.id,
      data: {
        completed,
        status: completed ? "done" : t.status === "done" ? "todo" : t.status,
      },
    });
  };

  if (seatQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (!seat) {
    return (
      <div className="space-y-4">
        <Link href="/org-chart">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to chart
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Seat not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasksByStatus = (status: string) =>
    filteredTasks.filter((t) => t.status === status);

  const filtersActive =
    priorityFilter !== "all" || assigneeFilter !== "all" || !showCompleted;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/org-chart">
            <Button variant="ghost" size="sm" className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <UserCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight leading-tight">
                {seat.title}
              </h2>
              <div className="text-sm text-muted-foreground mt-0.5">
                {seat.name ?? <span className="italic">Vacant</span>}
                {parent && (
                  <>
                    {" · Reports to "}
                    <Link
                      href={`/org-chart/seats/${parent.id}`}
                      className="text-foreground font-medium hover:underline"
                    >
                      {parent.title}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {seat.accountabilities && seat.accountabilities.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Accountabilities
              </div>
              <ul className="space-y-1">
                {seat.accountabilities.map((a, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="h-1.5 w-1.5 mt-2 shrink-0 rounded-full bg-muted-foreground" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                Key Results Area (KRA)
              </div>
              {seat.keyResultsArea && seat.keyResultsArea.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {seat.keyResultsArea.length}{" "}
                  {seat.keyResultsArea.length === 1 ? "result" : "results"}
                </span>
              )}
            </div>
            {seat.keyResultsArea && seat.keyResultsArea.length > 0 ? (
              <ul className="space-y-1">
                {seat.keyResultsArea.map((k, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="h-1.5 w-1.5 mt-2 shrink-0 rounded-full bg-primary" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No key results defined yet. Use Edit on the org chart to add the
                measurable outcomes this role is judged by.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded ${
                view === "board"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Board view"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded ${
                view === "list"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
              <Flag className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
              <UserCircle2 className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {assigneeOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="text-xs flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              checked={showCompleted}
              onCheckedChange={(v) => setShowCompleted(!!v)}
            />
            Show completed
          </label>

          {view === "list" && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sort by</span>
              <Select value={listSort} onValueChange={(v) => setListSort(v as any)}>
                <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Due date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setPriorityFilter("all");
                setAssigneeFilter("all");
                setShowCompleted(true);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {view === "board" ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.key} className="flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {tasksByStatus(col.key).length}
                    </span>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 space-y-2 min-h-[120px] flex-1">
                  {tasksByStatus(col.key).length === 0 &&
                    quickAddCol !== col.key && (
                      <div className="text-xs text-muted-foreground italic text-center py-4">
                        No tasks yet
                      </div>
                    )}
                  {tasksByStatus(col.key).map((t) => (
                    <BoardCard
                      key={t.id}
                      task={t}
                      onClick={() => openEdit(t)}
                      onToggle={() => toggleComplete(t)}
                      onMove={(s) => moveTo(t, s)}
                      onDelete={() => deleteMut.mutate(t.id)}
                      onCyclePriority={() => {
                        const idx = PRIORITIES.findIndex((p) => p.key === t.priority);
                        const next = PRIORITIES[(idx + 1) % PRIORITIES.length].key;
                        setPriority(t, next);
                      }}
                    />
                  ))}

                  {quickAddCol === col.key ? (
                    <div className="bg-background rounded-md border p-2 space-y-2">
                      <Input
                        autoFocus
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        placeholder="Task title…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleQuickAdd(col.key);
                          if (e.key === "Escape") {
                            setQuickAddCol(null);
                            setQuickAddTitle("");
                          }
                        }}
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7"
                          onClick={() => handleQuickAdd(col.key)}
                          disabled={!quickAddTitle.trim() || createMut.isPending}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={() => {
                            setQuickAddCol(null);
                            setQuickAddTitle("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-xs h-8 text-muted-foreground"
                      onClick={() => {
                        setQuickAddCol(col.key);
                        setQuickAddTitle("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add task
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ListView
            tasks={sortedListTasks}
            onClick={openEdit}
            onToggle={toggleComplete}
            onMove={moveTo}
            onDelete={(id) => deleteMut.mutate(id)}
          />
        )}
      </div>

      <Dialog
        open={editingTask !== null}
        onOpenChange={(o) => {
          if (!o) setEditingTask(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Description / notes</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                placeholder="Add details, context, links…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Assignee</Label>
                <Input
                  value={editForm.assignee}
                  onChange={(e) =>
                    setEditForm({ ...editForm, assignee: e.target.value })
                  }
                  placeholder="Person responsible"
                />
              </div>
              <div className="grid gap-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (editingTask && window.confirm("Delete this task?")) {
                  deleteMut.mutate(editingTask.id, {
                    onSuccess: () => setEditingTask(null),
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button
                onClick={saveEdit}
                disabled={!editForm.title.trim() || updateMut.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssigneeAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-7 w-7 text-[11px]" : "h-5 w-5 text-[10px]";
  return (
    <span
      className={`${dim} inline-flex items-center justify-center rounded-full bg-primary/15 text-primary font-semibold`}
      title={name}
    >
      {initialsOf(name)}
    </span>
  );
}

function PriorityPill({ priority, onClick }: { priority: string; onClick?: () => void }) {
  const meta = priorityMeta(priority);
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={
        onClick
          ? (e: any) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${meta.className} ${onClick ? "hover:opacity-80 cursor-pointer" : ""}`}
      title={`Priority: ${meta.label}${onClick ? " (click to change)" : ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Comp>
  );
}

function BoardCard({
  task,
  onClick,
  onToggle,
  onMove,
  onDelete,
  onCyclePriority,
}: {
  task: Task;
  onClick: () => void;
  onToggle: () => void;
  onMove: (status: string) => void;
  onDelete: () => void;
  onCyclePriority: () => void;
}) {
  const dueDateFmt = task.dueDate ? formatDueDate(task.dueDate) : null;
  const overdue = isOverdue(task.dueDate, task.completed);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className="group bg-background rounded-md border p-2.5 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => onToggle()}
            aria-label="Toggle complete"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div
            className={`text-sm font-medium leading-snug ${
              task.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <PriorityPill priority={task.priority} onClick={onCyclePriority} />
            {dueDateFmt && (
              <span
                className={`text-[11px] inline-flex items-center gap-1 ${
                  overdue ? "text-destructive font-medium" : "text-muted-foreground"
                }`}
              >
                {overdue ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                {dueDateFmt}
              </span>
            )}
            {task.assignee && task.assignee.trim() && (
              <span className="ml-auto">
                <AssigneeAvatar name={task.assignee} />
              </span>
            )}
          </div>
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 flex flex-col items-end gap-1"
        >
          <select
            value={task.status}
            onChange={(e) => onMove(e.target.value)}
            className="text-[10px] border rounded px-1 py-0.5 bg-background"
            aria-label="Move to column"
          >
            {COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={onDelete}
            aria-label="Delete task"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ListView({
  tasks,
  onClick,
  onToggle,
  onMove,
  onDelete,
}: {
  tasks: Task[];
  onClick: (t: Task) => void;
  onToggle: (t: Task) => void;
  onMove: (t: Task, status: string) => void;
  onDelete: (id: number) => void;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No tasks match the current filters.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 gap-y-0 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b items-center">
        <span></span>
        <span>Task</span>
        <span>Priority</span>
        <span>Assignee</span>
        <span>Due</span>
        <span>Status</span>
      </div>
      <div className="divide-y">
        {tasks.map((t) => {
          const dueDateFmt = t.dueDate ? formatDueDate(t.dueDate) : null;
          const overdue = isOverdue(t.dueDate, t.completed);
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onClick(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onClick(t);
              }}
              className="group grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 items-center hover:bg-muted/30 cursor-pointer text-sm"
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={t.completed}
                  onCheckedChange={() => onToggle(t)}
                  aria-label="Toggle complete"
                />
              </div>
              <div className="min-w-0">
                <div
                  className={`font-medium truncate ${
                    t.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {t.title}
                </div>
                {t.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {t.description}
                  </div>
                )}
              </div>
              <PriorityPill priority={t.priority} />
              <div className="min-w-[80px]">
                {t.assignee && t.assignee.trim() ? (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <AssigneeAvatar name={t.assignee} />
                    <span className="truncate max-w-[120px]">{t.assignee}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">—</span>
                )}
              </div>
              <div
                className={`text-xs whitespace-nowrap ${
                  overdue ? "text-destructive font-medium" : "text-muted-foreground"
                }`}
              >
                {dueDateFmt ? (
                  <span className="inline-flex items-center gap-1">
                    {overdue ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {dueDateFmt}
                  </span>
                ) : (
                  <span className="italic">—</span>
                )}
              </div>
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2"
              >
                <select
                  value={t.status}
                  onChange={(e) => onMove(t, e.target.value)}
                  className="text-xs border rounded px-1.5 py-0.5 bg-background"
                  aria-label="Status"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onDelete(t.id)}
                  aria-label="Delete task"
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

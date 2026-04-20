import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrgChartSeat,
  listOrgChartSeats,
  updateOrgChartSeat,
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
import { Label } from "@/components/ui/label";
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
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  EditablePhoto,
  resolvePhotoUrl,
  dicebearUrl,
} from "@/components/editable-photo";

type Seat = {
  id: number;
  organizationId: number;
  parentSeatId?: number | null;
  title: string;
  name?: string | null;
  photoUrl?: string | null;
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

const STATUSES = [
  { key: "todo", label: "To Do", className: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "in_progress", label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "done", label: "Done", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
] as const;

const UNASSIGNED = "__unassigned__";

function statusMeta(s: string) {
  return STATUSES.find((x) => x.key === s) ?? STATUSES[0];
}

const photoFor = resolvePhotoUrl;

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

type TaskForm = {
  title: string;
  assignee: string;
  status: string;
  dueDate: string;
};

const EMPTY_FORM: TaskForm = {
  title: "",
  assignee: "",
  status: "todo",
  dueDate: "",
};

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

  // Anyone in this practice (location) can be assigned a task — not just direct reports.
  const directReports = useMemo(
    () =>
      allSeats
        .filter((s) => s.id !== seat?.id && s.name && s.name.trim())
        .sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", undefined, {
            sensitivity: "base",
          })
        ),
    [allSeats, seat?.id]
  );

  // Lookup table by name for resolving an assignee → seat (so we can show photos).
  const seatByName = useMemo(() => {
    const m = new Map<string, Seat>();
    for (const s of allSeats) {
      if (s.name && s.name.trim()) m.set(s.name.trim(), s);
    }
    return m;
  }, [allSeats]);

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

  const updateSeatMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateOrgChartSeat(id, data),
    onSuccess: (_data, variables) => {
      if (seat) {
        queryClient.invalidateQueries({
          queryKey: getListOrgChartSeatsQueryKey(seat.organizationId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: getGetOrgChartSeatQueryKey(variables.id),
      });
    },
    onError: errToast("Could not update seat"),
  });

  const updateSeatField = (
    target: Seat,
    field: "title" | "name",
    value: string | null,
  ) => {
    const nextValue =
      field === "title" ? (value ?? "").trim() : value;
    if (field === "title" && !nextValue) return;
    if ((target[field] ?? null) === (nextValue ?? null)) return;
    updateSeatMut.mutate({ id: target.id, data: { [field]: nextValue } });
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  const openAdd = () => {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setForm({
      title: t.title,
      assignee: t.assignee ?? "",
      status: t.status ?? "todo",
      dueDate: t.dueDate ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTask(null);
  };

  const save = () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      assignee: form.assignee.trim() ? form.assignee.trim() : null,
      status: form.status,
      dueDate: form.dueDate ? form.dueDate : null,
      completed: form.status === "done",
    };
    if (editingTask) {
      updateMut.mutate(
        { id: editingTask.id, data: payload },
        { onSuccess: closeDialog }
      );
    } else {
      createMut.mutate(payload, { onSuccess: closeDialog });
    }
  };

  const handleInlineAssigneeChange = (task: Task, value: string) => {
    const assignee = value === UNASSIGNED ? null : value;
    updateMut.mutate({ id: task.id, data: { assignee } });
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
            <EditablePhoto seat={seat} size="lg" />
            <div>
              <InlineEditableText
                value={seat.title}
                placeholder="Untitled role"
                ariaLabel="Edit role title"
                required
                className="text-2xl font-bold tracking-tight leading-tight"
                onSave={(v) => updateSeatField(seat, "title", v)}
              />
              <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                <InlineEditableText
                  value={seat.name ?? ""}
                  placeholder="Vacant"
                  emptyDisplay={<span className="italic">Vacant</span>}
                  ariaLabel="Edit person's name"
                  className="text-sm"
                  onSave={(v) =>
                    updateSeatField(seat, "name", v.trim() ? v : null)
                  }
                />
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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add task
          </Button>
        </div>

        <div className="bg-muted/40 rounded-lg p-2 space-y-2 min-h-[120px]">
          {tasks.length === 0 && (
            <div className="text-xs text-muted-foreground italic text-center py-6">
              No tasks yet
            </div>
          )}
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              assigneeSeat={t.assignee ? seatByName.get(t.assignee.trim()) ?? null : null}
              directReports={directReports}
              onClick={() => openEdit(t)}
              onDelete={() => deleteMut.mutate(t.id)}
              onAssigneeChange={(v) => handleInlineAssigneeChange(t, v)}
            />
          ))}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit task" : "Add task"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Task name *</Label>
              <Input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <Select
                value={form.assignee.trim() ? form.assignee : UNASSIGNED}
                onValueChange={(v) =>
                  setForm({ ...form, assignee: v === UNASSIGNED ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose someone in this practice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>— Unassigned —</SelectItem>
                  {directReports.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                      No one in this practice yet
                    </div>
                  )}
                  {directReports.map((s) => (
                    <SelectItem key={s.id} value={s.name as string}>
                      <span className="inline-flex items-center gap-2">
                        <img
                          src={photoFor(s)}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover bg-muted"
                        />
                        {s.name}
                        <span className="text-xs text-muted-foreground">
                          · {s.title}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            {editingTask ? (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm("Delete this task?")) {
                    deleteMut.mutate(editingTask.id, { onSuccess: closeDialog });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={
                  !form.title.trim() ||
                  createMut.isPending ||
                  updateMut.isPending
                }
              >
                {editingTask ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function PersonAvatar({ seat, fallbackName }: { seat: Seat | null; fallbackName?: string | null }) {
  if (seat) {
    return <EditablePhoto seat={seat} size="md" />;
  }
  if (fallbackName && fallbackName.trim()) {
    return (
      <img
        src={dicebearUrl(fallbackName.trim())}
        alt=""
        className="h-9 w-9 rounded-full object-cover bg-muted border shrink-0"
        title={fallbackName}
      />
    );
  }
  return (
    <div className="h-9 w-9 rounded-full bg-muted border shrink-0 flex items-center justify-center text-muted-foreground">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </svg>
    </div>
  );
}

function TaskCard({
  task,
  assigneeSeat,
  directReports,
  onClick,
  onDelete,
  onAssigneeChange,
}: {
  task: Task;
  assigneeSeat: Seat | null;
  directReports: Seat[];
  onClick: () => void;
  onDelete: () => void;
  onAssigneeChange: (value: string) => void;
}) {
  const dueDateFmt = task.dueDate ? formatDueDate(task.dueDate) : null;
  const overdue = isOverdue(task.dueDate, task.completed);
  const currentValue = task.assignee && task.assignee.trim() ? task.assignee : UNASSIGNED;
  const currentAssigneeName = task.assignee?.trim() ?? "";
  const currentInList = directReports.some((s) => s.name === currentAssigneeName);
  const showLegacyOption = currentAssigneeName !== "" && !currentInList;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className="group bg-background rounded-md border p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-3">
        <PersonAvatar seat={assigneeSeat} fallbackName={task.assignee ?? null} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug truncate">
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusPill status={task.status} />
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
          </div>
          <div
            className="mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Select value={currentValue} onValueChange={onAssigneeChange}>
              <SelectTrigger className="h-7 text-xs w-full max-w-[260px]">
                <SelectValue placeholder="Assign someone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>— Unassigned —</SelectItem>
                {showLegacyOption && (
                  <SelectItem value={currentAssigneeName}>
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={dicebearUrl(currentAssigneeName)}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover bg-muted"
                      />
                      {currentAssigneeName}
                      <span className="text-xs text-muted-foreground">· not in this practice</span>
                    </span>
                  </SelectItem>
                )}
                {directReports.length === 0 && !showLegacyOption && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                    No one in this practice yet
                  </div>
                )}
                {directReports.map((s) => (
                  <SelectItem key={s.id} value={s.name as string}>
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={photoFor(s)}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover bg-muted"
                      />
                      {s.name}
                      <span className="text-xs text-muted-foreground">
                        · {s.title}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onDelete}
            aria-label="Delete task"
            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InlineEditableText({
  value,
  onSave,
  placeholder,
  emptyDisplay,
  ariaLabel,
  className = "",
  required = false,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  emptyDisplay?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  required?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft;
    if (required && !trimmed.trim()) {
      setDraft(value);
      setEditing(false);
      return;
    }
    if (trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`bg-background border border-input rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      />
    );
  }

  const isEmpty = !value || !value.trim();
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      className={`text-left rounded px-1 -mx-1 hover:bg-muted/60 cursor-text ${className}`}
    >
      {isEmpty ? emptyDisplay ?? <span className="italic text-muted-foreground">{placeholder}</span> : value}
    </button>
  );
}

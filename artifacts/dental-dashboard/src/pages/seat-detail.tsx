import { useState } from "react";
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
  UserCircle2,
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

const STATUSES = [
  { key: "todo", label: "To Do", className: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "in_progress", label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "done", label: "Done", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
] as const;

function statusMeta(s: string) {
  return STATUSES.find((x) => x.key === s) ?? STATUSES[0];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Pick a stable color for each assignee so avatars feel like distinct people.
const AVATAR_PALETTES = [
  "bg-rose-200 text-rose-800",
  "bg-amber-200 text-amber-800",
  "bg-emerald-200 text-emerald-800",
  "bg-sky-200 text-sky-800",
  "bg-violet-200 text-violet-800",
  "bg-fuchsia-200 text-fuchsia-800",
  "bg-teal-200 text-teal-800",
  "bg-orange-200 text-orange-800",
];
function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
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
      </div>

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
              onClick={() => openEdit(t)}
              onDelete={() => deleteMut.mutate(t.id)}
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
              <Label>Direct report</Label>
              <div className="flex items-center gap-2">
                {form.assignee.trim() && (
                  <AssigneeAvatar name={form.assignee} size="md" />
                )}
                <Input
                  value={form.assignee}
                  onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                  placeholder="Person responsible"
                />
              </div>
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

function AssigneeAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs";
  const palette = paletteFor(name);
  return (
    <span
      className={`${dim} ${palette} inline-flex items-center justify-center rounded-full font-semibold shrink-0`}
      title={name}
      aria-label={name}
    >
      {initialsOf(name)}
    </span>
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

function TaskCard({
  task,
  onClick,
  onDelete,
}: {
  task: Task;
  onClick: () => void;
  onDelete: () => void;
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
      className="group bg-background rounded-md border p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-3">
        {task.assignee && task.assignee.trim() ? (
          <AssigneeAvatar name={task.assignee} size="md" />
        ) : (
          <span className="h-9 w-9 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center shrink-0">
            <UserCircle2 className="h-5 w-5" />
          </span>
        )}
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

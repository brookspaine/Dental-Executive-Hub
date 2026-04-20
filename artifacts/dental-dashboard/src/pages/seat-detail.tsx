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
  ArrowLeft,
  Plus,
  Calendar,
  Trash2,
  UserCircle2,
  GripVertical,
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
  dueDate?: string | null;
  completed: boolean;
  sortOrder: number;
};

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

export function SeatDetail() {
  const [match, params] = useRoute<{ id: string }>("/org-chart/seats/:id");
  const seatId = match ? parseInt(params!.id, 10) : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load this seat directly by id so we can resolve its organization.
  const seatQuery = useQuery({
    queryKey: seatId !== null ? getGetOrgChartSeatQueryKey(seatId) : ["seat", "none"],
    queryFn: () => getOrgChartSeat(seatId as number),
    enabled: seatId !== null,
    retry: false,
  });
  const seat = (seatQuery.data as Seat | undefined) ?? null;

  // Load peers in this seat's organization so we can show the parent name + link.
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

  // Tasks
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
    const msg =
      err?.response?.data?.error ?? err?.message ?? "Something went wrong";
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

  const [quickAddCol, setQuickAddCol] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    dueDate: string;
    status: string;
  }>({ title: "", description: "", dueDate: "", status: "todo" });

  const handleQuickAdd = (status: string) => {
    if (!quickAddTitle.trim()) {
      setQuickAddCol(null);
      return;
    }
    createMut.mutate(
      { title: quickAddTitle.trim(), status },
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
    return (
      <div className="text-sm text-muted-foreground">Loading…</div>
    );
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
    tasks.filter((t) => t.status === status);
  const counts = COLUMNS.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = tasksByStatus(c.key).length;
    return acc;
  }, {});

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

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold">Action Items</h3>
          <span className="text-xs text-muted-foreground">
            {tasks.length} total ·{" "}
            {tasks.filter((t) => t.completed).length} completed
          </span>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{col.label}</span>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {counts[col.key] ?? 0}
                  </span>
                </div>
              </div>
              <div className="bg-muted/40 rounded-lg p-2 space-y-2 min-h-[120px] flex-1">
                {tasksByStatus(col.key).length === 0 &&
                  quickAddCol !== col.key && (
                    <div className="text-xs text-muted-foreground italic text-center py-4">
                      No action items yet
                    </div>
                  )}
                {tasksByStatus(col.key).map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    columnKeys={COLUMNS.map((c) => c.key)}
                    onClick={() => openEdit(t)}
                    onToggle={() => toggleComplete(t)}
                    onMove={(s) => moveTo(t, s)}
                    onDelete={() => deleteMut.mutate(t.id)}
                  />
                ))}

                {quickAddCol === col.key ? (
                  <div className="bg-background rounded-md border p-2 space-y-2">
                    <Input
                      autoFocus
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      placeholder="Action item…"
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
                    Add action item
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={editingTask !== null}
        onOpenChange={(o) => {
          if (!o) setEditingTask(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit action item</DialogTitle>
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
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (
                  editingTask &&
                  window.confirm("Delete this action item?")
                ) {
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

function TaskCard({
  task,
  columnKeys,
  onClick,
  onToggle,
  onMove,
  onDelete,
}: {
  task: Task;
  columnKeys: readonly string[];
  onClick: () => void;
  onToggle: () => void;
  onMove: (status: string) => void;
  onDelete: () => void;
}) {
  const dueDateFmt = task.dueDate
    ? new Date(task.dueDate + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;
  const overdue =
    !!task.dueDate &&
    !task.completed &&
    new Date(task.dueDate + "T00:00:00").getTime() <
      new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();

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
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium leading-snug ${
              task.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {task.description}
            </div>
          )}
          {dueDateFmt && (
            <div
              className={`text-[11px] mt-1 inline-flex items-center gap-1 ${
                overdue
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {dueDateFmt}
            </div>
          )}
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
            {columnKeys.map((k) => (
              <option key={k} value={k}>
                {k === "todo"
                  ? "To Do"
                  : k === "in_progress"
                  ? "In Progress"
                  : "Done"}
              </option>
            ))}
          </select>
          <button
            onClick={onDelete}
            aria-label="Delete action item"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

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
  listOrganizations,
  listSeatKeyResults,
  createSeatKeyResult,
  updateSeatKeyResult,
  deleteSeatKeyResult,
  getListSeatKeyResultsQueryKey,
  listVendorPasswords as vpList,
  createVendorPassword as vpCreate,
  updateVendorPassword as vpUpdate,
  deleteVendorPassword as vpDelete,
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
  KeyRound,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  EditablePhoto,
  resolvePhotoUrl,
} from "@/components/editable-photo";
import { Checkbox } from "@/components/ui/checkbox";

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
  keyResultId?: number | null;
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
  keyResultId: number | null;
};

const EMPTY_FORM: TaskForm = {
  title: "",
  assignee: "",
  status: "todo",
  dueDate: "",
  keyResultId: null,
};

type KeyResult = {
  id: number;
  seatId: number;
  title: string;
  description?: string | null;
  sortOrder: number;
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

  // For assignee dropdowns: anyone with a name across the entire org chart
  // (every practice/location), so tasks can be assigned to any team member.
  const allOrgsQuery = useQuery({
    queryKey: ["organizations", "all-for-assignees"],
    queryFn: () => listOrganizations(),
  });
  const allOrgs = (allOrgsQuery.data as Array<{ id: number }> | undefined) ?? [];
  const allSeatsAcrossOrgsQuery = useQuery({
    queryKey: ["org-chart-seats", "all", allOrgs.map((o) => o.id).sort()],
    queryFn: async () => {
      const lists = await Promise.all(
        allOrgs.map((o) => listOrgChartSeats(o.id) as Promise<Seat[]>),
      );
      return lists.flat();
    },
    enabled: allOrgs.length > 0,
  });
  const everyoneSeats: Seat[] =
    (allSeatsAcrossOrgsQuery.data as Seat[] | undefined) ?? [];

  const directReports = useMemo(() => {
    const seen = new Set<string>();
    return everyoneSeats
      .filter((s) => {
        const name = s.name?.trim();
        if (!name) return false;
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", undefined, {
          sensitivity: "base",
        }),
      );
  }, [everyoneSeats, seat?.id]);

  // Lookup table by name for resolving an assignee → seat (so we can show photos).
  // Uses everyone across the org chart so legacy/cross-practice assignees still resolve.
  const seatByName = useMemo(() => {
    const m = new Map<string, Seat>();
    for (const s of everyoneSeats) {
      if (s.name && s.name.trim() && !m.has(s.name.trim())) {
        m.set(s.name.trim(), s);
      }
    }
    return m;
  }, [everyoneSeats]);

  const tasksQuery = useQuery({
    queryKey: seatId ? getListSeatTasksQueryKey(seatId) : ["tasks", "none"],
    queryFn: () => listSeatTasks(seatId as number),
    enabled: seatId !== null,
  });
  const tasks: Task[] = (tasksQuery.data as Task[] | undefined) ?? [];

  const keyResultsQuery = useQuery({
    queryKey: seatId
      ? getListSeatKeyResultsQueryKey(seatId)
      : ["key-results", "none"],
    queryFn: () => listSeatKeyResults(seatId as number),
    enabled: seatId !== null,
  });
  const keyResults: KeyResult[] =
    (keyResultsQuery.data as KeyResult[] | undefined) ?? [];

  const tasksByKra = useMemo(() => {
    const m = new Map<number | "none", Task[]>();
    for (const t of tasks) {
      const key = (t.keyResultId ?? null) === null ? "none" : (t.keyResultId as number);
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [tasks]);

  const invalidateTasks = () => {
    if (seatId !== null) {
      queryClient.invalidateQueries({
        queryKey: getListSeatTasksQueryKey(seatId),
      });
    }
  };

  const invalidateKras = () => {
    if (seatId !== null) {
      queryClient.invalidateQueries({
        queryKey: getListSeatKeyResultsQueryKey(seatId),
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

  const createKraMut = useMutation({
    mutationFn: (data: any) => createSeatKeyResult(seatId as number, data),
    onSuccess: invalidateKras,
    onError: errToast("Could not add key result"),
  });
  const updateKraMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateSeatKeyResult(id, data),
    onSuccess: () => {
      invalidateKras();
    },
    onError: errToast("Could not save key result"),
  });
  const deleteKraMut = useMutation({
    mutationFn: (id: number) => deleteSeatKeyResult(id),
    onSuccess: () => {
      invalidateKras();
      invalidateTasks();
    },
    onError: errToast("Could not delete key result"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  const openAdd = (keyResultId: number | null = null) => {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, keyResultId });
    setDialogOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setForm({
      title: t.title,
      assignee: t.assignee ?? "",
      status: t.status ?? "todo",
      dueDate: t.dueDate ?? "",
      keyResultId: t.keyResultId ?? null,
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
      keyResultId: form.keyResultId,
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

      {seat.title.toLowerCase().includes("lead assistant") && (
        <VendorPasswordsSection seatId={seat.id} />
      )}

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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">Key Results Area</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              What this role is accountable to deliver. Break each Key Result
              into action items.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() =>
              createKraMut.mutate({ title: "New Key Result", sortOrder: keyResults.length })
            }
            disabled={createKraMut.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Key Result
          </Button>
        </div>

        {keyResults.length === 0 && (tasksByKra.get("none") ?? []).length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No Key Results yet. Click <strong>Add Key Result</strong> to define
              what this seat owns.
            </CardContent>
          </Card>
        )}

        {keyResults.map((kr) => {
          const krTasks = tasksByKra.get(kr.id) ?? [];
          return (
            <KeyResultCard
              key={kr.id}
              kr={kr}
              tasks={krTasks}
              seatByName={seatByName}
              directReports={directReports}
              onRename={(title) =>
                updateKraMut.mutate({ id: kr.id, data: { title } })
              }
              onDelete={() => {
                const hasTasks = krTasks.length > 0;
                const msg = hasTasks
                  ? `Delete this Key Result? Its ${krTasks.length} action item(s) will be kept and moved to "Unfiled action items".`
                  : "Delete this Key Result?";
                if (confirm(msg)) deleteKraMut.mutate(kr.id);
              }}
              onAddTask={() => openAdd(kr.id)}
              onOpenTask={openEdit}
              onDeleteTask={(id) => deleteMut.mutate(id)}
              onToggleCompleted={(t, c) =>
                updateMut.mutate({
                  id: t.id,
                  data: { completed: c, status: c ? "done" : "todo" },
                })
              }
            />
          );
        })}

        {(() => {
          const unfiled = tasksByKra.get("none") ?? [];
          if (unfiled.length === 0) return null;
          return (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Unfiled action items
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 space-y-2">
                  {unfiled.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      assigneeSeat={
                        t.assignee
                          ? seatByName.get(t.assignee.trim()) ?? null
                          : null
                      }
                      onClick={() => openEdit(t)}
                      onDelete={() => deleteMut.mutate(t.id)}
                      onToggleCompleted={(c) =>
                        updateMut.mutate({
                          id: t.id,
                          data: {
                            completed: c,
                            status: c ? "done" : "todo",
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit action item" : "Add action item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Action item name *</Label>
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
                        <SmallAssigneeAvatar url={photoFor(s)} />
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
                  if (window.confirm("Delete this action item?")) {
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
  return (
    <div
      className="h-9 w-9 rounded-full bg-muted border shrink-0 flex items-center justify-center text-muted-foreground"
      title={fallbackName ?? undefined}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </svg>
    </div>
  );
}

function SmallAssigneeAvatar({
  url,
  showFallbackIcon = false,
}: {
  url: string | null;
  showFallbackIcon?: boolean;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-5 w-5 rounded-full object-cover bg-muted"
      />
    );
  }
  if (!showFallbackIcon) return null;
  return (
    <span className="h-5 w-5 rounded-full bg-muted border flex items-center justify-center text-muted-foreground">
      <User className="h-3 w-3" />
    </span>
  );
}

function TaskCard({
  task,
  assigneeSeat,
  onClick,
  onDelete,
  onToggleCompleted,
}: {
  task: Task;
  assigneeSeat: Seat | null;
  onClick: () => void;
  onDelete: () => void;
  onToggleCompleted: (completed: boolean) => void;
}) {
  const dueDateFmt = task.dueDate ? formatDueDate(task.dueDate) : null;
  const completed = task.completed || task.status === "done";
  const overdue = isOverdue(task.dueDate, completed);
  const ownerName = task.assignee?.trim() || "Unassigned";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className="group bg-background rounded-md border px-3 py-2 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center"
        >
          <Checkbox
            checked={completed}
            onCheckedChange={(v) => onToggleCompleted(Boolean(v))}
            aria-label="Mark action item complete"
          />
        </div>
        <PersonAvatar seat={assigneeSeat} fallbackName={task.assignee ?? null} />
        <span
          className={`text-xs text-muted-foreground truncate max-w-[140px] ${
            task.assignee ? "" : "italic"
          }`}
          title={ownerName}
        >
          {ownerName}
        </span>
        <div
          className={`flex-1 min-w-0 text-sm font-medium leading-snug truncate ${
            completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {task.title}
        </div>
        {dueDateFmt && (
          <span
            className={`text-[11px] inline-flex items-center gap-1 shrink-0 ${
              overdue
                ? "text-destructive font-medium"
                : "text-muted-foreground"
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
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <button
            onClick={onDelete}
            aria-label="Delete action item"
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

function KeyResultCard({
  kr,
  tasks,
  seatByName,
  onRename,
  onDelete,
  onAddTask,
  onOpenTask,
  onDeleteTask,
  onToggleCompleted,
}: {
  kr: KeyResult;
  tasks: Task[];
  seatByName: Map<string, Seat>;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddTask: () => void;
  onOpenTask: (t: Task) => void;
  onDeleteTask: (id: number) => void;
  onToggleCompleted: (t: Task, completed: boolean) => void;
}) {
  const done = tasks.filter((t) => t.completed || t.status === "done").length;
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                Key Result
              </span>
            </div>
            <div className="mt-1.5 text-base font-semibold leading-snug">
              <InlineEditableText
                value={kr.title}
                onSave={(next) => {
                  const t = next.trim();
                  if (t && t !== kr.title) onRename(t);
                }}
                placeholder="Name this Key Result…"
                ariaLabel="Edit Key Result title"
                required
              />
            </div>
          </div>
          <button
            onClick={onDelete}
            aria-label="Delete Key Result"
            className="text-muted-foreground hover:text-destructive shrink-0"
            title="Delete Key Result"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 rounded-md border bg-muted/40 hover:bg-muted px-3 py-2 text-sm transition-colors"
              aria-label={`${open ? "Hide" : "Show"} action items`}
            >
              <span className="inline-flex items-center gap-2">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
                />
                <span className="font-medium">
                  {tasks.length} action item{tasks.length === 1 ? "" : "s"}
                </span>
                {tasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    · {done}/{tasks.length} done
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {open ? "Hide" : "Show"}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="bg-muted/40 rounded-lg p-2 space-y-2">
              {tasks.length === 0 && (
                <div className="text-xs text-muted-foreground italic text-center py-4">
                  No action items yet for this Key Result.
                </div>
              )}
              {tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  assigneeSeat={
                    t.assignee
                      ? seatByName.get(t.assignee.trim()) ?? null
                      : null
                  }
                  onClick={() => onOpenTask(t)}
                  onDelete={() => onDeleteTask(t.id)}
                  onToggleCompleted={(c) => onToggleCompleted(t, c)}
                />
              ))}
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={onAddTask}>
                <Plus className="h-4 w-4 mr-1" /> Add action item
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function VendorPasswordsSection({ seatId }: { seatId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const queryKey = ["vendor-passwords", seatId];
  const listQuery = useQuery({
    queryKey,
    queryFn: () => vpList(seatId),
    enabled: open,
  });
  const entries = (listQuery.data ?? []) as VPRow[];

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

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
    mutationFn: (data: any) => vpCreate(seatId, data),
    onSuccess: invalidate,
    onError: errToast("Could not save vendor"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => vpUpdate(id, data),
    onSuccess: invalidate,
    onError: errToast("Could not update vendor"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => vpDelete(id),
    onSuccess: invalidate,
    onError: errToast("Could not delete vendor"),
  });

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<VPDraft>({
    vendorName: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  const submitNew = () => {
    if (!draft.vendorName.trim()) return;
    createMut.mutate(
      {
        vendorName: draft.vendorName.trim(),
        username: draft.username.trim() || null,
        password: draft.password || null,
        url: draft.url.trim() || null,
        notes: draft.notes.trim() || null,
      },
      {
        onSuccess: () => {
          setDraft({
            vendorName: "",
            username: "",
            password: "",
            url: "",
            notes: "",
          });
          setAdding(false);
        },
      },
    );
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg text-left"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Vendor Passwords</span>
                <span className="text-xs text-muted-foreground">
                  {open && entries.length > 0
                    ? `· ${entries.length}`
                    : ""}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3 border-t pt-3">
              {listQuery.isLoading && (
                <div className="text-xs text-muted-foreground italic py-2">
                  Loading…
                </div>
              )}
              {!listQuery.isLoading && entries.length === 0 && !adding && (
                <div className="text-xs text-muted-foreground italic py-2">
                  No vendor logins saved yet.
                </div>
              )}
              {entries.map((e) => (
                <VendorPasswordRow
                  key={e.id}
                  entry={e}
                  onSave={(data) => updateMut.mutate({ id: e.id, data })}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Delete vendor login for "${e.vendorName}"?`,
                      )
                    ) {
                      deleteMut.mutate(e.id);
                    }
                  }}
                />
              ))}

              {adding ? (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Vendor name *"
                      value={draft.vendorName}
                      onChange={(e) =>
                        setDraft({ ...draft, vendorName: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Website URL"
                      value={draft.url}
                      onChange={(e) =>
                        setDraft({ ...draft, url: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Username / email"
                      value={draft.username}
                      onChange={(e) =>
                        setDraft({ ...draft, username: e.target.value })
                      }
                    />
                    <Input
                      type="text"
                      placeholder="Password"
                      value={draft.password}
                      onChange={(e) =>
                        setDraft({ ...draft, password: e.target.value })
                      }
                    />
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft({ ...draft, notes: e.target.value })
                    }
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAdding(false);
                        setDraft({
                          vendorName: "",
                          username: "",
                          password: "",
                          url: "",
                          notes: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitNew}
                      disabled={!draft.vendorName.trim() || createMut.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setAdding(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add vendor login
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

type VPRow = {
  id: number;
  seatId: number;
  vendorName: string;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
};

type VPDraft = {
  vendorName: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

function VendorPasswordRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: VPRow;
  onSave: (data: Partial<VPRow>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState<VPDraft>({
    vendorName: entry.vendorName,
    username: entry.username ?? "",
    password: entry.password ?? "",
    url: entry.url ?? "",
    notes: entry.notes ?? "",
  });

  useEffect(() => {
    setDraft({
      vendorName: entry.vendorName,
      username: entry.username ?? "",
      password: entry.password ?? "",
      url: entry.url ?? "",
      notes: entry.notes ?? "",
    });
  }, [entry]);

  const copy = async (val: string | null, label: string) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
    } catch {}
  };

  if (editing) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <Input
            placeholder="Vendor name *"
            value={draft.vendorName}
            onChange={(e) => setDraft({ ...draft, vendorName: e.target.value })}
          />
          <Input
            placeholder="Website URL"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <Input
            placeholder="Username / email"
            value={draft.username}
            onChange={(e) => setDraft({ ...draft, username: e.target.value })}
          />
          <Input
            placeholder="Password"
            value={draft.password}
            onChange={(e) => setDraft({ ...draft, password: e.target.value })}
          />
        </div>
        <Input
          placeholder="Notes (optional)"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!draft.vendorName.trim()) return;
              onSave({
                vendorName: draft.vendorName.trim(),
                username: draft.username.trim() || null,
                password: draft.password || null,
                url: draft.url.trim() || null,
                notes: draft.notes.trim() || null,
              });
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  const masked = entry.password ? "•".repeat(Math.min(entry.password.length, 12)) : "";

  return (
    <div className="rounded-md border bg-card p-3 text-sm space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{entry.vendorName}</div>
          {entry.url && (
            <a
              href={
                entry.url.startsWith("http")
                  ? entry.url
                  : `https://${entry.url}`
              }
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-primary hover:underline break-all"
            >
              {entry.url}
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete vendor login"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {(entry.username || entry.password) && (
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
          {entry.username && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground w-16 shrink-0">
                Username
              </span>
              <span className="font-mono text-xs truncate">
                {entry.username}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 ml-auto shrink-0"
                onClick={() => copy(entry.username, "Username")}
                aria-label="Copy username"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {entry.password && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground w-16 shrink-0">
                Password
              </span>
              <span className="font-mono text-xs truncate">
                {show ? entry.password : masked}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 ml-auto shrink-0"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => copy(entry.password, "Password")}
                aria-label="Copy password"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {entry.notes && (
        <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
          {entry.notes}
        </div>
      )}
    </div>
  );
}

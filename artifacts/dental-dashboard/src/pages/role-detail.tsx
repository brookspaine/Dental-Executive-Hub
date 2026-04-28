import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Compass,
  Edit3,
  Eye,
  Save,
  X,
  Plus,
  Trash2,
  CheckSquare,
  AlertTriangle,
  AlertCircle,
  Calendar,
  ChevronDown,
  Info,
  ListChecks,
  Target,
  BookOpen,
  Sparkles,
  User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetRole,
  useUpdateRole,
  useDeleteRole,
  useListRoles,
  useListPlaybooks,
  useCreatePlaybook,
  useUpdatePlaybook,
  getGetRoleQueryKey,
  getListRolesQueryKey,
  getListPlaybooksQueryKey,
  listRoleKeyResults,
  createRoleKeyResult,
  updateRoleKeyResult,
  deleteRoleKeyResult,
  getListRoleKeyResultsQueryKey,
  listRoleTasks,
  createRoleTask,
  updateRoleTask,
  deleteRoleTask,
  getListRoleTasksQueryKey,
  listOrganizations,
  listOrgChartSeats,
  type Role,
  type Playbook,
  type RoleKeyResult,
  type RoleTask,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { resolvePhotoUrl } from "@/components/editable-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AREA_STYLES,
  BUSINESS_AREAS,
  TIERS,
  AUTHORITY_LEVELS,
  DECISION_CATEGORIES,
  areaStyle,
  type BusinessArea,
} from "@/lib/role-styles";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type Mode = "reference" | "daily" | "edit";

type ChecklistItem = Role["checklists"]["startOfDay"][number];
type DecisionRow = Role["decisions"][number];

type ChecklistPhase = "startOfDay" | "downtime" | "endOfDay";

const CHECKLIST_PHASES: { key: ChecklistPhase; label: string }[] = [
  { key: "startOfDay", label: "Start of Day" },
  { key: "downtime", label: "Downtime Protocol" },
  { key: "endOfDay", label: "End of Day" },
];

const SECTIONS = [
  { id: "purpose", label: "Purpose", icon: Sparkles },
  { id: "kra", label: "Key Results Area", icon: Target },
  { id: "daily-ops", label: "Daily Operations", icon: ListChecks },
  { id: "decisions", label: "Decisions to Own", icon: CheckSquare },
  { id: "playbooks", label: "Playbooks & Procedures", icon: BookOpen },
] as const;

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dailyChecksKey(roleId: number): string {
  return `role-${roleId}-checks-${todayKey()}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RoleDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: role, isLoading } = useGetRole(id, {
    query: { enabled: Number.isFinite(id) },
  });
  const { data: roles = [] } = useListRoles();
  const { data: playbooks = [] } = useListPlaybooks();

  const [mode, setMode] = useState<Mode>("reference");
  const [draft, setDraft] = useState<Role | null>(null);

  useEffect(() => {
    if (role) setDraft(role);
  }, [role]);

  const updateMutation = useUpdateRole({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetRoleQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListRolesQueryKey() });
        setMode("reference");
      },
    },
  });
  const deleteMutation = useDeleteRole({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRolesQueryKey() });
        setLocation("/my-roles");
      },
    },
  });

  if (isLoading) {
    return <div className="px-6 py-8 text-sm text-slate-500">Loading role…</div>;
  }
  if (!role || !draft) {
    return <div className="px-6 py-8 text-sm text-slate-500">Role not found.</div>;
  }

  const view = mode === "edit" ? draft : role;
  const style = areaStyle(view.businessArea);
  const linkedPlaybooks = playbooks.filter((p) => p.roleIds.includes(id));

  function patchDraft(partial: Partial<Role>) {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  }

  function save() {
    if (!draft) return;
    updateMutation.mutate({
      id,
      data: {
        title: draft.title,
        seatHolderName: draft.seatHolderName,
        seatHolderInitials: draft.seatHolderInitials,
        reportsToRoleId: draft.reportsToRoleId,
        businessArea: draft.businessArea,
        tier: draft.tier,
        purposeStatement: draft.purposeStatement,
        missionAlignment: draft.missionAlignment,
        culturalAlignment: draft.culturalAlignment,
        vegStyleImpact: draft.vegStyleImpact,
        keyResultsArea: draft.keyResultsArea,
        checklists: draft.checklists,
        decisions: draft.decisions,
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-6">
      <Link href="/my-roles">
        <span className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 hover:text-[#0F2A47]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizational Chart
        </span>
      </Link>

      {/* Header */}
      <div className={cn("mt-4 rounded-xl border p-5", style.ring, style.tint)}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Compass className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Role
              </span>
            </div>
            {mode === "edit" ? (
              <Input
                value={view.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
                className="h-auto border-slate-300 px-2 py-1 text-2xl font-semibold text-[#0F2A47]"
              />
            ) : (
              <h1 className="text-2xl font-semibold text-[#0F2A47]">{view.title}</h1>
            )}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-4">
              <MetaField
                label="Seat holder"
                editing={mode === "edit"}
                editor={
                  <Input
                    value={view.seatHolderName}
                    onChange={(e) =>
                      patchDraft({
                        seatHolderName: e.target.value,
                        seatHolderInitials:
                          e.target.value === "Open"
                            ? ""
                            : e.target.value
                                .split(/\s+/)
                                .map((s) => s[0])
                                .filter(Boolean)
                                .slice(0, 2)
                                .join("")
                                .toUpperCase(),
                      })
                    }
                    placeholder="Open"
                  />
                }
                value={
                  view.seatHolderName === "Open" ? (
                    <span className="text-amber-700">Open</span>
                  ) : (
                    view.seatHolderName
                  )
                }
              />
              <MetaField
                label="Reports to"
                editing={mode === "edit"}
                editor={
                  <Select
                    value={
                      view.reportsToRoleId === null ||
                      view.reportsToRoleId === undefined
                        ? "none"
                        : String(view.reportsToRoleId)
                    }
                    onValueChange={(v) =>
                      patchDraft({
                        reportsToRoleId: v === "none" ? null : parseInt(v, 10),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No one —</SelectItem>
                      {roles
                        .filter((r) => r.id !== id)
                        .map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                }
                value={
                  view.reportsToRoleId
                    ? roles.find((r) => r.id === view.reportsToRoleId)?.title ?? "—"
                    : "—"
                }
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ModeToggle mode={mode} setMode={setMode} hasDraftChanges={mode === "edit"} />
            {mode === "edit" ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft(role);
                    setMode("reference");
                  }}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={updateMutation.isPending}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete role
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this role?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the role and all of its KPIs, checklists,
                      and decisions. Linked playbooks remain in the library.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id })}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Body: content + right anchor nav */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0 space-y-6">
          <Section1Purpose view={view} mode={mode} patch={patchDraft} style={style} />
          <Section2Kra roleId={id} />
          <Section3DailyOps view={view} mode={mode} patch={patchDraft} roleId={id} />
          <Section4Decisions view={view} mode={mode} patch={patchDraft} />
          <Section5Playbooks
            roleId={id}
            roleTitle={view.title}
            playbooks={linkedPlaybooks}
            allPlaybooks={playbooks}
          />
        </div>
        <AnchorNav />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetaField({
  label,
  value,
  editor,
  editing,
}: {
  label: string;
  value: React.ReactNode;
  editor: React.ReactNode;
  editing: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5">{editing ? editor : value}</div>
    </div>
  );
}

function ModeToggle({
  mode,
  setMode,
  hasDraftChanges,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  hasDraftChanges: boolean;
}) {
  const items: { key: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "reference", label: "Reference", icon: Eye },
    { key: "daily", label: "Daily", icon: CheckSquare },
    { key: "edit", label: "Edit", icon: Edit3 },
  ];
  return (
    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
      {items.map((it) => {
        const active = mode === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => {
              if (hasDraftChanges && mode === "edit" && it.key !== "edit") {
                if (!window.confirm("Discard unsaved edits?")) return;
              }
              setMode(it.key);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors",
              active
                ? "bg-[#0F2A47] text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <it.icon className="h-3.5 w-3.5" />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionShell({
  id,
  title,
  icon: Icon,
  description,
  className,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 overflow-hidden rounded-xl border border-slate-200 bg-white",
        className,
      )}
    >
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <Icon className="h-4 w-4 text-[#D62828]" />
        <h2 className="text-sm font-semibold text-[#0F2A47]">{title}</h2>
        {description && (
          <span className="ml-2 text-xs text-slate-500">{description}</span>
        )}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

// ----- Section 1 -----

function Section1Purpose({
  view,
  mode,
  patch,
  style,
}: {
  view: Role;
  mode: Mode;
  patch: (p: Partial<Role>) => void;
  style: ReturnType<typeof areaStyle>;
}) {
  return (
    <section
      id="purpose"
      className={cn(
        "scroll-mt-20 overflow-hidden rounded-xl border",
        style.ring,
        style.softBg,
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center gap-2 border-b px-5 py-3 backdrop-blur",
          style.ring,
          "bg-white/85",
        )}
      >
        <Sparkles className="h-4 w-4 text-[#D62828]" />
        <h2 className="text-sm font-semibold text-[#0F2A47]">
          Purpose
        </h2>
      </header>
      <div className="space-y-5 px-5 py-5 text-[15px] leading-relaxed">
        <RichField
          label="Purpose statement"
          value={view.purposeStatement}
          mode={mode}
          rows={3}
          onChange={(v) => patch({ purposeStatement: v })}
        />
      </div>
    </section>
  );
}

function RichField({
  label,
  value,
  mode,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  mode: Mode;
  rows: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Label>
      {mode === "edit" ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
      ) : value ? (
        <p className="whitespace-pre-wrap text-slate-800">{value}</p>
      ) : (
        <p className="italic text-slate-400">Not yet captured.</p>
      )}
    </div>
  );
}

// ----- Section 2: Key Results Area -----
//
// Mirrors the rich "Key Results" pattern on Practice Org Chart seats: each
// Key Result is its own card with action items (assignee, due date, status)
// and a deadline-driven progress bar. Action items can also live "unfiled"
// when no Key Result is set.

type SeatLite = {
  id: number;
  organizationId: number;
  name?: string | null;
  photoUrl?: string | null;
};

const KRA_UNASSIGNED = "__unassigned__";

type KraTaskForm = {
  title: string;
  assignee: string;
  status: string;
  dueDate: string;
  keyResultId: number | null;
};

const EMPTY_KRA_TASK_FORM: KraTaskForm = {
  title: "",
  assignee: "",
  status: "todo",
  dueDate: "",
  keyResultId: null,
};

function formatKraDueDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isKraOverdue(d?: string | null, completed?: boolean): boolean {
  if (!d || completed) return false;
  const today = new Date(
    new Date().toISOString().slice(0, 10) + "T00:00:00",
  ).getTime();
  return new Date(d + "T00:00:00").getTime() < today;
}

function Section2Kra({ roleId }: { roleId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const errToast = (label: string) => (err: any) => {
    const msg = err?.response?.data?.error ?? err?.message ?? "Something went wrong";
    toast({
      title: label,
      description: typeof msg === "string" ? msg : "Something went wrong",
      variant: "destructive",
    });
  };

  // For the assignee dropdown: list everyone with a name across every
  // organization in the org chart, so any team member can be picked.
  const allOrgsQuery = useQuery({
    queryKey: ["organizations", "all-for-role-assignees"],
    queryFn: () => listOrganizations(),
  });
  const allOrgs =
    (allOrgsQuery.data as Array<{ id: number }> | undefined) ?? [];
  const allSeatsQuery = useQuery({
    queryKey: ["org-chart-seats", "all-for-role-assignees", allOrgs.map((o) => o.id).sort()],
    queryFn: async () => {
      const lists = await Promise.all(
        allOrgs.map((o) => listOrgChartSeats(o.id) as Promise<SeatLite[]>),
      );
      return lists.flat();
    },
    enabled: allOrgs.length > 0,
  });
  const everyoneSeats: SeatLite[] =
    (allSeatsQuery.data as SeatLite[] | undefined) ?? [];

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
  }, [everyoneSeats]);

  const seatByName = useMemo(() => {
    const m = new Map<string, SeatLite>();
    for (const s of everyoneSeats) {
      if (s.name && s.name.trim() && !m.has(s.name.trim())) {
        m.set(s.name.trim(), s);
      }
    }
    return m;
  }, [everyoneSeats]);

  const krasQuery = useQuery({
    queryKey: getListRoleKeyResultsQueryKey(roleId),
    queryFn: () => listRoleKeyResults(roleId),
    enabled: Number.isFinite(roleId),
  });
  const keyResults: RoleKeyResult[] =
    (krasQuery.data as RoleKeyResult[] | undefined) ?? [];

  const tasksQuery = useQuery({
    queryKey: getListRoleTasksQueryKey(roleId),
    queryFn: () => listRoleTasks(roleId),
    enabled: Number.isFinite(roleId),
  });
  const tasks: RoleTask[] = (tasksQuery.data as RoleTask[] | undefined) ?? [];

  const tasksByKra = useMemo(() => {
    const validKraIds = new Set(keyResults.map((k) => k.id));
    const m = new Map<number | "none", RoleTask[]>();
    for (const t of tasks) {
      // Bucket dangling/unknown keyResultIds under "none" so they render
      // in Unfiled rather than disappearing from the UI.
      const krId = t.keyResultId ?? null;
      const key =
        krId === null || !validKraIds.has(krId) ? "none" : (krId as number);
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [tasks, keyResults]);

  const isInitialLoading = krasQuery.isLoading || tasksQuery.isLoading;

  const invalidateKras = () =>
    qc.invalidateQueries({ queryKey: getListRoleKeyResultsQueryKey(roleId) });
  const invalidateTasks = () =>
    qc.invalidateQueries({ queryKey: getListRoleTasksQueryKey(roleId) });

  const createKraMut = useMutation({
    mutationFn: (data: any) => createRoleKeyResult(roleId, data),
    onSuccess: invalidateKras,
    onError: errToast("Could not add key result"),
  });
  const updateKraMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateRoleKeyResult(id, data),
    onSuccess: invalidateKras,
    onError: errToast("Could not save key result"),
  });
  const deleteKraMut = useMutation({
    mutationFn: (id: number) => deleteRoleKeyResult(id),
    onSuccess: () => {
      invalidateKras();
      invalidateTasks();
    },
    onError: errToast("Could not delete key result"),
  });

  const createTaskMut = useMutation({
    mutationFn: (data: any) => createRoleTask(roleId, data),
    onSuccess: invalidateTasks,
    onError: errToast("Could not add action item"),
  });
  const updateTaskMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateRoleTask(id, data),
    onSuccess: invalidateTasks,
    onError: errToast("Could not save action item"),
  });
  const deleteTaskMut = useMutation({
    mutationFn: (id: number) => deleteRoleTask(id),
    onSuccess: invalidateTasks,
    onError: errToast("Could not delete action item"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RoleTask | null>(null);
  const [form, setForm] = useState<KraTaskForm>(EMPTY_KRA_TASK_FORM);

  const openAdd = (keyResultId: number | null = null) => {
    setEditingTask(null);
    setForm({ ...EMPTY_KRA_TASK_FORM, keyResultId });
    setDialogOpen(true);
  };
  const openEdit = (t: RoleTask) => {
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
  const saveTask = () => {
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
      updateTaskMut.mutate(
        { id: editingTask.id, data: payload },
        { onSuccess: closeDialog },
      );
    } else {
      createTaskMut.mutate(payload, { onSuccess: closeDialog });
    }
  };

  return (
    <SectionShell id="kra" title="Key Results Area" icon={Target}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-[#0F2A47]">
              Key Results
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="About Key Results"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-xs bg-slate-700 text-white"
              >
                What winning looks like in this role and how you make an
                impact. Break each Key Result into action items.
              </TooltipContent>
            </Tooltip>
          </div>
          <Button
            size="sm"
            onClick={() =>
              createKraMut.mutate({
                title: "New Key Result",
                sortOrder: keyResults.length,
              })
            }
            disabled={createKraMut.isPending || isInitialLoading}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Key Result
          </Button>
        </div>

        {isInitialLoading && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Loading Key Results…
            </CardContent>
          </Card>
        )}

        {!isInitialLoading &&
          keyResults.length === 0 &&
          (tasksByKra.get("none") ?? []).length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No Key Results yet. Click <strong>Add Key Result</strong> to
                define what this seat owns.
              </CardContent>
            </Card>
          )}

        {keyResults.map((kr) => {
          const krTasks = tasksByKra.get(kr.id) ?? [];
          return (
            <RoleKeyResultCard
              key={kr.id}
              kr={kr}
              tasks={krTasks}
              seatByName={seatByName}
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
              onDeleteTask={(id) => deleteTaskMut.mutate(id)}
              onToggleCompleted={(t, c) =>
                updateTaskMut.mutate({
                  id: t.id,
                  data: { completed: c, status: c ? "done" : "todo" },
                })
              }
            />
          );
        })}

        {(() => {
          if (isInitialLoading) return null;
          const unfiled = tasksByKra.get("none") ?? [];
          // Always render the Unfiled card (with at least an "Add action item"
          // button) when there is at least one Key Result, so users can add
          // unfiled items even when none exist yet. Hide it only when there
          // are zero KRs and zero unfiled — in that case the empty-state card
          // above already prompts the user to add a Key Result first.
          if (unfiled.length === 0 && keyResults.length === 0) return null;
          return (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Unfiled action items
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAdd(null)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add action item
                  </Button>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 space-y-2">
                  {unfiled.length === 0 && (
                    <div className="text-xs text-muted-foreground italic text-center py-4">
                      No unfiled action items.
                    </div>
                  )}
                  {unfiled.map((t) => (
                    <RoleTaskCard
                      key={t.id}
                      task={t}
                      assigneeSeat={
                        t.assignee
                          ? seatByName.get(t.assignee.trim()) ?? null
                          : null
                      }
                      onClick={() => openEdit(t)}
                      onDelete={() => deleteTaskMut.mutate(t.id)}
                      onToggleCompleted={(c) =>
                        updateTaskMut.mutate({
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
            <DialogTitle>
              {editingTask ? "Edit action item" : "Add action item"}
            </DialogTitle>
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
                value={form.assignee.trim() ? form.assignee : KRA_UNASSIGNED}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    assignee: v === KRA_UNASSIGNED ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose someone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KRA_UNASSIGNED}>
                    — Unassigned —
                  </SelectItem>
                  {directReports.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                      No team members yet
                    </div>
                  )}
                  {directReports.map((s) => (
                    <SelectItem key={s.id} value={s.name as string}>
                      <span className="inline-flex items-center gap-2">
                        <SmallRoleAvatar url={resolvePhotoUrl(s)} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Key Result</Label>
              <Select
                value={form.keyResultId == null ? "none" : String(form.keyResultId)}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    keyResultId: v === "none" ? null : Number(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unfiled —</SelectItem>
                  {keyResults.map((kr) => (
                    <SelectItem key={kr.id} value={String(kr.id)}>
                      {kr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={saveTask} disabled={!form.title.trim()}>
              {editingTask ? "Save" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}

function SmallRoleAvatar({ url }: { url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-5 w-5 rounded-full object-cover bg-muted"
      />
    );
  }
  return (
    <span className="h-5 w-5 rounded-full bg-muted border flex items-center justify-center text-muted-foreground">
      <User className="h-3 w-3" />
    </span>
  );
}

function RoleTaskCard({
  task,
  assigneeSeat,
  onClick,
  onDelete,
  onToggleCompleted,
}: {
  task: RoleTask;
  assigneeSeat: SeatLite | null;
  onClick: () => void;
  onDelete: () => void;
  onToggleCompleted: (completed: boolean) => void;
}) {
  const dueDateFmt = task.dueDate ? formatKraDueDate(task.dueDate) : null;
  const completed = task.completed || task.status === "done";
  const overdue = isKraOverdue(task.dueDate, completed);
  const ownerName = task.assignee?.trim() || "Unassigned";
  const photo = assigneeSeat ? resolvePhotoUrl(assigneeSeat) : null;

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
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <Checkbox
            checked={completed}
            onCheckedChange={(v) => onToggleCompleted(Boolean(v))}
            aria-label="Mark action item complete"
          />
        </div>
        {photo && (
          <img
            src={photo}
            alt=""
            className="h-7 w-7 rounded-full object-cover bg-muted shrink-0"
          />
        )}
        <span
          className={`text-xs text-muted-foreground truncate max-w-[140px] ${task.assignee ? "" : "italic"}`}
          title={ownerName}
        >
          {ownerName}
        </span>
        <div
          className={`flex-1 min-w-0 text-sm font-medium leading-snug truncate ${completed ? "line-through text-muted-foreground" : ""}`}
        >
          {task.title}
        </div>
        {dueDateFmt && (
          <span
            className={`text-[11px] inline-flex items-center gap-1 shrink-0 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
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
  ariaLabel,
  className = "",
  required = false,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
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
      {isEmpty ? (
        <span className="italic text-muted-foreground">{placeholder}</span>
      ) : (
        value
      )}
    </button>
  );
}

function RoleKeyResultCard({
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
  kr: RoleKeyResult;
  tasks: RoleTask[];
  seatByName: Map<string, SeatLite>;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddTask: () => void;
  onOpenTask: (t: RoleTask) => void;
  onDeleteTask: (id: number) => void;
  onToggleCompleted: (t: RoleTask, completed: boolean) => void;
}) {
  const done = tasks.filter((t) => t.completed || t.status === "done").length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const today = new Date(
    new Date().toISOString().slice(0, 10) + "T00:00:00",
  ).getTime();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  let anyOverdue = false;
  let anyDueSoon = false;
  for (const t of tasks) {
    if (t.completed || t.status === "done") continue;
    if (!t.dueDate) continue;
    const dueMs = new Date(t.dueDate + "T00:00:00").getTime();
    if (dueMs < today) anyOverdue = true;
    else if (dueMs - today <= THREE_DAYS) anyDueSoon = true;
  }
  const allDone = total > 0 && done === total;

  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold leading-snug">
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
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="hidden sm:flex items-center gap-2"
              title={
                total === 0
                  ? "No action items yet"
                  : anyOverdue
                  ? "At least one action item is overdue"
                  : anyDueSoon
                  ? "An action item is due within 3 days"
                  : allDone
                  ? "All action items complete"
                  : "On track"
              }
              aria-label={`${done} of ${total} action items complete`}
            >
              <div className="h-2 w-28 bg-white border border-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-700 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                {done} of {total}
              </span>
            </div>
            <button
              onClick={onDelete}
              aria-label="Delete Key Result"
              className="text-muted-foreground hover:text-destructive"
              title="Delete Key Result"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="sm:hidden flex items-center gap-2"
          aria-label={`${done} of ${total} action items complete`}
        >
          <div className="h-2 flex-1 bg-white border border-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-700 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
            {done} of {total}
          </span>
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
                <RoleTaskCard
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

// ----- Section 3: Daily Operations -----

function Section3DailyOps({
  view,
  mode,
  patch,
  roleId,
}: {
  view: Role;
  mode: Mode;
  patch: (p: Partial<Role>) => void;
  roleId: number;
}) {
  // Daily Mode: persist checked items to localStorage, keyed by today's date
  // so the list naturally resets at midnight. We track the active day in state
  // and tick a 60s timer that rotates the key when the date changes.
  const [activeDay, setActiveDay] = useState<string>(() => todayKey());

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = todayKey();
      setActiveDay((prev) => (prev === now ? prev : now));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const [dailyChecks, setDailyChecks] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(dailyChecksKey(roleId));
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set();
    }
  });

  // When the day rotates (or the role changes), reload checks for the new key
  // and prune older `role-<roleId>-checks-<date>` entries to keep storage bounded.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = `role-${roleId}-checks-${activeDay}`;
      const raw = window.localStorage.getItem(key);
      setDailyChecks(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
      const prefix = `role-${roleId}-checks-`;
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix) && k !== key) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [activeDay, roleId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `role-${roleId}-checks-${activeDay}`,
        JSON.stringify(Array.from(dailyChecks)),
      );
    } catch {
      // best-effort persistence — ignore storage quota errors
    }
  }, [dailyChecks, roleId, activeDay]);

  function toggleCheck(id: string) {
    setDailyChecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SectionShell
      id="daily-ops"
      title="Daily Operations Protocol"
      icon={ListChecks}
      description={
        mode === "daily" ? "Tick items as you complete them. Resets at midnight." : undefined
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {CHECKLIST_PHASES.map((phase) => {
          const items = view.checklists[phase.key] ?? [];
          return (
            <ChecklistColumn
              key={phase.key}
              label={phase.label}
              items={items}
              mode={mode}
              checked={dailyChecks}
              onToggleCheck={toggleCheck}
              onChange={(next) =>
                patch({
                  checklists: {
                    ...view.checklists,
                    [phase.key]: next,
                  },
                })
              }
            />
          );
        })}
      </div>
    </SectionShell>
  );
}

function ChecklistColumn({
  label,
  items,
  mode,
  checked,
  onToggleCheck,
  onChange,
}: {
  label: string;
  items: ChecklistItem[];
  mode: Mode;
  checked: Set<string>;
  onToggleCheck: (id: string) => void;
  onChange: (next: ChecklistItem[]) => void;
}) {
  const editing = mode === "edit";
  const interactive = mode === "daily";

  return (
    <div className="flex flex-col rounded-md border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
        {label}
      </div>
      <div className="space-y-2 p-3">
        {items.length === 0 && !editing && (
          <p className="text-xs italic text-slate-400">No tasks yet.</p>
        )}
        {items.map((item, i) => {
          if (editing) {
            return (
              <div key={item.id} className="space-y-1.5 rounded border border-slate-200 p-2">
                <Textarea
                  value={item.task}
                  onChange={(e) => {
                    const next = items.slice();
                    next[i] = { ...item, task: e.target.value };
                    onChange(next);
                  }}
                  rows={2}
                  placeholder="Task description"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={item.estimatedMinutes}
                    onChange={(e) => {
                      const next = items.slice();
                      next[i] = {
                        ...item,
                        estimatedMinutes: parseInt(e.target.value || "0", 10),
                      };
                      onChange(next);
                    }}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-500">min</span>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          }
          const isDone = checked.has(item.id);
          return (
            <label
              key={item.id}
              className={cn(
                "flex items-start gap-2 rounded p-1.5 text-sm",
                interactive && "cursor-pointer hover:bg-slate-50",
                interactive && isDone && "bg-emerald-50/40 text-slate-400 line-through",
              )}
            >
              {interactive ? (
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => onToggleCheck(item.id)}
                  className="mt-0.5"
                />
              ) : (
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block">{item.task}</span>
                {item.estimatedMinutes > 0 && (
                  <span className="text-[11px] text-slate-500">
                    ~{item.estimatedMinutes} min
                  </span>
                )}
              </span>
            </label>
          );
        })}
        {editing && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() =>
              onChange([
                ...items,
                { id: newId(), task: "", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        )}
      </div>
    </div>
  );
}

// ----- Section 4: Decisions -----

function Section4Decisions({
  view,
  mode,
  patch,
}: {
  view: Role;
  mode: Mode;
  patch: (p: Partial<Role>) => void;
}) {
  const editing = mode === "edit";
  const grouped = useMemo(() => {
    const m: Record<string, DecisionRow[]> = {};
    for (const d of view.decisions) {
      const key = (DECISION_CATEGORIES as readonly string[]).includes(d.category)
        ? d.category
        : "Operational";
      m[key] = m[key] ?? [];
      m[key].push(d);
    }
    return m;
  }, [view.decisions]);

  return (
    <SectionShell
      id="decisions"
      title="Decisions to Own"
      icon={CheckSquare}
      description="What this role can decide alone, and where it must escalate."
    >
      {editing ? (
        <DecisionEditor decisions={view.decisions} onChange={(d) => patch({ decisions: d })} />
      ) : view.decisions.length === 0 ? (
        <p className="text-sm italic text-slate-400">No decisions captured yet.</p>
      ) : (
        <div className="space-y-5">
          {DECISION_CATEGORIES.map((cat) => {
            const rows = grouped[cat] ?? [];
            if (rows.length === 0) return null;
            return (
              <div key={cat}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {cat}
                </div>
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Decision</TableHead>
                        <TableHead className="min-w-[140px]">Authority</TableHead>
                        <TableHead className="min-w-[240px]">Boundary conditions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium text-slate-800">
                            {d.decisionType}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                                authorityClass(d.authorityLevel),
                              )}
                            >
                              {d.authorityLevel}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700">
                            {d.boundaryConditions || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

function authorityClass(level: string): string {
  switch (level) {
    case "Decide & Act":
      return "bg-emerald-100 text-emerald-800";
    case "Decide & Inform":
      return "bg-sky-100 text-sky-800";
    case "Recommend Only":
      return "bg-amber-100 text-amber-800";
    case "Escalate":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function DecisionEditor({
  decisions,
  onChange,
}: {
  decisions: DecisionRow[];
  onChange: (d: DecisionRow[]) => void;
}) {
  return (
    <div className="space-y-3">
      {decisions.map((d, i) => (
        <div key={d.id} className="rounded-md border border-slate-200 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Decision type</Label>
              <Input
                value={d.decisionType}
                onChange={(e) => {
                  const next = decisions.slice();
                  next[i] = { ...d, decisionType: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Authority level</Label>
              <Select
                value={d.authorityLevel}
                onValueChange={(v) => {
                  const next = decisions.slice();
                  next[i] = { ...d, authorityLevel: v as DecisionRow["authorityLevel"] };
                  onChange(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTHORITY_LEVELS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={d.category}
                onValueChange={(v) => {
                  const next = decisions.slice();
                  next[i] = { ...d, category: v as DecisionRow["category"] };
                  onChange(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Boundary conditions</Label>
              <Textarea
                rows={2}
                value={d.boundaryConditions}
                onChange={(e) => {
                  const next = decisions.slice();
                  next[i] = { ...d, boundaryConditions: e.target.value };
                  onChange(next);
                }}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-rose-600"
              onClick={() => onChange(decisions.filter((x) => x.id !== d.id))}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          onChange([
            ...decisions,
            {
              id: newId(),
              decisionType: "",
              authorityLevel: "Decide & Act",
              escalationToRoleId: null,
              boundaryConditions: "",
              linkedPlaybookId: null,
              category: "Operational",
            },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" /> Add decision
      </Button>
    </div>
  );
}

// ----- Section 5: Playbooks linked to this role -----

function Section5Playbooks({
  roleId,
  roleTitle,
  playbooks,
  allPlaybooks,
}: {
  roleId: number;
  roleTitle: string;
  playbooks: Playbook[];
  allPlaybooks: Playbook[];
}) {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [, setLocation] = useLocation();
  const create = useCreatePlaybook({
    mutation: {
      onSuccess: (pb) => {
        qc.invalidateQueries({ queryKey: getListPlaybooksQueryKey() });
        setNewOpen(false);
        setNewTitle("");
        setLocation(`/playbook-library/${pb.id}`);
      },
    },
  });
  const update = useUpdatePlaybook({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPlaybooksQueryKey() });
      },
    },
  });

  const linkable = useMemo(
    () => allPlaybooks.filter((p) => !p.roleIds.includes(roleId)),
    [allPlaybooks, roleId],
  );

  return (
    <SectionShell
      id="playbooks"
      title="Playbooks & Procedures"
      icon={BookOpen}
      description="Living how-to documents this seat owns or follows."
    >
      <div className="space-y-4">
        {playbooks.length === 0 ? (
          <p className="text-sm italic text-slate-400">
            No playbooks linked to this role yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playbooks.map((pb) => (
              <Link key={pb.id} href={`/playbook-library/${pb.id}`}>
                <div className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-md">
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-[#0F2A47]">
                    {pb.title}
                  </div>
                  {pb.purpose && (
                    <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {pb.purpose}
                    </div>
                  )}
                  <div className="mt-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {pb.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setNewOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> New playbook
          </Button>
          {linkable.length > 0 && (
            <Select
              onValueChange={(v) => {
                const id = parseInt(v, 10);
                const pb = allPlaybooks.find((p) => p.id === id);
                if (!pb) return;
                update.mutate({
                  id,
                  data: { roleIds: [...pb.roleIds, roleId] },
                });
              }}
            >
              <SelectTrigger className="h-8 w-[240px] text-xs">
                <SelectValue placeholder="Link an existing playbook…" />
              </SelectTrigger>
              <SelectContent>
                {linkable.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <AlertDialog open={newOpen} onOpenChange={setNewOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>New playbook for {roleTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                Give it a clear title — you can fill in steps and the rest on
                the next page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. How to handle a hot tooth"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!newTitle.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    data: { title: newTitle.trim(), roleIds: [roleId] },
                  })
                }
              >
                Create
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SectionShell>
  );
}

// ----- Right-side anchor nav -----

function AnchorNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const cb: IntersectionObserverCallback = (entries) => {
      // Pick the topmost intersecting section
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setActive(visible[0].target.id);
    };
    observerRef.current = new IntersectionObserver(cb, {
      rootMargin: "-80px 0px -60% 0px",
      threshold: 0,
    });
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observerRef.current.observe(el);
    }
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 space-y-1 rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          On this page
        </div>
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
              active === s.id
                ? "bg-slate-100 font-semibold text-[#0F2A47]"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <s.icon className="h-3.5 w-3.5" />
            <span className="truncate">{s.label}</span>
          </a>
        ))}
      </div>
    </aside>
  );
}

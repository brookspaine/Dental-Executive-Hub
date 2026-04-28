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
  ListChecks,
  Target,
  BookOpen,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
  type Role,
  type Playbook,
} from "@workspace/api-client-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  KPI_FREQUENCIES,
  areaStyle,
  type BusinessArea,
} from "@/lib/role-styles";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type Mode = "reference" | "daily" | "edit";

type Kpi = Role["kpisLeading"][number];
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
  { id: "kpis", label: "What Success Looks Like", icon: Target },
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
        impactStatement: draft.impactStatement,
        kpisLeading: draft.kpisLeading,
        kpisLagging: draft.kpisLagging,
        checklists: draft.checklists,
        decisions: draft.decisions,
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-6">
      <Link href="/my-roles">
        <span className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 hover:text-[#0F2A47]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Role
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
          <Section2Kpis view={view} mode={mode} patch={patchDraft} />
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

// ----- Section 2: KPIs -----

function Section2Kpis({
  view,
  mode,
  patch,
}: {
  view: Role;
  mode: Mode;
  patch: (p: Partial<Role>) => void;
}) {
  return (
    <SectionShell
      id="kpis"
      title="What Success Looks Like"
      icon={Target}
    >
      <div className="space-y-5">
        <RichField
          label='"How I make an impact" statement'
          value={view.impactStatement}
          mode={mode}
          rows={3}
          onChange={(v) => patch({ impactStatement: v })}
        />
        <Tabs defaultValue="leading">
          <TabsList>
            <TabsTrigger value="leading">Leading indicators</TabsTrigger>
            <TabsTrigger value="lagging">Lagging indicators</TabsTrigger>
          </TabsList>
          <TabsContent value="leading">
            <KpiTable
              kpis={view.kpisLeading}
              mode={mode}
              onChange={(kpis) => patch({ kpisLeading: kpis })}
            />
          </TabsContent>
          <TabsContent value="lagging">
            <KpiTable
              kpis={view.kpisLagging}
              mode={mode}
              onChange={(kpis) => patch({ kpisLagging: kpis })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SectionShell>
  );
}

function KpiTable({
  kpis,
  mode,
  onChange,
}: {
  kpis: Kpi[];
  mode: Mode;
  onChange: (kpis: Kpi[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const editing = mode === "edit";

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = kpis.findIndex((k) => k.id === active.id);
    const newIndex = kpis.findIndex((k) => k.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(kpis, oldIndex, newIndex));
  }

  if (kpis.length === 0 && !editing) {
    return <p className="mt-3 text-sm italic text-slate-400">No KPIs captured yet.</p>;
  }

  const ids = kpis.map((k) => k.id);

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
              <TableRow>
                {editing && <TableHead className="w-8" />}
                <TableHead className="min-w-[180px]">KPI</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="min-w-[100px]">Target</TableHead>
                {editing && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((k, i) => (
                <KpiRow
                  key={k.id}
                  kpi={k}
                  editing={editing}
                  onChange={(next) => {
                    const arr = kpis.slice();
                    arr[i] = next;
                    onChange(arr);
                  }}
                  onDelete={() => onChange(kpis.filter((x) => x.id !== k.id))}
                />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
      {editing && (
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              onChange([
                ...kpis,
                {
                  id: newId(),
                  name: "",
                  description: "",
                  target: "",
                  frequency: "Daily",
                  dataSource: "",
                  owner: "",
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add KPI
          </Button>
        </div>
      )}
    </div>
  );
}

function KpiRow({
  kpi,
  editing,
  onChange,
  onDelete,
}: {
  kpi: Kpi;
  editing: boolean;
  onChange: (k: Kpi) => void;
  onDelete: () => void;
}) {
  const sortable = useSortable({ id: kpi.id, disabled: !editing });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  if (!editing) {
    return (
      <TableRow ref={sortable.setNodeRef as any} style={style}>
        <TableCell className="font-medium text-slate-800">{kpi.name || "—"}</TableCell>
        <TableCell className="text-sm text-slate-700">{kpi.description || "—"}</TableCell>
        <TableCell className="font-mono text-sm">{kpi.target || "—"}</TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow ref={sortable.setNodeRef as any} style={style}>
      <TableCell className="w-8 align-middle">
        <button
          type="button"
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab text-slate-400 hover:text-slate-700 active:cursor-grabbing"
          aria-label="Reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <Input value={kpi.name} onChange={(e) => onChange({ ...kpi, name: e.target.value })} />
      </TableCell>
      <TableCell>
        <Textarea
          value={kpi.description}
          onChange={(e) => onChange({ ...kpi, description: e.target.value })}
          rows={1}
        />
      </TableCell>
      <TableCell>
        <Input value={kpi.target} onChange={(e) => onChange({ ...kpi, target: e.target.value })} />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-rose-600"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
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

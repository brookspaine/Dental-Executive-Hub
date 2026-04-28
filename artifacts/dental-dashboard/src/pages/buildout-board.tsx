import { useMemo, useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter as FilterIcon,
  X,
  CalendarDays,
  Link2,
  CheckCircle2,
  ListChecks,
  ArrowLeft,
  Trash2,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import {
  useListBuildoutCards,
  useCreateBuildoutCard,
  useUpdateBuildoutCard,
  useDeleteBuildoutCard,
  useAddBuildoutCardActivity,
  getListBuildoutCardsQueryKey,
  type BuildoutCard,
} from "@workspace/api-client-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "backlog", label: "Backlog", wip: null as number | null },
  { id: "ready", label: "Ready", wip: null },
  { id: "in_progress", label: "In Progress", wip: 5 },
  { id: "waiting_on", label: "Waiting On", wip: null },
  { id: "review", label: "Review", wip: 3 },
  { id: "done", label: "Done", wip: null },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const CATEGORIES = [
  "Lease & Legal",
  "Permitting & DNR",
  "Design & Construction",
  "Signage",
  "Equipment & IT",
  "Vendor Contracts",
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<
  Category,
  { tag: string; dot: string; soft: string }
> = {
  "Lease & Legal": {
    tag: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
    soft: "bg-indigo-50",
  },
  "Permitting & DNR": {
    tag: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    soft: "bg-amber-50",
  },
  "Design & Construction": {
    tag: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50",
  },
  Signage: {
    tag: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    soft: "bg-rose-50",
  },
  "Equipment & IT": {
    tag: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
    soft: "bg-cyan-50",
  },
  "Vendor Contracts": {
    tag: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    soft: "bg-violet-50",
  },
};

const TEAM_MEMBERS = [
  "Brooks Paine",
  "Adam Webb",
  "Mariah Paine",
  "Averill Hayes",
  "Gordon Choi",
] as const;

const OWNER_BADGES: Record<string, string> = {
  "Brooks Paine": "bg-[#0F2A47] text-white",
  "Adam Webb": "bg-[#D62828] text-white",
  "Mariah Paine": "bg-emerald-700 text-white",
  "Averill Hayes": "bg-amber-600 text-white",
  "Gordon Choi": "bg-violet-700 text-white",
};

function ownerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function ownerBadgeClass(name: string): string {
  return OWNER_BADGES[name] ?? "bg-slate-700 text-white";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(todayStr() + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

const CATEGORY_FIELD_DEFS: Record<Category, FieldDef[]> = {
  "Lease & Legal": [
    { key: "counterpartyAndCounsel", label: "Counterparty & Counsel", type: "text" },
    { key: "documentReference", label: "Document Reference", type: "text" },
    { key: "positionAsk", label: "Position / Ask", type: "textarea" },
    { key: "fallbackPosition", label: "Fallback Position", type: "textarea" },
    {
      key: "adamWebbReviewStatus",
      label: "Adam Webb Review Status",
      type: "select",
      options: ["Not Sent", "In Review", "Returned", "Approved"],
    },
  ],
  "Permitting & DNR": [
    { key: "permitTypeAndAuthority", label: "Permit Type & Issuing Authority", type: "text" },
    {
      key: "applicationStatus",
      label: "Application Status",
      type: "select",
      options: ["Pre-Submittal", "Submitted", "Under Review", "Approved", "Denied"],
    },
    { key: "submissionDate", label: "Submission Date", type: "date" },
    { key: "expectedDecisionDate", label: "Expected Decision Date", type: "date" },
    { key: "contingencyImpact", label: "Contingency Impact", type: "boolean" },
  ],
  "Design & Construction": [
    {
      key: "phase",
      label: "Phase",
      type: "select",
      options: ["Programming", "SD", "DD", "CD", "Permit", "Construction", "Punch", "TCO"],
    },
    { key: "gcArchitectOwner", label: "GC / Architect Owner", type: "text" },
    {
      key: "budgetLine",
      label: "Budget Line",
      type: "select",
      options: ["TI Allowance", "Out-of-Pocket"],
    },
    { key: "tiAllowanceImpact", label: "TI Allowance Impact ($)", type: "number" },
    { key: "longLeadItem", label: "Long-Lead Item", type: "boolean" },
  ],
  Signage: [
    {
      key: "signType",
      label: "Sign Type",
      type: "select",
      options: ["Building-Mounted", "Pylon", "Window", "Wayfinding", "Interior"],
    },
    { key: "vendorAndProposal", label: "Vendor & Proposal #", type: "text" },
    { key: "permitStatus", label: "Permit Status", type: "text" },
    {
      key: "landlordApprovalStatus",
      label: "Landlord Approval Status",
      type: "select",
      options: ["Submitted", "Approved", "Conditional", "Denied"],
    },
    { key: "manufactureLeadTime", label: "Manufacture Lead Time", type: "text" },
  ],
  "Equipment & IT": [
    {
      key: "equipmentCategory",
      label: "Equipment Category",
      type: "select",
      options: ["Operatory", "Sterilization", "Imaging", "IT-Network", "Software", "Office"],
    },
    { key: "vendorAndQuote", label: "Vendor & Quote #", type: "text" },
    { key: "leadTime", label: "Lead Time", type: "text" },
    { key: "installDependency", label: "Install Dependency", type: "text" },
    {
      key: "poStatus",
      label: "PO Status",
      type: "select",
      options: ["Quoted", "Approved", "PO Issued", "Shipped", "Delivered", "Installed"],
    },
  ],
  "Vendor Contracts": [
    {
      key: "vendorType",
      label: "Vendor Type",
      type: "select",
      options: [
        "Insurance",
        "Payroll",
        "EHR-PMS",
        "Linen",
        "Waste",
        "Cleaning",
        "Marketing",
        "Legal",
        "Accounting",
        "Other",
      ],
    },
    { key: "contractTermAndAutoRenewal", label: "Contract Term & Auto-Renewal Risk", type: "text" },
    { key: "terminationRights", label: "Termination Rights", type: "text" },
    { key: "adamWebbReviewRequired", label: "Adam Webb Review Required", type: "boolean" },
    {
      key: "counterpartyEntity",
      label: "Counterparty Entity",
      type: "select",
      options: ["Greyrock Dental Partners LLC", "Brooks Paine PLLC 2"],
    },
  ],
};

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "boolean" | "select";
  options?: readonly string[];
};

function isCategory(c: string): c is Category {
  return (CATEGORIES as readonly string[]).includes(c);
}

function getCategoryDefs(c: string): FieldDef[] {
  return isCategory(c) ? CATEGORY_FIELD_DEFS[c] : [];
}

// ---------------------------------------------------------------------------
// Card component (used inside columns and as drag overlay)
// ---------------------------------------------------------------------------

function CardChip({
  card,
  onClick,
  isOverlay = false,
}: {
  card: BuildoutCard;
  onClick?: () => void;
  isOverlay?: boolean;
}) {
  const target = card.targetDoneDate ?? null;
  const daysLeft = daysFromToday(target);
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  const cat = card.category as Category;
  const catStyle = isCategory(cat) ? CATEGORY_STYLES[cat] : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group bg-white rounded-md border shadow-sm hover:shadow-md transition-all cursor-pointer text-left",
        "px-3 py-2.5",
        isOverdue
          ? "border-red-400 ring-1 ring-red-200"
          : isSoon
          ? "border-amber-400 ring-1 ring-amber-100"
          : "border-slate-200",
        isOverlay && "shadow-lg rotate-1",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-slate-900 leading-snug line-clamp-3">
            {card.title}
          </div>
          {catStyle && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  catStyle.tag,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", catStyle.dot)} />
                {card.category}
              </span>
              {target && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                    isOverdue
                      ? "bg-red-100 text-red-700"
                      : isSoon
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <CalendarDays className="h-3 w-3" />
                  {target}
                </span>
              )}
              {card.blocker && card.blocker.trim().length > 0 && (
                <span
                  title="Has a blocker"
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Blocked
                </span>
              )}
            </div>
          )}
        </div>
        <span
          title={card.ownerName}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
            ownerBadgeClass(card.ownerName),
          )}
        >
          {ownerInitials(card.ownerName)}
        </span>
      </div>
    </div>
  );
}

function DraggableCard({
  card,
  onClick,
}: {
  card: BuildoutCard;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(card.id),
    data: { card },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <CardChip card={card} onClick={onClick} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

function Column({
  column,
  cards,
  onCardClick,
  onAddCard,
}: {
  column: (typeof COLUMNS)[number];
  cards: BuildoutCard[];
  onCardClick: (c: BuildoutCard) => void;
  onAddCard: (status: ColumnId) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const overWip = column.wip !== null && cards.length > column.wip;
  const atWip = column.wip !== null && cards.length === column.wip;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-slate-100/70 rounded-lg border border-slate-200 min-h-[200px] w-72 shrink-0",
        isOver && "ring-2 ring-[#0F2A47]/40 bg-slate-100",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-slate-200",
          overWip
            ? "bg-red-50 text-red-700 rounded-t-lg"
            : "text-slate-700",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "text-[11px] uppercase tracking-wide font-semibold truncate",
              overWip ? "text-red-700" : "text-slate-700",
            )}
          >
            {column.label}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              overWip
                ? "bg-red-200 text-red-800"
                : atWip
                ? "bg-amber-200 text-amber-800"
                : "bg-slate-200 text-slate-700",
            )}
          >
            {cards.length}
            {column.wip !== null ? ` / ${column.wip}` : ""}
          </span>
        </div>
        <button
          onClick={() => onAddCard(column.id)}
          className="text-slate-500 hover:text-slate-900 p-0.5 rounded hover:bg-slate-200"
          title="New card"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} onClick={() => onCardClick(c)} />
        ))}
        {cards.length === 0 && (
          <div className="text-center text-[11px] text-slate-400 py-6">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail / Edit modal
// ---------------------------------------------------------------------------

type DraftCard = {
  title: string;
  ownerName: string;
  category: string;
  status: ColumnId;
  kraLink: string;
  targetDoneDate: string;
  definitionOfDone: string;
  blocker: string;
  escalationTrigger: string;
  categoryFields: Record<string, unknown>;
};

function blankDraft(status: ColumnId): DraftCard {
  return {
    title: "",
    ownerName: "Brooks Paine",
    category: "Lease & Legal",
    status,
    kraLink: "",
    targetDoneDate: "",
    definitionOfDone: "",
    blocker: "",
    escalationTrigger: "",
    categoryFields: {},
  };
}

function fromCard(card: BuildoutCard): DraftCard {
  return {
    title: card.title,
    ownerName: card.ownerName,
    category: card.category,
    status: card.status as ColumnId,
    kraLink: card.kraLink ?? "",
    targetDoneDate: card.targetDoneDate ?? "",
    definitionOfDone: card.definitionOfDone,
    blocker: card.blocker ?? "",
    escalationTrigger: card.escalationTrigger ?? "",
    categoryFields:
      (card.categoryFields as Record<string, unknown> | null | undefined) ?? {},
  };
}

function CategoryFieldInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (def.type === "text") {
    return (
      <Input
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (def.type === "textarea") {
    return (
      <Textarea
        rows={2}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (def.type === "date") {
    return (
      <Input
        type="date"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (def.type === "number") {
    return (
      <Input
        type="number"
        value={(value as number | string) ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    );
  }
  if (def.type === "boolean") {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={(v) => onChange(v)}
      />
    );
  }
  if (def.type === "select") {
    return (
      <Select
        value={(value as string) ?? ""}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {def.options?.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return null;
}

function CardModal({
  open,
  onOpenChange,
  initialDraft,
  existingCard,
  onSave,
  onDelete,
  onAddActivity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialDraft: DraftCard;
  existingCard: BuildoutCard | null;
  onSave: (draft: DraftCard) => Promise<void>;
  onDelete: (() => Promise<void>) | null;
  onAddActivity: ((text: string) => Promise<void>) | null;
}) {
  const [draft, setDraft] = useState<DraftCard>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [activityText, setActivityText] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(initialDraft);
      setActivityText("");
    }
  }, [open, initialDraft]);

  const catDefs = getCategoryDefs(draft.category);
  const valid =
    draft.title.trim().length > 0 &&
    draft.ownerName.trim().length > 0 &&
    draft.category.trim().length > 0 &&
    draft.definitionOfDone.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {existingCard ? "Edit Card" : "New Card"}
          </DialogTitle>
          <DialogDescription>
            {existingCard
              ? "Update fields, log activity, or move between columns."
              : "Add a new card to the EDGE Buildout Board."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-4">
            {/* Universal */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="What needs to happen?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Owner *</Label>
                <Select
                  value={draft.ownerName}
                  onValueChange={(v) => setDraft({ ...draft, ownerName: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_MEMBERS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category *</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) =>
                    setDraft({ ...draft, category: v, categoryFields: {} })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Column</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) =>
                    setDraft({ ...draft, status: v as ColumnId })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Done Date</Label>
                <Input
                  type="date"
                  value={draft.targetDoneDate}
                  onChange={(e) =>
                    setDraft({ ...draft, targetDoneDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>KRA / Rock Link</Label>
              <Input
                value={draft.kraLink}
                onChange={(e) => setDraft({ ...draft, kraLink: e.target.value })}
                placeholder="(optional)"
              />
            </div>

            <div>
              <Label>Definition of Done *</Label>
              <Textarea
                rows={2}
                value={draft.definitionOfDone}
                onChange={(e) =>
                  setDraft({ ...draft, definitionOfDone: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Blocker / Dependency</Label>
                <Textarea
                  rows={2}
                  value={draft.blocker}
                  onChange={(e) =>
                    setDraft({ ...draft, blocker: e.target.value })
                  }
                  placeholder="(optional)"
                />
              </div>
              <div>
                <Label>Escalation Trigger</Label>
                <Textarea
                  rows={2}
                  value={draft.escalationTrigger}
                  onChange={(e) =>
                    setDraft({ ...draft, escalationTrigger: e.target.value })
                  }
                  placeholder="Date or condition that escalates this card"
                />
              </div>
            </div>

            {/* Category-specific */}
            {catDefs.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-600 mb-2">
                  {draft.category} fields
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {catDefs.map((def) => (
                    <div
                      key={def.key}
                      className={cn(
                        def.type === "textarea" && "col-span-2",
                      )}
                    >
                      <Label>{def.label}</Label>
                      <CategoryFieldInput
                        def={def}
                        value={draft.categoryFields[def.key]}
                        onChange={(v) =>
                          setDraft({
                            ...draft,
                            categoryFields: {
                              ...draft.categoryFields,
                              [def.key]: v,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity log */}
            {existingCard && onAddActivity && (
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Activity Log
                </div>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {(existingCard.activityLog ?? [])
                    .slice()
                    .reverse()
                    .map((entry, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-700 border-l-2 border-slate-200 pl-2"
                      >
                        <div className="text-[10px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div>{entry.text}</div>
                      </div>
                    ))}
                  {(existingCard.activityLog ?? []).length === 0 && (
                    <div className="text-xs text-slate-400 italic">
                      No activity yet.
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                    placeholder="Add a note…"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!activityText.trim()}
                    onClick={async () => {
                      const t = activityText.trim();
                      if (!t) return;
                      await onAddActivity(t);
                      setActivityText("");
                    }}
                  >
                    Log
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div>
            {existingCard && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm("Delete this card?")) return;
                  await onDelete();
                  onOpenChange(false);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!valid || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave(draft);
                  onOpenChange(false);
                } finally {
                  setSaving(false);
                }
              }}
              className="bg-[#0F2A47] hover:bg-[#0F2A47]/90"
            >
              {existingCard ? "Save Changes" : "Create Card"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Weekly Review view
// ---------------------------------------------------------------------------

function classifyForReview(card: BuildoutCard): string[] {
  const reasons: string[] = [];
  if (card.status === "waiting_on") {
    const since = daysSince(card.waitingSince);
    if (since !== null && since >= 14) {
      reasons.push(`Waiting On for ${since} days`);
    }
  }
  const left = daysFromToday(card.targetDoneDate);
  if (left !== null) {
    if (left < 0) reasons.push(`${Math.abs(left)} days past target`);
    else if (left <= 7) reasons.push(`Due in ${left} day${left === 1 ? "" : "s"}`);
  }
  if (card.blocker && card.blocker.trim().length > 0) {
    reasons.push("Has blocker");
  }
  return reasons;
}

function WeeklyReviewView({
  cards,
  onCardClick,
  onBack,
}: {
  cards: BuildoutCard[];
  onCardClick: (c: BuildoutCard) => void;
  onBack: () => void;
}) {
  const flagged = useMemo(
    () =>
      cards
        .map((c) => ({ card: c, reasons: classifyForReview(c) }))
        .filter((x) => x.reasons.length > 0),
    [cards],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Board
        </Button>
        <div className="text-sm text-slate-600">
          {flagged.length} card{flagged.length === 1 ? "" : "s"} need review
        </div>
      </div>

      {flagged.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
          <div className="text-slate-700 font-medium">All clear</div>
          <div className="text-sm text-slate-500">
            Nothing is overdue, blocked, or stalled this week.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {flagged.map(({ card, reasons }) => (
            <button
              key={card.id}
              onClick={() => onCardClick(card)}
              className="w-full text-left bg-white border border-slate-200 rounded-md px-4 py-3 hover:shadow-md transition-shadow flex items-start gap-3"
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  ownerBadgeClass(card.ownerName),
                )}
              >
                {ownerInitials(card.ownerName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 text-sm">
                  {card.title}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {card.category} · {card.ownerName} ·{" "}
                  {COLUMNS.find((col) => col.id === card.status)?.label ??
                    card.status}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {reasons.map((r, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        r.includes("past")
                          ? "bg-red-100 text-red-700"
                          : r.includes("blocker")
                          ? "bg-red-50 text-red-700"
                          : r.includes("Waiting")
                          ? "bg-amber-100 text-amber-800"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      <ShieldAlert className="h-2.5 w-2.5 inline mr-0.5 -mt-0.5" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function BuildoutBoard() {
  const queryClient = useQueryClient();
  const queryKey = getListBuildoutCardsQueryKey();
  const { data: cards = [], isLoading } = useListBuildoutCards();

  const createMutation = useCreateBuildoutCard();
  const updateMutation = useUpdateBuildoutCard();
  const deleteMutation = useDeleteBuildoutCard();
  const activityMutation = useAddBuildoutCardActivity();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // UI state
  const [search, setSearch] = useState("");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterBlocked, setFilterBlocked] = useState(false);
  const [view, setView] = useState<"board" | "review">("board");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BuildoutCard | null>(null);
  const [draftSeed, setDraftSeed] = useState<DraftCard>(blankDraft("backlog"));

  // Drag state
  const [activeCard, setActiveCard] = useState<BuildoutCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Filtered cards
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (filterOwner !== "all" && c.ownerName !== filterOwner) return false;
      if (filterCategory !== "all" && c.category !== filterCategory) return false;
      if (filterBlocked && !(c.blocker && c.blocker.trim().length > 0)) return false;
      if (s) {
        const inTitle = c.title.toLowerCase().includes(s);
        const inLog = (c.activityLog ?? []).some((e) =>
          e.text.toLowerCase().includes(s),
        );
        if (!inTitle && !inLog) return false;
      }
      return true;
    });
  }, [cards, search, filterOwner, filterCategory, filterBlocked]);

  const cardsByColumn = useMemo(() => {
    const map: Record<ColumnId, BuildoutCard[]> = {
      backlog: [],
      ready: [],
      in_progress: [],
      waiting_on: [],
      review: [],
      done: [],
    };
    for (const c of filtered) {
      const col = (COLUMNS.find((x) => x.id === c.status)?.id ??
        "backlog") as ColumnId;
      map[col].push(c);
    }
    return map;
  }, [filtered]);

  const openNew = (status: ColumnId) => {
    setEditingCard(null);
    setDraftSeed(blankDraft(status));
    setModalOpen(true);
  };

  const openEdit = (card: BuildoutCard) => {
    setEditingCard(card);
    setDraftSeed(fromCard(card));
    setModalOpen(true);
  };

  const handleSave = async (draft: DraftCard) => {
    const payload = {
      title: draft.title,
      ownerName: draft.ownerName,
      category: draft.category,
      status: draft.status,
      kraLink: draft.kraLink || null,
      targetDoneDate: draft.targetDoneDate || null,
      definitionOfDone: draft.definitionOfDone,
      blocker: draft.blocker || null,
      escalationTrigger: draft.escalationTrigger || null,
      categoryFields: draft.categoryFields,
    };
    if (editingCard) {
      await updateMutation.mutateAsync({
        id: editingCard.id,
        data: payload,
      });
    } else {
      await createMutation.mutateAsync({ data: payload });
    }
    invalidate();
  };

  const handleDelete = async () => {
    if (!editingCard) return;
    await deleteMutation.mutateAsync({ id: editingCard.id });
    invalidate();
  };

  const handleActivity = async (text: string) => {
    if (!editingCard) return;
    const updated = await activityMutation.mutateAsync({
      id: editingCard.id,
      data: { text },
    });
    setEditingCard(updated);
    invalidate();
  };

  const handleDragStart = (e: DragStartEvent) => {
    const c = cards.find((x) => String(x.id) === String(e.active.id));
    setActiveCard(c ?? null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveCard(null);
    const overId = e.over?.id;
    if (!overId) return;
    const target = String(overId) as ColumnId;
    if (!COLUMNS.some((c) => c.id === target)) return;
    const card = cards.find((x) => String(x.id) === String(e.active.id));
    if (!card || card.status === target) return;
    await updateMutation.mutateAsync({
      id: card.id,
      data: { status: target },
    });
    invalidate();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-[#0F2A47]" />
            EDGE Buildout Board
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operations system for the dental practice construction & launch project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "review" ? "default" : "outline"}
            size="sm"
            onClick={() => setView(view === "review" ? "board" : "review")}
            className={
              view === "review"
                ? "bg-[#D62828] hover:bg-[#D62828]/90 text-white"
                : ""
            }
          >
            <ShieldAlert className="h-4 w-4 mr-1" />
            Weekly Review
          </Button>
          <Button
            size="sm"
            onClick={() => openNew("backlog")}
            className="bg-[#0F2A47] hover:bg-[#0F2A47]/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Card
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {view === "board" && (
        <div className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-md px-3 py-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or notes…"
              className="pl-7 h-8 w-64"
            />
          </div>
          <FilterIcon className="h-4 w-4 text-slate-400" />
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {TEAM_MEMBERS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-52">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-slate-700">
            <Checkbox
              checked={filterBlocked}
              onCheckedChange={(v) => setFilterBlocked(Boolean(v))}
            />
            Show only blocked
          </label>
          {(search ||
            filterOwner !== "all" ||
            filterCategory !== "all" ||
            filterBlocked) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilterOwner("all");
                setFilterCategory("all");
                setFilterBlocked(false);
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500 py-10 text-center">Loading board…</div>
      ) : view === "review" ? (
        <WeeklyReviewView
          cards={cards}
          onCardClick={(c) => {
            setView("board");
            openEdit(c);
          }}
          onBack={() => setView("board")}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  cards={cardsByColumn[col.id]}
                  onCardClick={openEdit}
                  onAddCard={openNew}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeCard ? <CardChip card={activeCard} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <CardModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialDraft={draftSeed}
        existingCard={editingCard}
        onSave={handleSave}
        onDelete={editingCard ? handleDelete : null}
        onAddActivity={editingCard ? handleActivity : null}
      />
    </div>
  );
}

export default BuildoutBoard;

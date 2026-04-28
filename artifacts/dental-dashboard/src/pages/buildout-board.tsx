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
  CheckCircle2,
  ListChecks,
  ArrowLeft,
  Trash2,
  MessageSquare,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  useListBuildoutCards,
  useCreateBuildoutCard,
  useUpdateBuildoutCard,
  useDeleteBuildoutCard,
  useAddBuildoutCardActivity,
  useListOrganizations,
  getListBuildoutCardsQueryKey,
  type BuildoutCard,
  type Organization,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLUMNS = [
  { id: "backlog", label: "Backlog", wip: null as number | null },
  { id: "ready", label: "Ready", wip: null },
  { id: "in_progress", label: "In Progress", wip: 5 },
  { id: "waiting_on", label: "Waiting On", wip: null },
  { id: "review", label: "Review", wip: 3 },
  { id: "done", label: "Done", wip: null },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const BUSINESS_AREAS = ["Location", "Financials", "People", "Operations"] as const;
type BusinessArea = (typeof BUSINESS_AREAS)[number];

const AREA_STYLES: Record<
  BusinessArea,
  { bar: string; tint: string; ring: string; label: string; pill: string }
> = {
  Location: {
    bar: "bg-blue-500",
    tint: "bg-blue-50/40",
    ring: "border-blue-200",
    label: "text-blue-900",
    pill: "bg-blue-100 text-blue-800",
  },
  Financials: {
    bar: "bg-emerald-500",
    tint: "bg-emerald-50/40",
    ring: "border-emerald-200",
    label: "text-emerald-900",
    pill: "bg-emerald-100 text-emerald-800",
  },
  People: {
    bar: "bg-violet-500",
    tint: "bg-violet-50/40",
    ring: "border-violet-200",
    label: "text-violet-900",
    pill: "bg-violet-100 text-violet-800",
  },
  Operations: {
    bar: "bg-orange-500",
    tint: "bg-orange-50/40",
    ring: "border-orange-200",
    label: "text-orange-900",
    pill: "bg-orange-100 text-orange-800",
  },
};

const CATEGORIES_BY_AREA: Record<BusinessArea, readonly string[]> = {
  Location: [
    "Lease & Legal",
    "Permitting & DNR",
    "Design & Construction",
    "Signage",
    "Real Estate Pipeline",
  ],
  Financials: [
    "Capital & Funding",
    "Banking & Treasury",
    "Accounting & Tax",
    "Insurance",
    "Budget & Forecasting",
    "Financial Reporting",
  ],
  People: [
    "Doctor Recruiting (Partner Track)",
    "Doctor Recruiting (Associate)",
    "Clinical Staff Hiring",
    "Operations/Admin Hiring",
    "Onboarding",
    "Culture & Training",
    "Performance Management",
    "Compensation & Benefits",
  ],
  Operations: [
    "Equipment & IT",
    "Vendor Contracts",
    "Clinical Workflows",
    "Supply Chain",
    "Compliance (HIPAA, OSHA, NC Dental Board)",
    "Patient Experience",
    "Marketing & Brand",
    "Technology & Software",
  ],
};

const ALL_CATEGORIES = Object.values(CATEGORIES_BY_AREA).flat();

const CATEGORY_TO_AREA: Record<string, BusinessArea> = (() => {
  const m: Record<string, BusinessArea> = {};
  for (const area of BUSINESS_AREAS) {
    for (const c of CATEGORIES_BY_AREA[area]) m[c] = area;
  }
  return m;
})();

// Color tags for categories that had per-category styling in v1.
const CATEGORY_TAG: Record<string, { tag: string; dot: string }> = {
  "Lease & Legal": {
    tag: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  "Permitting & DNR": {
    tag: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  "Design & Construction": {
    tag: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  Signage: {
    tag: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  "Equipment & IT": {
    tag: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
  "Vendor Contracts": {
    tag: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
};

const DEFAULT_CATEGORY_TAG = {
  tag: "bg-slate-100 text-slate-700 border-slate-200",
  dot: "bg-slate-400",
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

function isBusinessArea(s: string): s is BusinessArea {
  return (BUSINESS_AREAS as readonly string[]).includes(s);
}

// ---------------------------------------------------------------------------
// Per-category dynamic field defs (kept from v1 — only these have detail forms)
// ---------------------------------------------------------------------------

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "boolean" | "select";
  options?: readonly string[];
};

const CATEGORY_FIELD_DEFS: Record<string, FieldDef[]> = {
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

function getCategoryDefs(c: string): FieldDef[] {
  return CATEGORY_FIELD_DEFS[c] ?? [];
}

// ---------------------------------------------------------------------------
// Card chip
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
  const catStyle = CATEGORY_TAG[card.category] ?? DEFAULT_CATEGORY_TAG;

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
// Column (drop target keyed per swimlane)
// ---------------------------------------------------------------------------

function dropId(area: BusinessArea, status: ColumnId): string {
  return `${area}::${status}`;
}

function parseDropId(id: string): { area: BusinessArea; status: ColumnId } | null {
  const [area, status] = id.split("::");
  if (!area || !status) return null;
  if (!isBusinessArea(area)) return null;
  if (!COLUMNS.some((c) => c.id === status)) return null;
  return { area: area as BusinessArea, status: status as ColumnId };
}

function ColumnCell({
  area,
  column,
  cards,
  onCardClick,
  onAddCard,
}: {
  area: BusinessArea;
  column: (typeof COLUMNS)[number];
  cards: BuildoutCard[];
  onCardClick: (c: BuildoutCard) => void;
  onAddCard: (area: BusinessArea, status: ColumnId) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId(area, column.id) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-slate-50/80 rounded-md border border-slate-200 min-h-[140px]",
        isOver && "ring-2 ring-[#0F2A47]/40 bg-slate-100",
      )}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200/70">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
        <button
          onClick={() => onAddCard(area, column.id)}
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200"
          title="New card here"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto max-h-[420px]">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} onClick={() => onCardClick(c)} />
        ))}
        {cards.length === 0 && (
          <div className="text-center text-[10px] text-slate-400 py-4 italic">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Swimlane row (column headers + 6 column cells + collapsible)
// ---------------------------------------------------------------------------

function Swimlane({
  area,
  cards,
  collapsed,
  onToggleCollapse,
  onCardClick,
  onAddCard,
}: {
  area: BusinessArea;
  cards: BuildoutCard[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCardClick: (c: BuildoutCard) => void;
  onAddCard: (area: BusinessArea, status: ColumnId) => void;
}) {
  const style = AREA_STYLES[area];
  const cardsByCol = useMemo(() => {
    const m: Record<ColumnId, BuildoutCard[]> = {
      backlog: [],
      ready: [],
      in_progress: [],
      waiting_on: [],
      review: [],
      done: [],
    };
    for (const c of cards) {
      const col = COLUMNS.find((x) => x.id === c.status);
      if (col) m[col.id].push(c);
    }
    return m;
  }, [cards]);

  return (
    <section className={cn("rounded-lg border", style.ring, style.tint)}>
      {/* Sticky swimlane header */}
      <div
        className={cn(
          "sticky top-0 z-10 flex items-center gap-3 px-3 py-2 border-b border-slate-200 backdrop-blur-sm bg-white/80 rounded-t-lg cursor-pointer select-none",
        )}
        onClick={onToggleCollapse}
        role="button"
      >
        <span className={cn("h-6 w-1.5 rounded-full shrink-0", style.bar)} />
        <button
          className="text-slate-500 hover:text-slate-900"
          aria-label={collapsed ? "Expand swimlane" : "Collapse swimlane"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        <h2 className={cn("text-sm font-semibold", style.label)}>{area}</h2>
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            style.pill,
          )}
        >
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>

        {/* Per-column counts (always visible — important when collapsed) */}
        <div className="ml-auto flex items-center gap-1.5">
          {COLUMNS.map((col) => {
            const n = cardsByCol[col.id].length;
            const overWip = col.wip !== null && n > col.wip;
            const atWip = col.wip !== null && n === col.wip;
            return (
              <span
                key={col.id}
                title={`${col.label}: ${n}${col.wip !== null ? ` / ${col.wip} WIP` : ""}`}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap",
                  overWip
                    ? "bg-red-100 text-red-800 border-red-300"
                    : atWip
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-white text-slate-600 border-slate-200",
                )}
              >
                {col.label}: {n}
                {col.wip !== null ? `/${col.wip}` : ""}
              </span>
            );
          })}
        </div>
      </div>

      {!collapsed && (
        <div className="p-2 overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 min-w-[1100px]">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex flex-col gap-1.5">
                {/* Column header (per swimlane) */}
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-700">
                    {col.label}
                  </span>
                  {col.wip !== null && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        cardsByCol[col.id].length > col.wip
                          ? "bg-red-200 text-red-800"
                          : cardsByCol[col.id].length === col.wip
                          ? "bg-amber-200 text-amber-800"
                          : "bg-slate-200 text-slate-700",
                      )}
                    >
                      {cardsByCol[col.id].length}/{col.wip}
                    </span>
                  )}
                </div>
                <ColumnCell
                  area={area}
                  column={col}
                  cards={cardsByCol[col.id]}
                  onCardClick={onCardClick}
                  onAddCard={onAddCard}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Detail / Edit modal
// ---------------------------------------------------------------------------

type DraftCard = {
  title: string;
  ownerName: string;
  category: string;
  businessArea: BusinessArea;
  status: ColumnId;
  organizationId: number | null;
  kraLink: string;
  targetDoneDate: string;
  definitionOfDone: string;
  blocker: string;
  escalationTrigger: string;
  categoryFields: Record<string, unknown>;
};

function blankDraft(
  area: BusinessArea,
  status: ColumnId,
  organizationId: number | null = null,
): DraftCard {
  const firstCategory = CATEGORIES_BY_AREA[area][0];
  return {
    title: "",
    ownerName: "Brooks Paine",
    category: firstCategory,
    businessArea: area,
    status,
    organizationId,
    kraLink: "",
    targetDoneDate: "",
    definitionOfDone: "",
    blocker: "",
    escalationTrigger: "",
    categoryFields: {},
  };
}

function fromCard(card: BuildoutCard): DraftCard {
  const area = isBusinessArea(card.businessArea)
    ? card.businessArea
    : (CATEGORY_TO_AREA[card.category] ?? "Operations");
  return {
    title: card.title,
    ownerName: card.ownerName,
    category: card.category,
    businessArea: area,
    status: card.status as ColumnId,
    organizationId: card.organizationId ?? null,
    kraLink: card.kraLink ?? "",
    targetDoneDate: card.targetDoneDate ?? "",
    definitionOfDone: card.definitionOfDone,
    blocker: card.blocker ?? "",
    escalationTrigger: card.escalationTrigger ?? "",
    categoryFields:
      (card.categoryFields as Record<string, unknown> | null | undefined) ?? {},
  };
}

// Organization grouping for filter and modal location pickers.
const ORG_GROUP_LABEL: Record<string, string> = {
  edge_dso: "EDGE DSO",
  edge: "EDGE Locations",
  urgent_dental: "UD Locations",
};
const ORG_GROUP_ORDER = ["edge_dso", "edge", "urgent_dental"];

function groupOrganizations(
  organizations: Organization[],
): Array<{ cat: string; orgs: Organization[] }> {
  const byCat = new Map<string, Organization[]>();
  for (const o of organizations) {
    const cat = o.category ?? "other";
    const arr = byCat.get(cat) ?? [];
    arr.push(o);
    byCat.set(cat, arr);
  }
  for (const arr of byCat.values()) {
    arr.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }
  return ORG_GROUP_ORDER.flatMap((cat) =>
    byCat.get(cat) ? [{ cat, orgs: byCat.get(cat)! }] : [],
  );
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
  organizations,
  groupedOrgs,
  onSave,
  onDelete,
  onAddActivity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialDraft: DraftCard;
  existingCard: BuildoutCard | null;
  organizations: Organization[];
  groupedOrgs: Array<{ cat: string; orgs: Organization[] }>;
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
    draft.businessArea.trim().length > 0 &&
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
              : "Add a new card to the Big Board."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-4">
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
                <Label>Business Area *</Label>
                <Select
                  value={draft.businessArea}
                  onValueChange={(v) => {
                    if (!isBusinessArea(v)) return;
                    const cats = CATEGORIES_BY_AREA[v];
                    const nextCategory = cats.includes(draft.category)
                      ? draft.category
                      : cats[0];
                    setDraft({
                      ...draft,
                      businessArea: v,
                      category: nextCategory,
                      categoryFields:
                        nextCategory === draft.category
                          ? draft.categoryFields
                          : {},
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <Select
                value={
                  draft.organizationId === null
                    ? "__none__"
                    : String(draft.organizationId)
                }
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    organizationId: v === "__none__" ? null : Number(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No location —</SelectItem>
                  {groupedOrgs.map(({ cat, orgs }) => (
                    <SelectGroup key={cat}>
                      <SelectLabel className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {ORG_GROUP_LABEL[cat] ?? cat}
                      </SelectLabel>
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {(o.name ?? "").trim()}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    {CATEGORIES_BY_AREA[draft.businessArea].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label>KRA / Rock Link</Label>
                <Input
                  value={draft.kraLink}
                  onChange={(e) => setDraft({ ...draft, kraLink: e.target.value })}
                  placeholder="(optional)"
                />
              </div>
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

            {catDefs.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-600 mb-2">
                  {draft.category} fields
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {catDefs.map((def) => (
                    <div
                      key={def.key}
                      className={cn(def.type === "textarea" && "col-span-2")}
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
// Cross-swimlane move confirmation
// ---------------------------------------------------------------------------

type PendingMove = {
  card: BuildoutCard;
  fromArea: BusinessArea;
  toArea: BusinessArea;
  toStatus: ColumnId;
};

function MoveAreaDialog({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingMove | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={!!pending}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to a different business area?</DialogTitle>
          <DialogDescription>
            {pending && (
              <>
                Move <span className="font-medium">"{pending.card.title}"</span>{" "}
                from <span className="font-medium">{pending.fromArea}</span> to{" "}
                <span className="font-medium">{pending.toArea}</span>?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="bg-[#0F2A47] hover:bg-[#0F2A47]/90"
          >
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Weekly Review (now grouped by Business Area)
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
  const flaggedByArea = useMemo(() => {
    const m: Record<BusinessArea, Array<{ card: BuildoutCard; reasons: string[] }>> = {
      Location: [],
      Financials: [],
      People: [],
      Operations: [],
    };
    for (const c of cards) {
      const reasons = classifyForReview(c);
      if (reasons.length === 0) continue;
      const area = isBusinessArea(c.businessArea) ? c.businessArea : "Operations";
      m[area].push({ card: c, reasons });
    }
    return m;
  }, [cards]);

  const totalFlagged = useMemo(
    () =>
      Object.values(flaggedByArea).reduce((acc, arr) => acc + arr.length, 0),
    [flaggedByArea],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Board
        </Button>
        <div className="text-sm text-slate-600">
          {totalFlagged} card{totalFlagged === 1 ? "" : "s"} need review
        </div>
      </div>

      {totalFlagged === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
          <div className="text-slate-700 font-medium">All clear</div>
          <div className="text-sm text-slate-500">
            Nothing is overdue, blocked, or stalled this week.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {BUSINESS_AREAS.map((area) => {
            const items = flaggedByArea[area];
            if (items.length === 0) return null;
            const style = AREA_STYLES[area];
            return (
              <div key={area} className={cn("rounded-lg border", style.ring, style.tint)}>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white/70 rounded-t-lg">
                  <span className={cn("h-5 w-1.5 rounded-full", style.bar)} />
                  <h3 className={cn("text-sm font-semibold", style.label)}>
                    {area}
                  </h3>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      style.pill,
                    )}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="p-2 space-y-2">
                  {items.map(({ card, reasons }) => (
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
              </div>
            );
          })}
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
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [filterAreas, setFilterAreas] = useState<Set<BusinessArea>>(new Set());
  const [filterBlocked, setFilterBlocked] = useState(false);
  const { data: organizations = [] } = useListOrganizations();
  const groupedOrgs = useMemo(
    () => groupOrganizations(organizations),
    [organizations],
  );
  const [view, setView] = useState<"board" | "review">("board");
  const [collapsed, setCollapsed] = useState<Set<BusinessArea>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BuildoutCard | null>(null);
  const [draftSeed, setDraftSeed] = useState<DraftCard>(
    blankDraft("Location", "backlog"),
  );

  // Drag state
  const [activeCard, setActiveCard] = useState<BuildoutCard | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Filtered cards
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return cards.filter((c) => {
      const area = isBusinessArea(c.businessArea) ? c.businessArea : "Operations";
      if (filterOwner !== "all" && c.ownerName !== filterOwner) return false;
      if (
        filterOrg !== "all" &&
        String(c.organizationId ?? "") !== filterOrg
      )
        return false;
      if (filterAreas.size > 0 && !filterAreas.has(area)) return false;
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
  }, [cards, search, filterOwner, filterOrg, filterAreas, filterBlocked]);

  const cardsByArea = useMemo(() => {
    const m: Record<BusinessArea, BuildoutCard[]> = {
      Location: [],
      Financials: [],
      People: [],
      Operations: [],
    };
    for (const c of filtered) {
      const area = isBusinessArea(c.businessArea) ? c.businessArea : "Operations";
      m[area].push(c);
    }
    return m;
  }, [filtered]);

  const openNew = (area: BusinessArea, status: ColumnId) => {
    setEditingCard(null);
    // Pre-select the currently filtered location, when one is active.
    const seedOrg = filterOrg === "all" ? null : Number(filterOrg);
    setDraftSeed(blankDraft(area, status, seedOrg));
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
      businessArea: draft.businessArea,
      status: draft.status,
      organizationId: draft.organizationId,
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

  const toggleCollapse = (area: BusinessArea) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const toggleAreaFilter = (area: BusinessArea) => {
    setFilterAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const handleDragStart = (e: DragStartEvent) => {
    const c = cards.find((x) => String(x.id) === String(e.active.id));
    setActiveCard(c ?? null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveCard(null);
    const overId = e.over?.id;
    if (!overId) return;
    const target = parseDropId(String(overId));
    if (!target) return;
    const card = cards.find((x) => String(x.id) === String(e.active.id));
    if (!card) return;
    const fromArea = isBusinessArea(card.businessArea)
      ? card.businessArea
      : "Operations";

    if (target.area === fromArea) {
      // Same swimlane — just a status change (or no-op).
      if (card.status === target.status) return;
      await updateMutation.mutateAsync({
        id: card.id,
        data: { status: target.status },
      });
      invalidate();
      return;
    }

    // Cross-swimlane move — confirm first.
    setPendingMove({
      card,
      fromArea,
      toArea: target.area,
      toStatus: target.status,
    });
  };

  const confirmPendingMove = async () => {
    if (!pendingMove) return;
    const { card, toArea, toStatus } = pendingMove;
    setPendingMove(null);
    // If the new area doesn't include the card's current category, fall back
    // to that area's first category so the card stays valid.
    const cats = CATEGORIES_BY_AREA[toArea];
    const nextCategory = cats.includes(card.category) ? card.category : cats[0];
    await updateMutation.mutateAsync({
      id: card.id,
      data: {
        businessArea: toArea,
        status: toStatus,
        category: nextCategory,
      },
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
            Big Board
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operations system for the dental practice construction & launch
            project, organized by business area.
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
            onClick={() => openNew("Location", "backlog")}
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
          <Select value={filterOrg} onValueChange={setFilterOrg}>
            <SelectTrigger className="h-8 w-56">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {groupedOrgs.map(({ cat, orgs }) => (
                <SelectGroup key={cat}>
                  <SelectLabel className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {ORG_GROUP_LABEL[cat] ?? cat}
                  </SelectLabel>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {(o.name ?? "").trim()}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {/* Business Area multi-select toggles */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[11px] text-slate-500 font-medium mr-1">
              Area:
            </span>
            {BUSINESS_AREAS.map((a) => {
              const active = filterAreas.has(a);
              const style = AREA_STYLES[a];
              return (
                <button
                  key={a}
                  onClick={() => toggleAreaFilter(a)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-full border transition-all",
                    active
                      ? `${style.pill} border-transparent ring-1 ring-offset-1 ring-current`
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", style.bar)} />
                    {a}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-700 ml-1">
            <Checkbox
              checked={filterBlocked}
              onCheckedChange={(v) => setFilterBlocked(Boolean(v))}
            />
            Blocked only
          </label>
          {(search ||
            filterOwner !== "all" ||
            filterOrg !== "all" ||
            filterAreas.size > 0 ||
            filterBlocked) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilterOwner("all");
                setFilterOrg("all");
                setFilterAreas(new Set());
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
        <div className="text-sm text-slate-500 py-10 text-center">
          Loading board…
        </div>
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
          <div className="space-y-4">
            {BUSINESS_AREAS.map((area) => (
              <Swimlane
                key={area}
                area={area}
                cards={cardsByArea[area]}
                collapsed={collapsed.has(area)}
                onToggleCollapse={() => toggleCollapse(area)}
                onCardClick={openEdit}
                onAddCard={openNew}
              />
            ))}
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
        organizations={organizations}
        groupedOrgs={groupedOrgs}
        onSave={handleSave}
        onDelete={editingCard ? handleDelete : null}
        onAddActivity={editingCard ? handleActivity : null}
      />

      <MoveAreaDialog
        pending={pendingMove}
        onConfirm={confirmPendingMove}
        onCancel={() => setPendingMove(null)}
      />
    </div>
  );
}

export default BuildoutBoard;

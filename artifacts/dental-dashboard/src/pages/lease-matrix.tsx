import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLeaseRecords,
  getListLeaseRecordsQueryKey,
  updateLeaseRecord,
  listOrganizations,
  getListOrganizationsQueryKey,
  listLeaseDocuments,
} from "@workspace/api-client-react";
import type {
  LeaseRecord,
  Organization,
  UpdateLeaseRecordBody,
  LeaseDocument,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator,
  Calendar as CalendarIcon,
  Paperclip,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { getListLeaseDocumentsQueryKey } from "@workspace/api-client-react";
import { DocumentsPanel } from "@/components/lease-matrix/documents-panel";
import { useActiveUser } from "@/contexts/active-user-context";

const SEED_CATEGORIES = ["edge", "urgent_dental"] as const;
const EDIT_MODE_LS_KEY = "lease-matrix:edit-mode";

type YesNoConditional = "yes" | "no" | "conditional";
const YNC_LABELS: Record<YesNoConditional, string> = {
  yes: "Yes",
  no: "No",
  conditional: "Conditional",
};

const GUARANTOR_OPTIONS = ["Brooks Paine", "Frank Alderman", "Other"] as const;

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtCurrency(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPercent(v: number | null | undefined): string {
  if (v == null) return "";
  return `${v.toFixed(2)}%`;
}

function fmtInt(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toLocaleString("en-US");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  // ISO date "yyyy-mm-dd" — render in local-blind way (no timezone shift).
  const [y, m, d] = iso.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`).getTime();
  const b = new Date(`${bIso}T00:00:00Z`).getTime();
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Auto-calculations
// ---------------------------------------------------------------------------

function computeTiTotal(rec: LeaseRecord): number | null {
  if (rec.tiAllowanceTotalOverride != null) return rec.tiAllowanceTotalOverride;
  if (rec.squareFootage != null && rec.tiAllowancePerSf != null) {
    return rec.squareFootage * rec.tiAllowancePerSf;
  }
  return null;
}

function computeLeaseExpiration(rec: LeaseRecord): string | null {
  if (rec.leaseExpirationDateOverride) return rec.leaseExpirationDateOverride;
  if (rec.leaseExecutionDate && rec.initialLeaseTermYears != null) {
    const [y, m, d] = rec.leaseExecutionDate
      .split("-")
      .map((s) => Number.parseInt(s, 10));
    if (!y || !m || !d) return null;
    const expY = y + rec.initialLeaseTermYears;
    return `${expY}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Date alerts
// ---------------------------------------------------------------------------

type AlertSeverity = "red" | "orange" | "yellow";
const ALERT_RANK: Record<AlertSeverity, number> = { red: 0, orange: 1, yellow: 2 };
const ALERT_STYLES: Record<AlertSeverity, string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  yellow: "bg-amber-100 text-amber-800 border-amber-200",
};

interface DateAlert {
  field: string;
  label: string;
  severity: AlertSeverity;
}

function classifyDate(
  field: string,
  label: string,
  iso: string | null | undefined,
): DateAlert | null {
  if (!iso) return null;
  const days = daysBetween(iso, todayIso());
  if (days < 0) return { field, label, severity: "red" };
  if (days <= 30) return { field, label, severity: "orange" };
  if (days <= 90) return { field, label, severity: "yellow" };
  return null;
}

function buildAlerts(rec: LeaseRecord): DateAlert[] {
  const expiration = computeLeaseExpiration(rec);
  const candidates: DateAlert[] = [
    classifyDate("leaseExecutionDate", "Execution", rec.leaseExecutionDate),
    classifyDate("anticipatedDeliveryDate", "Delivery", rec.anticipatedDeliveryDate),
    classifyDate("rentCommencementDate", "RCD", rec.rentCommencementDate),
    classifyDate("leaseExpirationDateOverride", "Expiration", expiration),
    classifyDate("optionRenewalDeadline", "Renewal Notice", rec.optionRenewalDeadline),
    classifyDate("dnrPermitContingencyDeadline", "DNR Contingency", rec.dnrPermitContingencyDeadline),
  ].filter((a): a is DateAlert => a !== null);

  candidates.sort((a, b) => ALERT_RANK[a.severity] - ALERT_RANK[b.severity]);
  return candidates;
}

// ---------------------------------------------------------------------------
// Save hook — debounced field-level patch
// ---------------------------------------------------------------------------

function useFieldSaver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: UpdateLeaseRecordBody;
    }) => updateLeaseRecord(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({
        queryKey: getListLeaseRecordsQueryKey(),
      });
      const prev = queryClient.getQueryData<LeaseRecord[]>(
        getListLeaseRecordsQueryKey(),
      );
      if (prev) {
        queryClient.setQueryData<LeaseRecord[]>(
          getListLeaseRecordsQueryKey(),
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        );
      }
      return { prev };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(getListLeaseRecordsQueryKey(), ctx.prev);
      }
      toast({
        title: "Could not save",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getListLeaseRecordsQueryKey(),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Editor primitives — open in popovers
// ---------------------------------------------------------------------------

function EditorPopover({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  width = "w-72",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={`${width} p-3`}
        align="start"
        onOpenAutoFocus={(e) => {
          // Let the first input focus naturally for tab-flow editing.
          e.preventDefault();
          const root = e.currentTarget as HTMLElement;
          const first = root.querySelector(
            "input, textarea, select, button",
          ) as HTMLElement | null;
          first?.focus();
        }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
          {title}
        </div>
        <div className="space-y-2.5">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[11px] text-slate-600 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell renderer + inline editor
// ---------------------------------------------------------------------------

interface CellProps {
  rec: LeaseRecord;
  org: Organization | undefined;
  editMode: boolean;
  save: (patch: UpdateLeaseRecordBody) => void;
}

function ReadCell({
  children,
  empty = "—",
  onClick,
  editable,
  calculated,
  hasOverride,
}: {
  children?: React.ReactNode;
  empty?: string;
  onClick?: () => void;
  editable: boolean;
  calculated?: boolean;
  hasOverride?: boolean;
}) {
  const isEmpty =
    children == null ||
    children === "" ||
    (Array.isArray(children) && children.length === 0);
  return (
    <button
      type="button"
      onClick={editable ? onClick : undefined}
      disabled={!editable}
      className={`group w-full min-h-[40px] text-left px-2 py-1.5 text-[13px] leading-snug rounded transition-colors ${
        editable
          ? "hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0F2A47]/40 cursor-text"
          : "cursor-default"
      } ${isEmpty ? "text-slate-300 italic" : "text-slate-700"}`}
    >
      <div className="flex items-start gap-1">
        <span className="flex-1 whitespace-pre-wrap break-words">
          {isEmpty ? empty : children}
        </span>
        {calculated && (
          <Calculator
            className={`h-3 w-3 shrink-0 mt-0.5 ${
              hasOverride ? "text-amber-500" : "text-slate-300"
            }`}
            aria-label={hasOverride ? "Overridden" : "Auto-calculated"}
          />
        )}
        {editable && (
          <Pencil className="h-3 w-3 shrink-0 mt-0.5 text-slate-300 opacity-0 group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}

// ---- Text / textarea cell -------------------------------------------------

function TextCell({
  value,
  onSave,
  editable,
  multiline = false,
  placeholder,
}: {
  value: string | null | undefined;
  onSave: (next: string | null) => void;
  editable: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => {
    if (open) setDraft(value ?? "");
  }, [open, value]);

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Edit"
      trigger={
        <ReadCell editable={editable} onClick={() => setOpen(true)}>
          {value}
        </ReadCell>
      }
    >
      {multiline ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      ) : (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(draft.trim() === "" ? null : draft);
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onSave(draft.trim() === "" ? null : draft);
            setOpen(false);
          }}
        >
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

// ---- Number / currency / percent ------------------------------------------

function NumberCell({
  value,
  onSave,
  editable,
  format,
  step = "any",
  placeholder,
}: {
  value: number | null | undefined;
  onSave: (next: number | null) => void;
  editable: boolean;
  format: "int" | "currency" | "percent";
  step?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  useEffect(() => {
    if (open) setDraft(value == null ? "" : String(value));
  }, [open, value]);

  function commit() {
    if (draft.trim() === "") {
      onSave(null);
    } else {
      const n =
        format === "int" ? Number.parseInt(draft, 10) : Number.parseFloat(draft);
      if (Number.isFinite(n)) onSave(n);
    }
    setOpen(false);
  }

  let display: string = "";
  if (value != null) {
    display =
      format === "currency"
        ? fmtCurrency(value)
        : format === "percent"
          ? fmtPercent(value)
          : fmtInt(value);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Edit"
      trigger={
        <ReadCell editable={editable} onClick={() => setOpen(true)}>
          {display}
        </ReadCell>
      }
      width="w-56"
    >
      <Input
        type="number"
        step={step}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setOpen(false);
        }}
        className="h-8 text-sm"
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

// ---- Date cell ------------------------------------------------------------

function DateCell({
  value,
  onSave,
  editable,
}: {
  value: string | null | undefined;
  onSave: (next: string | null) => void;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => {
    if (open) setDraft(value ?? "");
  }, [open, value]);

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Edit date"
      trigger={
        <ReadCell editable={editable} onClick={() => setOpen(true)}>
          {value ? (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3 w-3 text-slate-400" />
              {fmtDate(value)}
            </span>
          ) : null}
        </ReadCell>
      }
      width="w-56"
    >
      <Input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(draft || null);
            setOpen(false);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="h-8 text-sm"
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onSave(draft || null);
            setOpen(false);
          }}
        >
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

// ---------------------------------------------------------------------------
// Consolidated cells
// ---------------------------------------------------------------------------

function LeaseTermOptionsCell({ rec, editMode, save }: CellProps) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [c, setC] = useState<string>("");
  useEffect(() => {
    if (open) {
      setA(rec.initialLeaseTermYears?.toString() ?? "");
      setB(rec.extensionOptionsCount?.toString() ?? "");
      setC(rec.extensionOptionLengthYears?.toString() ?? "");
    }
  }, [open, rec]);

  const summary = (() => {
    const parts: string[] = [];
    if (rec.initialLeaseTermYears != null) {
      parts.push(`${rec.initialLeaseTermYears} yrs`);
    }
    if (rec.extensionOptionsCount && rec.extensionOptionLengthYears) {
      parts.push(
        `+ ${rec.extensionOptionsCount} × ${rec.extensionOptionLengthYears} yr options`,
      );
    } else if (rec.extensionOptionsCount) {
      parts.push(`+ ${rec.extensionOptionsCount} extension options`);
    }
    return parts.join(" ");
  })();

  function commit() {
    const parseOrNull = (s: string) => {
      if (s.trim() === "") return null;
      const n = Number.parseInt(s, 10);
      return Number.isFinite(n) ? n : null;
    };
    save({
      initialLeaseTermYears: parseOrNull(a),
      extensionOptionsCount: parseOrNull(b),
      extensionOptionLengthYears: parseOrNull(c),
    });
    setOpen(false);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Lease Term & Options"
      trigger={
        <ReadCell editable={editMode} onClick={() => setOpen(true)}>
          {summary}
        </ReadCell>
      }
    >
      <FieldRow label="Initial term (years)">
        <Input
          type="number"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="# of extension options">
        <Input
          type="number"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Length of each option (years)">
        <Input
          type="number"
          value={c}
          onChange={(e) => setC(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-8 text-sm"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

function BaseRentEscalatorCell({ rec, editMode, save }: CellProps) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  useEffect(() => {
    if (open) {
      setA(rec.baseRentPerSf?.toString() ?? "");
      setB(rec.annualEscalatorPct?.toString() ?? "");
    }
  }, [open, rec]);

  const summary = (() => {
    const parts: string[] = [];
    if (rec.baseRentPerSf != null) {
      parts.push(`${fmtCurrency(rec.baseRentPerSf)}/SF`);
    }
    if (rec.annualEscalatorPct != null) {
      parts.push(`${fmtPercent(rec.annualEscalatorPct)} annual`);
    }
    return parts.join(", ");
  })();

  function commit() {
    const parseOrNull = (s: string) => {
      if (s.trim() === "") return null;
      const n = Number.parseFloat(s);
      return Number.isFinite(n) ? n : null;
    };
    save({
      baseRentPerSf: parseOrNull(a),
      annualEscalatorPct: parseOrNull(b),
    });
    setOpen(false);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Base Rent & Escalator"
      trigger={
        <ReadCell editable={editMode} onClick={() => setOpen(true)}>
          {summary}
        </ReadCell>
      }
    >
      <FieldRow label="Base rent per SF ($)">
        <Input
          type="number"
          step="0.01"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="Annual escalator (%)">
        <Input
          type="number"
          step="0.01"
          value={b}
          onChange={(e) => setB(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-8 text-sm"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

function CamCell({ rec, editMode, save }: CellProps) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [c, setC] = useState<string>("");
  useEffect(() => {
    if (open) {
      setA(rec.camPerSf?.toString() ?? "");
      setB(rec.camCapControllablePct?.toString() ?? "");
      setC(rec.camCapUncontrollablePct?.toString() ?? "");
    }
  }, [open, rec]);

  const summary = (() => {
    const parts: string[] = [];
    if (rec.camPerSf != null) parts.push(`${fmtCurrency(rec.camPerSf)}/SF`);
    const caps: string[] = [];
    if (rec.camCapControllablePct != null) {
      caps.push(`${fmtPercent(rec.camCapControllablePct)} ctrl`);
    }
    if (rec.camCapUncontrollablePct != null) {
      caps.push(`${fmtPercent(rec.camCapUncontrollablePct)} unctrl`);
    }
    if (caps.length > 0) parts.push(`Cap: ${caps.join(" / ")}`);
    return parts.join(" — ");
  })();

  function commit() {
    const parseOrNull = (s: string) => {
      if (s.trim() === "") return null;
      const n = Number.parseFloat(s);
      return Number.isFinite(n) ? n : null;
    };
    save({
      camPerSf: parseOrNull(a),
      camCapControllablePct: parseOrNull(b),
      camCapUncontrollablePct: parseOrNull(c),
    });
    setOpen(false);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="CAM per SF & Cap Structure"
      trigger={
        <ReadCell editable={editMode} onClick={() => setOpen(true)}>
          {summary}
        </ReadCell>
      }
    >
      <FieldRow label="CAM per SF ($)">
        <Input
          type="number"
          step="0.01"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="CAM Cap — Controllable (%)">
        <Input
          type="number"
          step="0.01"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="h-8 text-sm"
        />
      </FieldRow>
      <FieldRow label="CAM Cap — Uncontrollable (%)">
        <Input
          type="number"
          step="0.01"
          value={c}
          onChange={(e) => setC(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-8 text-sm"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

function SignageCell({ rec, editMode, save }: CellProps) {
  const [open, setOpen] = useState(false);
  const [bm, setBm] = useState<string>("");
  const [mn, setMn] = useState<string>("");
  const [py, setPy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  useEffect(() => {
    if (open) {
      setBm(rec.signageBuildingMounted ?? "");
      setMn(rec.signageMonument ?? "");
      setPy(rec.signagePylon ?? "");
      setNotes(rec.signageNotes ?? "");
    }
  }, [open, rec]);

  function shortLabel(v: string | null | undefined): string {
    if (!v) return "—";
    return YNC_LABELS[v as YesNoConditional] ?? v;
  }

  const summary = (
    <div className="space-y-0.5 text-[12px]">
      <div>
        Building: <span className="font-medium">{shortLabel(rec.signageBuildingMounted)}</span>
      </div>
      <div>
        Monument: <span className="font-medium">{shortLabel(rec.signageMonument)}</span>
      </div>
      <div>
        Pylon: <span className="font-medium">{shortLabel(rec.signagePylon)}</span>
      </div>
      {rec.signageNotes && (
        <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
          {rec.signageNotes}
        </div>
      )}
    </div>
  );

  function commit() {
    save({
      signageBuildingMounted: bm || null,
      signageMonument: mn || null,
      signagePylon: py || null,
      signageNotes: notes.trim() || null,
    });
    setOpen(false);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Signage Rights"
      width="w-80"
      trigger={
        <ReadCell editable={editMode} onClick={() => setOpen(true)}>
          {summary}
        </ReadCell>
      }
    >
      {(
        [
          ["Building-Mounted", bm, setBm],
          ["Monument", mn, setMn],
          ["Pylon", py, setPy],
        ] as const
      ).map(([label, value, setter]) => (
        <FieldRow key={label} label={label}>
          <Select
            value={value || "__none__"}
            onValueChange={(v) => setter(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="conditional">Conditional</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      ))}
      <FieldRow label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-sm min-h-[60px]"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

function GuarantorsCell({ rec, editMode, save }: CellProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");
  useEffect(() => {
    if (open) {
      setSelected(rec.personalGuarantors ?? []);
      setOther(rec.guarantorOtherText ?? "");
    }
  }, [open, rec]);

  const display = (() => {
    const list = rec.personalGuarantors ?? [];
    if (list.length === 0) return "";
    return list
      .map((g) =>
        g === "Other" && rec.guarantorOtherText
          ? `Other: ${rec.guarantorOtherText}`
          : g,
      )
      .join(", ");
  })();

  function toggle(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  }

  function commit() {
    save({
      personalGuarantors: selected.length === 0 ? null : selected,
      guarantorOtherText:
        selected.includes("Other") && other.trim() ? other : null,
    });
    setOpen(false);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Personal Guarantors"
      trigger={
        <ReadCell editable={editMode} onClick={() => setOpen(true)}>
          {display}
        </ReadCell>
      }
    >
      {GUARANTOR_OPTIONS.map((g) => (
        <label
          key={g}
          className="flex items-center gap-2 text-sm text-slate-700"
        >
          <Checkbox
            checked={selected.includes(g)}
            onCheckedChange={() => toggle(g)}
          />
          {g}
        </label>
      ))}
      {selected.includes("Other") && (
        <FieldRow label="Other guarantor name(s)">
          <Input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="e.g. Adam Webb"
            className="h-8 text-sm"
          />
        </FieldRow>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

// ---- Auto-calculated cells ------------------------------------------------

function TiTotalCell({ rec, editMode, save }: CellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (open) {
      setDraft(rec.tiAllowanceTotalOverride?.toString() ?? "");
    }
  }, [open, rec]);

  const total = computeTiTotal(rec);
  const hasOverride = rec.tiAllowanceTotalOverride != null;

  function commit() {
    if (draft.trim() === "") {
      save({ tiAllowanceTotalOverride: null });
    } else {
      const n = Number.parseFloat(draft);
      if (Number.isFinite(n)) save({ tiAllowanceTotalOverride: n });
    }
    setOpen(false);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="TI Allowance Total"
      trigger={
        <ReadCell
          editable={editMode}
          calculated
          hasOverride={hasOverride}
          onClick={() => setOpen(true)}
        >
          {fmtCurrency(total)}
        </ReadCell>
      }
      width="w-64"
    >
      <div className="text-[11px] text-slate-500">
        {rec.squareFootage != null && rec.tiAllowancePerSf != null ? (
          <>
            Calculated: {fmtInt(rec.squareFootage)} SF ×{" "}
            {fmtCurrency(rec.tiAllowancePerSf)} ={" "}
            <span className="font-medium">
              {fmtCurrency(rec.squareFootage * rec.tiAllowancePerSf)}
            </span>
          </>
        ) : (
          <span className="italic">
            Set Square Footage and TI Allowance per SF to enable
            auto-calculation.
          </span>
        )}
      </div>
      <FieldRow label="Override (leave blank to use calculation)">
        <Input
          type="number"
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-8 text-sm"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

function LeaseExpirationCell({ rec, editMode, save }: CellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (open) {
      setDraft(rec.leaseExpirationDateOverride ?? "");
    }
  }, [open, rec]);

  const value = computeLeaseExpiration(rec);
  const hasOverride = rec.leaseExpirationDateOverride != null;

  function commit() {
    save({ leaseExpirationDateOverride: draft || null });
    setOpen(false);
  }

  return (
    <EditorPopover
      open={open}
      onOpenChange={setOpen}
      title="Lease Expiration Date"
      trigger={
        <ReadCell
          editable={editMode}
          calculated
          hasOverride={hasOverride}
          onClick={() => setOpen(true)}
        >
          {value ? (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3 w-3 text-slate-400" />
              {fmtDate(value)}
            </span>
          ) : null}
        </ReadCell>
      }
      width="w-64"
    >
      <div className="text-[11px] text-slate-500">
        {rec.leaseExecutionDate && rec.initialLeaseTermYears != null ? (
          <>
            Calculated: {fmtDate(rec.leaseExecutionDate)} +{" "}
            {rec.initialLeaseTermYears} yrs
          </>
        ) : (
          <span className="italic">
            Set Lease Execution Date and Initial Lease Term to enable
            auto-calculation.
          </span>
        )}
      </div>
      <FieldRow label="Override (leave blank to use calculation)">
        <Input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-8 text-sm"
        />
      </FieldRow>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={commit}>
          Save
        </Button>
      </div>
    </EditorPopover>
  );
}

// ---- Documents row cell ---------------------------------------------------

function DocumentsCell({
  rec,
  org,
  editMode,
  onOpen,
}: {
  rec: LeaseRecord;
  org: Organization | undefined;
  editMode: boolean;
  onOpen: () => void;
}) {
  const docsQuery = useQuery({
    queryKey: getListLeaseDocumentsQueryKey(rec.id),
    queryFn: () => listLeaseDocuments(rec.id),
  });
  const docs: LeaseDocument[] = docsQuery.data ?? [];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full min-h-[40px] text-left px-2 py-1.5 rounded hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0F2A47]/40 transition-colors"
    >
      <div className="flex items-center gap-2 text-[13px] text-slate-700">
        <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        {docs.length === 0 ? (
          <span className="italic text-slate-400">
            {editMode ? "Click to upload" : "No documents"}
          </span>
        ) : (
          <span>
            {docs.length} document{docs.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Row config — declarative list of all matrix rows
// ---------------------------------------------------------------------------

interface RowDef {
  key: string;
  label: string;
  render: (props: CellProps) => React.ReactNode;
  isDocs?: boolean;
}

function makeRows(
  openDocsFor: (rec: LeaseRecord) => void,
): RowDef[] {
  return [
    {
      key: "locationName",
      label: "Location Name",
      render: ({ rec, org, editMode, save }) => (
        <TextCell
          value={rec.locationNameOverride ?? org?.name ?? ""}
          onSave={(v) => save({ locationNameOverride: v })}
          editable={editMode}
          placeholder="Location name"
        />
      ),
    },
    {
      key: "address",
      label: "Address",
      render: ({ rec, org, editMode, save }) => {
        const fallback = org
          ? [org.address, org.city && org.state ? `${org.city}, ${org.state}` : ""]
              .filter(Boolean)
              .join("\n")
          : "";
        return (
          <TextCell
            value={rec.addressOverride ?? fallback}
            onSave={(v) => save({ addressOverride: v })}
            editable={editMode}
            multiline
            placeholder="Street address"
          />
        );
      },
    },
    {
      key: "clinicalEntity",
      label: "Clinical Entity",
      render: ({ rec, editMode, save }) => (
        <TextCell
          value={rec.clinicalEntityName}
          onSave={(v) => save({ clinicalEntityName: v })}
          editable={editMode}
          placeholder="e.g. Brooks Paine PLLC 2"
        />
      ),
    },
    {
      key: "leaseTerm",
      label: "Lease Term & Options",
      render: (p) => <LeaseTermOptionsCell {...p} />,
    },
    {
      key: "squareFootage",
      label: "Square Footage",
      render: ({ rec, editMode, save }) => (
        <NumberCell
          value={rec.squareFootage}
          onSave={(v) => save({ squareFootage: v })}
          editable={editMode}
          format="int"
        />
      ),
    },
    {
      key: "baseRent",
      label: "Base Rent & Escalator",
      render: (p) => <BaseRentEscalatorCell {...p} />,
    },
    {
      key: "freeRent",
      label: "Free Rent (months)",
      render: ({ rec, editMode, save }) => (
        <NumberCell
          value={rec.freeRentMonths}
          onSave={(v) => save({ freeRentMonths: v })}
          editable={editMode}
          format="int"
        />
      ),
    },
    {
      key: "cam",
      label: "CAM per SF & Cap Structure",
      render: (p) => <CamCell {...p} />,
    },
    {
      key: "tiAllowance",
      label: "TI Allowance per SF",
      render: ({ rec, editMode, save }) => (
        <NumberCell
          value={rec.tiAllowancePerSf}
          onSave={(v) => save({ tiAllowancePerSf: v })}
          editable={editMode}
          format="currency"
          step="0.01"
        />
      ),
    },
    {
      key: "tiTotal",
      label: "TI Allowance Total",
      render: (p) => <TiTotalCell {...p} />,
    },
    {
      key: "deliveryCondition",
      label: "Delivery Condition",
      render: ({ rec, editMode, save }) => (
        <TextCell
          value={rec.deliveryCondition}
          onSave={(v) => save({ deliveryCondition: v })}
          editable={editMode}
          multiline
          placeholder='e.g. "Cold dark shell"'
        />
      ),
    },
    {
      key: "rcdTimeline",
      label: "Rent Commencement Timeline",
      render: ({ rec, editMode, save }) => (
        <TextCell
          value={rec.rcdTimelineText}
          onSave={(v) => save({ rcdTimelineText: v })}
          editable={editMode}
          placeholder="e.g. 180 days after delivery"
        />
      ),
    },
    {
      key: "guarantors",
      label: "Personal Guarantors",
      render: (p) => <GuarantorsCell {...p} />,
    },
    {
      key: "guarantorExposure",
      label: "Guarantor Exposure",
      render: ({ rec, editMode, save }) => (
        <NumberCell
          value={rec.guarantorExposureAmount}
          onSave={(v) => save({ guarantorExposureAmount: v })}
          editable={editMode}
          format="currency"
          step="0.01"
        />
      ),
    },
    {
      key: "liabilityCap",
      label: "Liability Cap",
      render: ({ rec, editMode, save }) => (
        <TextCell
          value={rec.liabilityCapText}
          onSave={(v) => save({ liabilityCapText: v })}
          editable={editMode}
          placeholder="e.g. 12 months' rent or $250,000"
        />
      ),
    },
    {
      key: "permittedUse",
      label: "Permitted Use",
      render: ({ rec, editMode, save }) => (
        <TextCell
          value={rec.permittedUse}
          onSave={(v) => save({ permittedUse: v })}
          editable={editMode}
          multiline
        />
      ),
    },
    {
      key: "exclusivity",
      label: "Exclusivity Scope",
      render: ({ rec, editMode, save }) => (
        <TextCell
          value={rec.exclusivityScope}
          onSave={(v) => save({ exclusivityScope: v })}
          editable={editMode}
          multiline
        />
      ),
    },
    {
      key: "signage",
      label: "Signage Rights",
      render: (p) => <SignageCell {...p} />,
    },
    {
      key: "executionDate",
      label: "Lease Execution Date",
      render: ({ rec, editMode, save }) => (
        <DateCell
          value={rec.leaseExecutionDate}
          onSave={(v) => save({ leaseExecutionDate: v })}
          editable={editMode}
        />
      ),
    },
    {
      key: "deliveryDate",
      label: "Anticipated Delivery Date",
      render: ({ rec, editMode, save }) => (
        <DateCell
          value={rec.anticipatedDeliveryDate}
          onSave={(v) => save({ anticipatedDeliveryDate: v })}
          editable={editMode}
        />
      ),
    },
    {
      key: "rcd",
      label: "Rent Commencement Date",
      render: ({ rec, editMode, save }) => (
        <DateCell
          value={rec.rentCommencementDate}
          onSave={(v) => save({ rentCommencementDate: v })}
          editable={editMode}
        />
      ),
    },
    {
      key: "expirationDate",
      label: "Lease Expiration Date",
      render: (p) => <LeaseExpirationCell {...p} />,
    },
    {
      key: "renewalDeadline",
      label: "Option Renewal Deadline",
      render: ({ rec, editMode, save }) => (
        <DateCell
          value={rec.optionRenewalDeadline}
          onSave={(v) => save({ optionRenewalDeadline: v })}
          editable={editMode}
        />
      ),
    },
    {
      key: "dnrDeadline",
      label: "DNR Permit Contingency Deadline",
      render: ({ rec, editMode, save }) => (
        <DateCell
          value={rec.dnrPermitContingencyDeadline}
          onSave={(v) => save({ dnrPermitContingencyDeadline: v })}
          editable={editMode}
        />
      ),
    },
    {
      key: "documents",
      label: "Documents",
      isDocs: true,
      render: ({ rec, org, editMode }) => (
        <DocumentsCell
          rec={rec}
          org={org}
          editMode={editMode}
          onOpen={() => openDocsFor(rec)}
        />
      ),
    },
    {
      key: "notes",
      label: "General Notes",
      render: ({ rec, editMode, save }) => (
        <TextCell
          value={rec.generalNotes}
          onSave={(v) => save({ generalNotes: v })}
          editable={editMode}
          multiline
          placeholder="Anything else worth comparing"
        />
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Column header with date alerts
// ---------------------------------------------------------------------------

function ColumnHeader({
  rec,
  org,
}: {
  rec: LeaseRecord;
  org: Organization | undefined;
}) {
  const alerts = buildAlerts(rec);
  const visible = alerts.slice(0, 2);
  const hiddenCount = alerts.length - visible.length;
  const name = rec.locationNameOverride ?? org?.name ?? "Untitled";

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      <div className="font-semibold text-[13px] text-[#0F2A47] truncate">
        {name}
      </div>
      <div className="text-[11px] text-slate-400 truncate">
        {org?.city && org?.state ? `${org.city}, ${org.state}` : "—"}
      </div>
      {alerts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {visible.map((a) => (
            <span
              key={a.field}
              title={`${a.label} approaching or past due`}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${ALERT_STYLES[a.severity]}`}
            >
              <AlertCircle className="h-2.5 w-2.5" />
              {a.label}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span
              className="text-[10px] text-slate-500 font-medium"
              title={alerts
                .slice(2)
                .map((a) => `${a.label} (${a.severity})`)
                .join(", ")}
            >
              +{hiddenCount} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function LeaseMatrix({ embedded = false }: { embedded?: boolean } = {}) {
  const { activeUser } = useActiveUser();
  const [editMode, setEditMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(EDIT_MODE_LS_KEY) === "1";
  });
  const [docsOpenFor, setDocsOpenFor] = useState<LeaseRecord | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EDIT_MODE_LS_KEY, editMode ? "1" : "0");
  }, [editMode]);

  const recordsQuery = useQuery({
    queryKey: getListLeaseRecordsQueryKey(),
    queryFn: () => listLeaseRecords(),
  });

  const orgsQuery = useQuery({
    queryKey: getListOrganizationsQueryKey(),
    queryFn: () => listOrganizations(),
  });

  const saver = useFieldSaver();

  const records = recordsQuery.data ?? [];
  const orgs = orgsQuery.data ?? [];
  const orgsById = useMemo(
    () => new Map(orgs.map((o) => [o.id, o])),
    [orgs],
  );

  // Only show records whose organization is in the EDGE/UD cohort
  // (extra defense; the API only seeds these but a manual insert could
  // attach a record to "edge_dso").
  const visible = records.filter((r) => {
    const org = orgsById.get(r.organizationId);
    return (
      org && (SEED_CATEGORIES as readonly string[]).includes(org.category ?? "")
    );
  });

  // Pre-fetch document counts so the header badge is hot when the user
  // opens a column.
  useQueries({
    queries: visible.map((r) => ({
      queryKey: getListLeaseDocumentsQueryKey(r.id),
      queryFn: () => listLeaseDocuments(r.id),
    })),
  });

  const rows = useMemo(
    () => makeRows((rec) => setDocsOpenFor(rec)),
    [],
  );

  return (
    <div className={embedded ? "space-y-4" : "p-6 space-y-4"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          {!embedded && (
            <h1 className="text-2xl font-semibold text-[#0F2A47]">
              Lease Comparison Matrix
            </h1>
          )}
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Side-by-side comparison of key lease terms across every EDGE and
            UD location. Locations are columns; lease fields are rows. Edit
            mode lets you click any cell to update its value.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="lease-matrix-edit-mode" className="text-sm text-slate-600">
            {editMode ? "Edit mode" : "Read-only"}
          </Label>
          <Switch
            id="lease-matrix-edit-mode"
            checked={editMode}
            onCheckedChange={setEditMode}
          />
        </div>
      </div>

      {recordsQuery.isLoading || orgsQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="border border-slate-200 rounded-lg p-12 text-center">
          <div className="text-slate-500">
            No EDGE or UD locations found. Add a location in the EDGE
            directory and it will appear here automatically.
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="border-collapse w-max min-w-full">
              <thead className="sticky top-0 z-20 bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-100 border-r border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500 px-3 py-3 w-56 min-w-56">
                    Lease Field
                  </th>
                  {visible.map((rec) => (
                    <th
                      key={rec.id}
                      className="border-r border-b border-slate-200 bg-slate-50 align-top w-64 min-w-64"
                    >
                      <ColumnHeader
                        rec={rec}
                        org={orgsById.get(rec.organizationId)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                  >
                    <td
                      className={`sticky left-0 z-10 border-r border-b border-slate-200 text-[12px] font-medium text-slate-600 px-3 py-2 align-top w-56 min-w-56 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      {row.label}
                    </td>
                    {visible.map((rec) => (
                      <td
                        key={rec.id}
                        className="border-r border-b border-slate-200 align-top w-64 min-w-64 p-0"
                      >
                        {row.render({
                          rec,
                          org: orgsById.get(rec.organizationId),
                          editMode,
                          save: (patch) =>
                            saver.mutate({ id: rec.id, patch }),
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {docsOpenFor && (
        <DocumentsPanel
          open={!!docsOpenFor}
          onOpenChange={(o) => {
            if (!o) setDocsOpenFor(null);
          }}
          leaseRecordId={docsOpenFor.id}
          locationName={
            docsOpenFor.locationNameOverride ??
            orgsById.get(docsOpenFor.organizationId)?.name ??
            "Untitled"
          }
          readOnly={!editMode}
          uploadedByName={activeUser.name || undefined}
        />
      )}
    </div>
  );
}

export default LeaseMatrix;

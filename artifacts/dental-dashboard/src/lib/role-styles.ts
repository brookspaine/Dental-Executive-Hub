// Shared color tokens for the My Role module so the index, detail, and
// playbook pages share a consistent Business Area palette.

export const BUSINESS_AREAS = [
  "Location",
  "Financials",
  "People",
  "Operations",
] as const;

export type BusinessArea = (typeof BUSINESS_AREAS)[number];

export const TIERS = [
  "Leadership",
  "Clinical",
  "Operations Support",
] as const;

export type Tier = (typeof TIERS)[number];

export const PLAYBOOK_CATEGORIES = [
  "Clinical Procedure",
  "Patient Communication",
  "Operational Process",
  "Compliance",
  "Emergency Response",
] as const;

export const DECISION_CATEGORIES = [
  "Clinical",
  "Operational",
  "Financial",
  "People",
] as const;

export const AUTHORITY_LEVELS = [
  "Decide & Act",
  "Decide & Inform",
  "Recommend Only",
  "Escalate",
] as const;

export const KPI_FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly"] as const;

export type AreaStyle = {
  bar: string;
  tint: string;
  ring: string;
  label: string;
  pill: string;
  softBg: string;
  border: string;
  text: string;
};

export const AREA_STYLES: Record<BusinessArea, AreaStyle> = {
  Location: {
    bar: "bg-blue-500",
    tint: "bg-blue-50/40",
    ring: "border-blue-200",
    label: "text-blue-900",
    pill: "bg-blue-100 text-blue-800",
    softBg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
  },
  Financials: {
    bar: "bg-emerald-500",
    tint: "bg-emerald-50/40",
    ring: "border-emerald-200",
    label: "text-emerald-900",
    pill: "bg-emerald-100 text-emerald-800",
    softBg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
  },
  People: {
    bar: "bg-violet-500",
    tint: "bg-violet-50/40",
    ring: "border-violet-200",
    label: "text-violet-900",
    pill: "bg-violet-100 text-violet-800",
    softBg: "bg-violet-50",
    border: "border-violet-300",
    text: "text-violet-700",
  },
  Operations: {
    bar: "bg-orange-500",
    tint: "bg-orange-50/40",
    ring: "border-orange-200",
    label: "text-orange-900",
    pill: "bg-orange-100 text-orange-800",
    softBg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
  },
};

export function isBusinessArea(value: string): value is BusinessArea {
  return (BUSINESS_AREAS as readonly string[]).includes(value);
}

export function areaStyle(area: string): AreaStyle {
  return isBusinessArea(area) ? AREA_STYLES[area] : AREA_STYLES.Operations;
}

import {
  pgTable,
  text,
  serial,
  integer,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

/**
 * One row per EDGE/UD location. Holds every lease-comparison field as a
 * separate column — consolidated multi-part display (e.g. "Lease Term &
 * Options" or "Signage Rights") is purely a presentation concern in the UI.
 *
 * Auto-calculated fields (TI Allowance Total, Lease Expiration Date) are
 * stored as nullable *_override columns. The matrix shows the calculated
 * value when the override is null, and the override when it isn't.
 */
export const leaseRecordsTable = pgTable(
  "lease_records",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),

    // Header / identity
    locationNameOverride: text("location_name_override"),
    addressOverride: text("address_override"),
    clinicalEntityName: text("clinical_entity_name"),

    // Lease Term & Options (consolidated display, separate columns)
    initialLeaseTermYears: integer("initial_lease_term_years"),
    extensionOptionsCount: integer("extension_options_count"),
    extensionOptionLengthYears: integer("extension_option_length_years"),

    // Square footage
    squareFootage: integer("square_footage"),

    // Base Rent & Escalator (consolidated display)
    baseRentPerSf: real("base_rent_per_sf"),
    annualEscalatorPct: real("annual_escalator_pct"),

    // Free rent
    freeRentMonths: integer("free_rent_months"),

    // CAM (consolidated display)
    camPerSf: real("cam_per_sf"),
    camCapControllablePct: real("cam_cap_controllable_pct"),
    camCapUncontrollablePct: real("cam_cap_uncontrollable_pct"),

    // TI
    tiAllowancePerSf: real("ti_allowance_per_sf"),
    // null => use calculated value (squareFootage * tiAllowancePerSf)
    tiAllowanceTotalOverride: real("ti_allowance_total_override"),

    // Free-form text
    deliveryCondition: text("delivery_condition"),
    rcdTimelineText: text("rcd_timeline_text"),

    // Personal guarantors (multi-select stored as jsonb string array
    // containing any combination of "Brooks Paine", "Frank Alderman",
    // "Other"; "Other" reveals guarantorOtherText)
    personalGuarantors: jsonb("personal_guarantors").$type<string[]>(),
    guarantorOtherText: text("guarantor_other_text"),

    guarantorExposureAmount: real("guarantor_exposure_amount"),
    liabilityCapText: text("liability_cap_text"),

    permittedUse: text("permitted_use"),
    exclusivityScope: text("exclusivity_scope"),

    // Signage Rights (consolidated display) — yes/no/conditional/null
    signageBuildingMounted: text("signage_building_mounted"),
    signageMonument: text("signage_monument"),
    signagePylon: text("signage_pylon"),
    signageNotes: text("signage_notes"),

    // Dates (stored as ISO date strings — match existing app convention)
    leaseExecutionDate: text("lease_execution_date"),
    anticipatedDeliveryDate: text("anticipated_delivery_date"),
    rentCommencementDate: text("rent_commencement_date"),
    // null => calculated from execution + initial term
    leaseExpirationDateOverride: text("lease_expiration_date_override"),
    optionRenewalDeadline: text("option_renewal_deadline"),
    dnrPermitContingencyDeadline: text("dnr_permit_contingency_deadline"),

    generalNotes: text("general_notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // One lease record per organization
    organizationIdUniq: uniqueIndex("lease_records_organization_id_uniq").on(
      table.organizationId,
    ),
  }),
);

export type LeaseRecordRow = typeof leaseRecordsTable.$inferSelect;

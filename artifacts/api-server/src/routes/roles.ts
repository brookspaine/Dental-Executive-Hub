import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import {
  db,
  rolesTable,
  type RoleChecklists,
  type RoleDecision,
} from "@workspace/db";
import {
  CreateRoleBody,
  UpdateRoleBody,
  UpdateRoleParams,
  ListRolesResponse,
  UpdateRoleResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Seeding — three starter roles so the page renders meaningfully on first
// visit. Inserted under an advisory lock so concurrent boots don't double
// seed.
// ---------------------------------------------------------------------------

type SeedRole = {
  title: string;
  seatHolderName: string;
  seatHolderInitials: string;
  businessArea: string;
  tier: string;
  purposeStatement: string;
  missionAlignment: string;
  culturalAlignment: string;
  vegStyleImpact: string;
  keyResultsArea: string[];
  checklists: RoleChecklists;
  decisions: RoleDecision[];
};

const SEED_ROLES: SeedRole[] = [
  // -------------------- Lead Emergency Dentist --------------------
  {
    title: "Associate Dentist",
    seatHolderName: "Open",
    seatHolderInitials: "",
    businessArea: "Operations",
    tier: "Clinical",
    purposeStatement:
      "The Lead Emergency Dentist is the clinical anchor of EDGE. This role exists to deliver same-day relief for patients in dental pain, hold the standard for emergency-first clinical excellence, and mentor the next generation of EDGE doctors on the partner track.",
    missionAlignment:
      "EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Lead Dentist personally embodies this mission every shift — every walk-in seen, every diagnosis confirmed under pressure, every honest treatment plan presented advances it.",
    culturalAlignment:
      "Lives the EDGE Cultural Code daily: \"Patient first, ego last,\" \"Move at the speed of pain,\" and \"Teach what you know.\" The Lead Dentist's tone in the operatory sets the tone for the whole team.",
    vegStyleImpact:
      "Every emergency patient walks in scared and leaves understood. The Lead Dentist owns the warm handoff from front desk to chair, the calm explanation of options, and the unhurried treatment of patients who've been turned away elsewhere — the experience traditional dental practices simply do not offer.",
    keyResultsArea: [
      "Same-day emergency slots filled at >= 85% utilization.",
      "Treatment plans presented same-visit on >= 95% of completed exams.",
      "Case acceptance rate of >= 70% within 30 days of presentation.",
      "Production per clinical hour of >= $850.",
      "Patient NPS (post-visit) of >= 75.",
      ">= 5 chairside coaching touchpoints with associates per week.",
    ],
    checklists: {
      startOfDay: [
        { id: "s1", task: "Huddle with clinical team — review schedule, gaps, anticipated walk-ins.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s2", task: "Confirm operatories are stocked, sterilizers are ready, CBCT is up.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s3", task: "Review yesterday's open cases and call-back list.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s4", task: "Check pharmacy inventory for emergency medications.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s5", task: "Confirm associate(s) on schedule are oriented and ready.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
      ],
      downtime: [
        { id: "d1", task: "Review pending CBCT reads and finalize diagnoses.", estimatedMinutes: 15, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d2", task: "Call patients with pending treatment plans not yet accepted.", estimatedMinutes: 20, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d3", task: "Coach an associate through a recent case (15 min review).", estimatedMinutes: 15, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d4", task: "Update one playbook with anything you learned today.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d5", task: "Be visible at the front — back up Patient Coordinator with walk-in triage.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
      ],
      endOfDay: [
        { id: "e1", task: "Sign all chart notes from today's visits.", estimatedMinutes: 15, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e2", task: "Confirm tomorrow's schedule with Practice Manager.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e3", task: "Hand off any open emergencies to on-call protocol.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e4", task: "Confirm sterilizers run final cycle; CBCT powered down.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e5", task: "End-of-day text to associate(s) — one specific thing they did well.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
      ],
    },
    decisions: [
      {
        id: "dc1",
        decisionType: "Clinical treatment plan approval under $5,000",
        authorityLevel: "Decide & Act",
        escalationToRoleId: null,
        boundaryConditions: "Single-visit or short-course care under $5,000 total. Patient is medically stable.",
        linkedPlaybookId: null,
        category: "Clinical",
      },
      {
        id: "dc2",
        decisionType: "Emergency after-hours callout",
        authorityLevel: "Decide & Inform",
        escalationToRoleId: null,
        boundaryConditions: "Active facial swelling, uncontrolled bleeding, or trauma. Inform Practice Manager same day.",
        linkedPlaybookId: null,
        category: "Clinical",
      },
      {
        id: "dc3",
        decisionType: "Refer out to specialist (oral surgery / endo / perio)",
        authorityLevel: "Decide & Act",
        escalationToRoleId: null,
        boundaryConditions: "Case exceeds in-house clinical scope or equipment. Use approved specialist network.",
        linkedPlaybookId: null,
        category: "Clinical",
      },
      {
        id: "dc4",
        decisionType: "Comp / discount on a treatment plan",
        authorityLevel: "Recommend Only",
        escalationToRoleId: null,
        boundaryConditions: "Any discount over $250 — recommend to Practice Manager with rationale.",
        linkedPlaybookId: null,
        category: "Financial",
      },
      {
        id: "dc5",
        decisionType: "Send associate home early due to low volume",
        authorityLevel: "Escalate",
        escalationToRoleId: null,
        boundaryConditions: "Always escalate to Practice Manager — affects payroll and morale.",
        linkedPlaybookId: null,
        category: "People",
      },
    ],
  },
  // -------------------- Practice Manager --------------------
  {
    title: "Office Manager",
    seatHolderName: "Open",
    seatHolderInitials: "",
    businessArea: "Operations",
    tier: "Operations Support",
    purposeStatement:
      "The Practice Manager runs the operating system of the practice so that clinical can focus on clinical. This role exists to remove friction from every patient encounter and every team workflow.",
    missionAlignment:
      "Operational excellence is what lets EDGE deliver on its emergency-first promise — the Practice Manager is the multiplier that turns clinical talent into a scalable practice.",
    culturalAlignment:
      "Embodies \"Make the right thing the easy thing\" and \"Own the outcome.\" The Practice Manager is the most accountable seat in the building.",
    vegStyleImpact:
      "Patients feel a calm, well-run practice from check-in to checkout. Team members know their schedule, their role, and who has their back.",
    keyResultsArea: [
      "Morning huddle held 100% of operating days with full team present.",
      ">= 10 open A/R follow-ups closed per day.",
      "Schedule-block utilization (next 7 days) at >= 85%.",
      "Collections rate of >= 96% of production each month.",
      "Voluntary team turnover <= 15% over rolling 12 months.",
      "Average patient wait time (check-in to seated) <= 12 minutes.",
    ],
    checklists: {
      startOfDay: [
        { id: "s1", task: "Lead morning huddle.", estimatedMinutes: 15, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s2", task: "Confirm staffing for the day; cover gaps.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s3", task: "Review production goal vs. schedule.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s4", task: "Walk the building — operatories, lobby, sterilization.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
      ],
      downtime: [
        { id: "d1", task: "Make follow-up calls on unpaid balances.", estimatedMinutes: 30, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d2", task: "Review next week's schedule for gaps to fill.", estimatedMinutes: 20, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d3", task: "Check inventory levels and reorder as needed.", estimatedMinutes: 15, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d4", task: "1-on-1 with one team member — listen first.", estimatedMinutes: 30, linkedPlaybookId: null, linkedDecisionId: null },
      ],
      endOfDay: [
        { id: "e1", task: "Reconcile day's collections and deposits.", estimatedMinutes: 20, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e2", task: "Review tomorrow's schedule with Lead Dentist.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e3", task: "Confirm overnight on-call coverage.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e4", task: "Lock up; arm security; confirm sterilizers complete.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
      ],
    },
    decisions: [
      {
        id: "dc1",
        decisionType: "Supply reorder below $1,000 threshold",
        authorityLevel: "Decide & Act",
        escalationToRoleId: null,
        boundaryConditions: "Approved vendor list. Single PO under $1,000.",
        linkedPlaybookId: null,
        category: "Operational",
      },
      {
        id: "dc2",
        decisionType: "Schedule changes & cover for call-outs",
        authorityLevel: "Decide & Inform",
        escalationToRoleId: null,
        boundaryConditions: "Within posted scheduling guidelines; inform Lead Dentist by end of day.",
        linkedPlaybookId: null,
        category: "Operational",
      },
      {
        id: "dc3",
        decisionType: "Comp / discount up to $500",
        authorityLevel: "Decide & Act",
        escalationToRoleId: null,
        boundaryConditions: "Documented patient-experience reason; logged in PMS.",
        linkedPlaybookId: null,
        category: "Financial",
      },
      {
        id: "dc4",
        decisionType: "Hire / fire decisions",
        authorityLevel: "Recommend Only",
        escalationToRoleId: null,
        boundaryConditions: "Always recommend to ownership with documentation.",
        linkedPlaybookId: null,
        category: "People",
      },
    ],
  },
  // -------------------- Front Desk / Patient Coordinator --------------------
  {
    title: "Front Desk",
    seatHolderName: "Open",
    seatHolderInitials: "",
    businessArea: "People",
    tier: "Operations Support",
    purposeStatement:
      "The Patient Coordinator is the first human a patient in pain talks to. This role exists to convert a scared phone call into a confident, on-the-schedule appointment — and to make sure every patient leaves understood, paid up, and rebooked when needed.",
    missionAlignment:
      "EDGE's mission lives or dies at the front desk. A patient turned away by tone or by clumsy scheduling is a patient who tells ten others EDGE is just like every other practice.",
    culturalAlignment:
      "Embodies \"Patient first, ego last\" and \"Speed of pain.\" Answers every call within three rings; never lets a walk-in stand for more than 30 seconds without acknowledgement.",
    vegStyleImpact:
      "Every patient is greeted by name when possible, walked back personally, and given a clear, written summary of next steps before they leave. The lobby never feels like a waiting room — it feels like a host station.",
    keyResultsArea: [
      ">= 95% of inbound calls answered within 3 rings during open hours.",
      ">= 80% of pain-related calls converted to a same-day appointment.",
      ">= 90% of patients leave with a follow-up appointment booked.",
      "Patient lobby NPS of >= 80.",
      "Insurance verified for 100% of next-day patients before end of business.",
    ],
    checklists: {
      startOfDay: [
        { id: "s1", task: "Open phone lines; check overnight voicemail and triage.", estimatedMinutes: 15, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s2", task: "Confirm today's appointments; send any missing reminders.", estimatedMinutes: 15, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s3", task: "Lobby reset — water, magazines, music, scent.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "s4", task: "Print day sheets for clinical team.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
      ],
      downtime: [
        { id: "d1", task: "Confirm appointments for next 48 hours.", estimatedMinutes: 30, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d2", task: "Recall list — call patients overdue for follow-up.", estimatedMinutes: 30, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d3", task: "Verify insurance for tomorrow's patients.", estimatedMinutes: 30, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "d4", task: "Restock front-desk supplies; confirm card reader.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
      ],
      endOfDay: [
        { id: "e1", task: "Reconcile day's payments; close drawer.", estimatedMinutes: 20, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e2", task: "Forward phones to on-call line.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e3", task: "Email tomorrow's schedule to clinical team.", estimatedMinutes: 5, linkedPlaybookId: null, linkedDecisionId: null },
        { id: "e4", task: "Lobby reset for tomorrow morning.", estimatedMinutes: 10, linkedPlaybookId: null, linkedDecisionId: null },
      ],
    },
    decisions: [
      {
        id: "dc1",
        decisionType: "Schedule a same-day emergency walk-in",
        authorityLevel: "Decide & Act",
        escalationToRoleId: null,
        boundaryConditions: "Open clinical slot exists; patient symptoms match emergency criteria.",
        linkedPlaybookId: null,
        category: "Operational",
      },
      {
        id: "dc2",
        decisionType: "Waive small balance under $50",
        authorityLevel: "Decide & Inform",
        escalationToRoleId: null,
        boundaryConditions: "Goodwill / patient-experience reason. Inform Practice Manager same day.",
        linkedPlaybookId: null,
        category: "Financial",
      },
      {
        id: "dc3",
        decisionType: "Reschedule a doctor's appointment block",
        authorityLevel: "Recommend Only",
        escalationToRoleId: null,
        boundaryConditions: "Always recommend to Practice Manager.",
        linkedPlaybookId: null,
        category: "Operational",
      },
    ],
  },
];

const SEED_PLAYBOOKS = [
  {
    title: "How to Take a CBCT",
    category: "Clinical Procedure",
    purpose:
      "Standardize cone-beam CT capture so every scan is diagnostic on the first attempt and patient exposure is minimized.",
    whenToUse:
      "Indicated for endodontic evaluation, implant planning, impacted-tooth assessment, or any case where 2D imaging is insufficient.",
    decisionPoints:
      "If patient cannot stabilize for the scan, reschedule rather than re-shoot. If image shows pathology outside the field of view, expand FOV with Lead Dentist approval.",
    commonPitfalls:
      "Patient motion blur from poor positioning; failing to remove all metal artifacts; forgetting to log the exposure in the patient chart.",
  },
  {
    title: "How to Present a Tx Plan",
    category: "Patient Communication",
    purpose:
      "Deliver treatment plans in a way that builds trust, sets honest expectations, and earns same-visit acceptance.",
    whenToUse:
      "After every diagnostic exam where treatment is recommended.",
    decisionPoints:
      "If the patient hesitates on cost, offer phased treatment before discounting. If the patient asks for a second opinion, support it without defensiveness.",
    commonPitfalls:
      "Leading with price instead of problem; using clinical jargon the patient cannot follow; failing to write down what was discussed for the patient to take home.",
  },
];

let seedAttempted = false;

export async function ensureSeeded(): Promise<void> {
  if (seedAttempted) return;
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('roles_playbooks_seed'))`,
    );

    const existingRoles = await tx
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .limit(1);

    if (existingRoles.length === 0) {
      await tx.insert(rolesTable).values(
        SEED_ROLES.map((r) => ({
          ...r,
          lastReviewedAt: new Date(),
        })),
      );
    }

    // Seed playbooks via raw SQL to avoid pulling playbooksTable into this
    // route's import surface — they live in a sibling route file. Linking
    // to the freshly seeded clinical role happens after both are present.
    const existingPlaybooks = await tx.execute(
      sql`SELECT id FROM playbooks LIMIT 1`,
    );
    if ((existingPlaybooks.rows as unknown[]).length === 0) {
      // Find the Lead Emergency Dentist role to link the seed playbooks to.
      const leadRows = await tx
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(eq(rolesTable.title, "Lead Emergency Dentist"))
        .limit(1);
      const leadRoleId = leadRows[0]?.id ?? null;
      const linkedRoles = leadRoleId !== null ? [leadRoleId] : [];
      for (const pb of SEED_PLAYBOOKS) {
        await tx.execute(sql`
          INSERT INTO playbooks (
            title, category, purpose, when_to_use, steps,
            decision_points, common_pitfalls, related_playbook_ids,
            role_ids, last_reviewed_by, last_reviewed_at
          ) VALUES (
            ${pb.title}, ${pb.category}, ${pb.purpose}, ${pb.whenToUse},
            '[]'::jsonb, ${pb.decisionPoints}, ${pb.commonPitfalls},
            '[]'::jsonb, ${JSON.stringify(linkedRoles)}::jsonb,
            'EDGE Clinical Lead', NOW()
          )
        `);
      }
    }
  });
  seedAttempted = true;
}

function serializeRow(row: typeof rolesTable.$inferSelect) {
  return {
    ...row,
    reportsToRoleId: row.reportsToRoleId ?? null,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/roles", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const items = await db
    .select()
    .from(rolesTable)
    .orderBy(asc(rolesTable.id));
  res.json(ListRolesResponse.parse(items.map(serializeRow)));
});

router.get("/roles/:id", async (req, res): Promise<void> => {
  const params = UpdateRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, params.data.id))
    .limit(1);
  if (!item) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  res.json(UpdateRoleResponse.parse(serializeRow(item)));
});

router.post("/roles", async (req, res): Promise<void> => {
  const parsed = CreateRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [item] = await db
    .insert(rolesTable)
    .values({
      title: data.title,
      seatHolderName: data.seatHolderName ?? "Open",
      seatHolderInitials: data.seatHolderInitials ?? "",
      reportsToRoleId: data.reportsToRoleId ?? null,
      organizationId: data.organizationId ?? null,
      businessArea: data.businessArea,
      tier: data.tier,
      lastReviewedAt: new Date(),
    })
    .returning();
  res.status(201).json(UpdateRoleResponse.parse(serializeRow(item)));
});

router.patch("/roles/:id", async (req, res): Promise<void> => {
  const params = UpdateRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  // Strip undefined keys so partial updates don't blank out unrelated columns.
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }
  // Any edit bumps lastReviewedAt + updatedAt — the page header reads off it.
  updates.lastReviewedAt = new Date();
  updates.updatedAt = new Date();

  const [item] = await db
    .update(rolesTable)
    .set(updates)
    .where(eq(rolesTable.id, params.data.id))
    .returning();
  res.json(UpdateRoleResponse.parse(serializeRow(item)));
});

router.delete("/roles/:id", async (req, res): Promise<void> => {
  const params = UpdateRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .delete(rolesTable)
    .where(eq(rolesTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

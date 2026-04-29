import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const PLACEHOLDER_NAMES = new Set(
  ["", "open", "unassigned", "tbd", "n/a", "na", "—", "-"].map((s) =>
    s.toLowerCase(),
  ),
);

function isPlaceholder(name: string | null | undefined): boolean {
  if (!name) return true;
  return PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
}

function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, 3)
    .join("");
}

interface FoundOrCreated {
  id: number;
  created: boolean;
}

async function findOrCreateMember(
  client: Client,
  name: string,
  organizationId: number | null,
  role: string,
): Promise<FoundOrCreated> {
  const trimmed = name.trim();
  // Prefer match within the same organization, fall back to any.
  let { rows } = await client.query<{ id: number }>(
    `SELECT id FROM team_members
       WHERE LOWER(name) = LOWER($1)
         AND ($2::int IS NULL OR organization_id IS NULL OR organization_id = $2)
       ORDER BY (organization_id = $2) DESC NULLS LAST, id ASC
       LIMIT 1`,
    [trimmed, organizationId],
  );
  if (rows.length > 0) return { id: rows[0].id, created: false };

  ({ rows } = await client.query<{ id: number }>(
    `INSERT INTO team_members (name, role, email, organization_id, status)
       VALUES ($1, $2, $3, $4, 'invite_not_sent')
       RETURNING id`,
    [
      trimmed,
      role || "Team Member",
      `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}@placeholder.local`,
      organizationId,
    ],
  ));
  return { id: rows[0].id, created: true };
}

interface Stats {
  rolesUpdated: number;
  rolesSkipped: number;
  actionItemsUpdated: number;
  actionItemsSkipped: number;
  meetingMembersInserted: number;
  meetingMembersSkipped: number;
  membersCreated: number;
  membersMatched: number;
  ambiguous: string[];
}

async function backfillRoles(client: Client, stats: Stats): Promise<void> {
  const { rows } = await client.query<{
    id: number;
    seat_holder_name: string;
    organization_id: number | null;
    title: string;
  }>(
    `SELECT id, seat_holder_name, organization_id, title
       FROM roles
      WHERE seat_holder_id IS NULL`,
  );
  for (const row of rows) {
    if (isPlaceholder(row.seat_holder_name)) {
      stats.rolesSkipped++;
      continue;
    }
    const { id: memberId, created } = await findOrCreateMember(
      client,
      row.seat_holder_name,
      row.organization_id,
      row.title,
    );
    if (created) stats.membersCreated++;
    else stats.membersMatched++;
    await client.query(
      `UPDATE roles SET seat_holder_id = $1 WHERE id = $2`,
      [memberId, row.id],
    );
    stats.rolesUpdated++;
  }
}

async function backfillActionItems(client: Client, stats: Stats): Promise<void> {
  const { rows } = await client.query<{
    id: number;
    owner_name: string;
  }>(
    `SELECT id, owner_name
       FROM action_items
      WHERE owner_team_member_id IS NULL AND owner_name IS NOT NULL`,
  );
  for (const row of rows) {
    if (isPlaceholder(row.owner_name)) {
      stats.actionItemsSkipped++;
      continue;
    }
    const { id: memberId, created } = await findOrCreateMember(
      client,
      row.owner_name,
      null,
      "Team Member",
    );
    if (created) stats.membersCreated++;
    else stats.membersMatched++;
    await client.query(
      `UPDATE action_items SET owner_team_member_id = $1 WHERE id = $2`,
      [memberId, row.id],
    );
    stats.actionItemsUpdated++;
  }
}

async function backfillMeetingSeriesMembers(
  client: Client,
  stats: Stats,
): Promise<void> {
  const { rows } = await client.query<{
    id: number;
    members: unknown;
  }>(`SELECT id, members FROM meeting_series`);
  for (const row of rows) {
    const raw = row.members;
    const memberNames = Array.isArray(raw)
      ? (raw as unknown[]).map(String).filter(Boolean)
      : [];
    let position = 0;
    for (const name of memberNames) {
      if (isPlaceholder(name)) continue;
      const { id: memberId, created } = await findOrCreateMember(
        client,
        name,
        null,
        "Team Member",
      );
      if (created) stats.membersCreated++;
      else stats.membersMatched++;
      const { rowCount } = await client.query(
        `INSERT INTO meeting_series_members (series_id, team_member_id, position)
           VALUES ($1, $2, $3)
           ON CONFLICT (series_id, team_member_id) DO NOTHING`,
        [row.id, memberId, position],
      );
      if (rowCount && rowCount > 0) {
        stats.meetingMembersInserted++;
      } else {
        stats.meetingMembersSkipped++;
      }
      position++;
    }
  }
}

async function findAmbiguousNames(client: Client, stats: Stats): Promise<void> {
  const { rows } = await client.query<{ name: string; n: string }>(
    `SELECT name, COUNT(*)::text AS n
       FROM team_members
      GROUP BY name
     HAVING COUNT(*) > 1`,
  );
  for (const r of rows) {
    stats.ambiguous.push(`${r.name} (${r.n} rows)`);
  }
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const stats: Stats = {
    rolesUpdated: 0,
    rolesSkipped: 0,
    actionItemsUpdated: 0,
    actionItemsSkipped: 0,
    meetingMembersInserted: 0,
    meetingMembersSkipped: 0,
    membersCreated: 0,
    membersMatched: 0,
    ambiguous: [],
  };
  try {
    await client.query("BEGIN");
    await backfillRoles(client, stats);
    await backfillActionItems(client, stats);
    await backfillMeetingSeriesMembers(client, stats);
    await findAmbiguousNames(client, stats);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ Backfill failed; rolled back.", err);
    process.exitCode = 1;
    await client.end();
    return;
  }
  await client.end();

  console.log("Backfill complete.");
  console.log(`  Roles updated:               ${stats.rolesUpdated}`);
  console.log(`  Roles skipped (placeholder): ${stats.rolesSkipped}`);
  console.log(`  Action items updated:        ${stats.actionItemsUpdated}`);
  console.log(`  Action items skipped:        ${stats.actionItemsSkipped}`);
  console.log(`  Meeting members inserted:    ${stats.meetingMembersInserted}`);
  console.log(`  Meeting members already set: ${stats.meetingMembersSkipped}`);
  console.log(`  Team members created:        ${stats.membersCreated}`);
  console.log(`  Team members matched:        ${stats.membersMatched}`);
  if (stats.ambiguous.length > 0) {
    console.log(`  Ambiguous names (review):`);
    for (const a of stats.ambiguous) console.log(`    - ${a}`);
  }
  // Mark unused alias to satisfy linters.
  void initialsFor;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

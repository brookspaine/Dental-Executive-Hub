import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function tableExists(client: Client, name: string): Promise<boolean> {
  const { rows } = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
    [name],
  );
  return rows.length > 0;
}

async function columnExists(
  client: Client,
  table: string,
  column: string,
): Promise<boolean> {
  const { rows } = await client.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2",
    [table, column],
  );
  return rows.length > 0;
}

async function renameTableIfExists(
  client: Client,
  from: string,
  to: string,
): Promise<void> {
  if (await tableExists(client, from)) {
    if (await tableExists(client, to)) {
      console.log(`  ! Both ${from} and ${to} exist — leaving alone`);
      return;
    }
    await client.query(`ALTER TABLE ${from} RENAME TO ${to}`);
    console.log(`  - Renamed table ${from} → ${to}`);
  } else if (await tableExists(client, to)) {
    console.log(`  = ${to} already renamed`);
  } else {
    console.log(`  ? Neither ${from} nor ${to} exists — skipping`);
  }
}

async function renameColumnIfExists(
  client: Client,
  table: string,
  from: string,
  to: string,
): Promise<void> {
  if (!(await tableExists(client, table))) {
    console.log(`  ? Table ${table} missing — skipping column rename ${from} → ${to}`);
    return;
  }
  const hasFrom = await columnExists(client, table, from);
  const hasTo = await columnExists(client, table, to);
  if (hasFrom && !hasTo) {
    await client.query(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
    console.log(`  - Renamed ${table}.${from} → ${to}`);
  } else if (hasTo) {
    console.log(`  = ${table}.${to} already renamed`);
  } else {
    console.log(`  ? ${table} has neither column ${from} nor ${to}`);
  }
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Renaming direct_reports → team_members (idempotent)…");
  try {
    await client.query("BEGIN");

    await renameTableIfExists(client, "direct_reports", "team_members");
    await renameTableIfExists(
      client,
      "direct_report_view_as_me_grants",
      "team_member_view_as_me_grants",
    );
    await renameTableIfExists(
      client,
      "direct_report_additional_viewers",
      "team_member_additional_viewers",
    );

    await renameColumnIfExists(
      client,
      "team_member_view_as_me_grants",
      "direct_report_id",
      "team_member_id",
    );
    await renameColumnIfExists(
      client,
      "team_member_view_as_me_grants",
      "grantee_report_id",
      "grantee_team_member_id",
    );
    await renameColumnIfExists(
      client,
      "team_member_additional_viewers",
      "direct_report_id",
      "team_member_id",
    );
    await renameColumnIfExists(
      client,
      "team_member_additional_viewers",
      "viewer_report_id",
      "viewer_team_member_id",
    );

    await client.query("COMMIT");
    console.log("✓ Rename complete (transaction committed).");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ Rename failed; rolled back.", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

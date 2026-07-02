import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env["DATABASE_URL"]) {
  logger.error(
    { missing: "DATABASE_URL" },
    "DATABASE_URL is required. In Railway: add it as a reference variable pointing to the Postgres plugin.",
  );
  process.exit(1);
}

// Both app and startupMigrations transitively import @workspace/db, which
// throws at module-load time when DATABASE_URL is absent. Dynamic imports
// here keep that throw unreachable until after the env-var check above.
const [{ default: app }, { runStartupMigrations }] = await Promise.all([
  import("./app"),
  import("./lib/startupMigrations"),
]);

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");

  // Run migrations after the port is bound so the healthcheck can
  // respond while migrations execute. A migration failure exits the process.
  runStartupMigrations()
    .then(() => {
      logger.info("Startup migrations complete");
    })
    .catch((err) => {
      logger.error({ err }, "Startup migrations failed — aborting boot");
      process.exit(1);
    });
});

server.on("error", (err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});

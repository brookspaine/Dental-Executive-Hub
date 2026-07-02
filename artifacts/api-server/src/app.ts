import path from "path";
import fs from "fs";
import express, { type Express, type Request } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./lib/auth";

const app: Express = express();

const allowedOriginSuffixes = [".replit.dev", ".replit.app", ".repl.co", ".railway.app", ".up.railway.app"];

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, cb) {
    // Same-origin browser requests have no Origin header — always allow.
    if (!origin) return cb(null, true);
    try {
      const { hostname } = new URL(origin);
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        allowedOriginSuffixes.some((suffix) => hostname.endsWith(suffix))
      ) {
        return cb(null, true);
      }
    } catch {
      // Fall through and deny on malformed origins.
    }
    // Reject by omitting CORS headers; the browser will block the
    // response for the cross-origin caller without leaking a stack trace.
    return cb(null, false);
  },
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Routes that are intentionally reachable without a signed-in user.
 * Everything else under `/api` is gated by `requireAuth` below. Keep this
 * list as small as possible — each entry is essentially a hole in the
 * privacy boundary around practice data.
 *
 * Patterns are matched against `req.path` *relative to /api* (so the
 * `/api` prefix is omitted here).
 */
const PUBLIC_API_ROUTES: { method: string; pattern: RegExp }[] = [
  // Health probe used by deploy infra and uptime checks. We allow HEAD
  // as well as GET because many uptime services (and load balancers)
  // probe with HEAD to avoid pulling a body.
  { method: "GET", pattern: /^\/healthz\/?$/ },
  { method: "HEAD", pattern: /^\/healthz\/?$/ },
  // Public assets served from PUBLIC_OBJECT_SEARCH_PATHS. These are
  // unconditionally public by design (see routes/storage.ts).
  { method: "GET", pattern: /^\/storage\/public-objects\// },
  { method: "HEAD", pattern: /^\/storage\/public-objects\// },
  // Hub Capture MCP endpoint for Claude.ai's custom connector. It enforces
  // its own MCP_CAPTURE_TOKEN bearer check (see routes/mcp.ts) — the caller
  // is Claude.ai, not a signed-in browser.
  { method: "POST", pattern: /^\/mcp\/?$/ },
  { method: "GET", pattern: /^\/mcp\/?$/ },
  { method: "DELETE", pattern: /^\/mcp\/?$/ },
];

function isPublicApiRoute(req: Request): boolean {
  return PUBLIC_API_ROUTES.some(
    (r) => r.method === req.method && r.pattern.test(req.path),
  );
}

app.use("/api", (req, res, next) => {
  if (isPublicApiRoute(req)) {
    next();
    return;
  }
  void requireAuth(req, res, next);
}, router);

// Serve the built dental-dashboard as a static SPA from this same process.
// This keeps the frontend and API on the same origin so Clerk session cookies
// work without any CORS dance. The path is relative to the compiled bundle
// (artifacts/api-server/dist/), so ../../dental-dashboard/dist/public resolves
// to artifacts/dental-dashboard/dist/public from the repo root.
const dashboardDist = path.resolve(__dirname, "../../dental-dashboard/dist/public");
if (fs.existsSync(dashboardDist)) {
  app.use(
    express.static(dashboardDist, {
      index: false,
      setHeaders(res, filePath) {
        if (/\.(js|css|woff2?|png|jpe?g|svg|gif|webp|avif|ico)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  const indexHtml = path.join(dashboardDist, "index.html");
  app.get(/.*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.sendFile(indexHtml);
  });
  logger.info({ dashboardDist }, "Serving dental-dashboard static files");
} else {
  logger.warn({ dashboardDist }, "dental-dashboard dist not found — frontend not served");
}

export default app;

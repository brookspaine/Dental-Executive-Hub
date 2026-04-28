import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

/**
 * The dental-dashboard frontend and this API are served from the same
 * Replit domain (the frontend at `/` and the API at `/api`), so genuine
 * browser traffic is same-origin and arrives without an `Origin` header.
 * We still need CORS configured because the same domain is used in
 * development (`*.replit.dev`) and production (the deployment domain),
 * and we want to keep the door open for those — but explicitly NOT for
 * arbitrary origins, since we send credentials (Clerk session cookies).
 */
const allowedOriginSuffixes = [".replit.dev", ".replit.app", ".repl.co"];

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

// Clerk proxy must run before body parsers — it streams raw bytes through
// to the Clerk frontend API.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;

import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { db, ccProjectsTable, ccTaskSectionsTable, ccTasksTable } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * Hub Capture — remote MCP endpoint for Claude.ai's custom connector.
 *
 * Exposes ONE write-only tool, `create_action_item`, which files an idea as
 * a real cc_task in the shared "Ideas" project (visible under both business
 * pills in the Command view). Deliberately no read/list tools: a leaked
 * bearer token can add ideas but never read practice data.
 *
 * Auth: `Authorization: Bearer <MCP_CAPTURE_TOKEN>` — this check is the real
 * gate (requireAuth is a permissive dev stub); the route is listed in
 * PUBLIC_API_ROUTES so that intent is explicit. Content policy: business/ops
 * ideas only, NO PHI (enforced by tool description; nothing clinical belongs
 * here).
 */
const router: IRouter = Router();

const APP_URL = "https://ceodashboard.up.railway.app/";
const IDEAS_PROJECT_NAME = "Ideas";
const IDEAS_SECTIONS = [
  { key: "edge", name: "EDGE" },
  { key: "urgent_dental", name: "Urgent Dental" },
  { key: "other", name: "Other" },
] as const;

/* ---- bearer auth -------------------------------------------------------- */

function tokenMatches(header: string | undefined): boolean {
  const expected = process.env["MCP_CAPTURE_TOKEN"];
  if (!expected) return false; // unset env -> endpoint always 401s
  if (!header?.startsWith("Bearer ")) return false;
  const presented = header.slice("Bearer ".length).trim();
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/* ---- rate limit: 30 requests per rolling minute -------------------------- */

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
let recentRequests: number[] = [];

function rateLimited(): boolean {
  const now = Date.now();
  recentRequests = recentRequests.filter((t) => now - t < RATE_WINDOW_MS);
  if (recentRequests.length >= RATE_LIMIT) return true;
  recentRequests.push(now);
  return false;
}

/* ---- Ideas project / section seeding (lazy, idempotent) ------------------ */

async function ensureIdeasContainers(): Promise<{
  projectId: number;
  sectionIds: Record<(typeof IDEAS_SECTIONS)[number]["key"], number>;
}> {
  let [project] = await db
    .select()
    .from(ccProjectsTable)
    .where(eq(ccProjectsTable.name, IDEAS_PROJECT_NAME));
  if (!project) {
    [project] = await db
      .insert(ccProjectsTable)
      .values({
        name: IDEAS_PROJECT_NAME,
        businessIds: [1, 2],
        sortOrder: 99,
      })
      .returning();
  }
  const existing = await db
    .select()
    .from(ccTaskSectionsTable)
    .where(
      sql`${ccTaskSectionsTable.parentType} = 'project' AND ${ccTaskSectionsTable.parentId} = ${project.id}`,
    )
    .orderBy(asc(ccTaskSectionsTable.sortOrder));
  const sectionIds = {} as Record<(typeof IDEAS_SECTIONS)[number]["key"], number>;
  for (const [idx, spec] of IDEAS_SECTIONS.entries()) {
    const found = existing.find((s) => s.name === spec.name);
    if (found) {
      sectionIds[spec.key] = found.id;
    } else {
      const [created] = await db
        .insert(ccTaskSectionsTable)
        .values({
          parentType: "project",
          parentId: project.id,
          name: spec.name,
          sortOrder: idx,
        })
        .returning();
      sectionIds[spec.key] = created.id;
    }
  }
  return { projectId: project.id, sectionIds };
}

/* ---- the tool ------------------------------------------------------------ */

const PRIORITY_MAP = { low: "low", normal: "medium", high: "high" } as const;

const createActionItemShape = {
  title: z.string().min(1).max(120).describe("Short action item title (<= 120 chars)"),
  detail: z.string().max(2000).optional().describe("Longer context or next steps"),
  priority: z
    .enum(["low", "normal", "high"])
    .optional()
    .describe("Urgency; omit when the user doesn't indicate one"),
  owner: z.string().max(80).optional().describe('Who owns it, e.g. "Brooks"'),
  kr_link: z.string().max(200).optional().describe("Objective/KR reference, free text"),
  source_ref: z.string().max(300).optional().describe("Brief conversation context"),
  business: z
    .enum(["edge", "urgent_dental", "other"])
    .optional()
    .describe(
      "Which business the idea belongs to — infer from conversation; omit or use 'other' when unclear",
    ),
};

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "dental-executive-hub", version: "1.0.0" });
  server.registerTool(
    "create_action_item",
    {
      description:
        "Create an action item (idea/task) in the Dental Executive Hub. Use when the " +
        "user asks to capture, save, or add an idea, task, or action item to their hub. " +
        "Business/ops content only — never include PHI or patient information. " +
        "Infer `business` (edge | urgent_dental) from the conversation; omit it when unclear.",
      inputSchema: createActionItemShape,
    },
    async (input) => {
      const { projectId, sectionIds } = await ensureIdeasContainers();
      const notes = [
        input.detail?.trim(),
        input.kr_link?.trim() ? `KR: ${input.kr_link.trim()}` : undefined,
        input.source_ref?.trim() ? `Context: ${input.source_ref.trim()}` : undefined,
        "Captured via Claude",
      ]
        .filter(Boolean)
        .join("\n");
      const [task] = await db
        .insert(ccTasksTable)
        .values({
          parentType: "project",
          parentId: projectId,
          sectionId: sectionIds[input.business ?? "other"],
          text: input.title.trim(),
          priority: input.priority ? PRIORITY_MAP[input.priority] : null,
          ownerName: input.owner?.trim() || null,
          nextSteps: notes,
        })
        .returning();
      logger.info({ taskId: task.id, business: input.business ?? "other" }, "mcp: action item captured");
      const result = { id: task.id, title: task.text, url: APP_URL };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    },
  );
  return server;
}

/* ---- transport (stateless: fresh server + transport per request) --------- */

router.post("/mcp", async (req: Request, res: Response): Promise<void> => {
  if (!tokenMatches(req.headers.authorization)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (rateLimited()) {
    res.status(429).json({ error: "rate limit exceeded (30/min)" });
    return;
  }
  try {
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error({ err }, "mcp: request failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "internal error" });
    }
  }
});

// Stateless mode needs only POST; be explicit for session-oriented clients.
router.get("/mcp", (_req, res) => {
  res.status(405).json({ error: "method not allowed — POST only (stateless)" });
});
router.delete("/mcp", (_req, res) => {
  res.status(405).json({ error: "method not allowed — POST only (stateless)" });
});

export default router;

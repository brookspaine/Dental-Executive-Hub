import express, { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, storedObjectsTable } from "@workspace/db";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";

/**
 * Postgres-backed object storage. The original implementation used Replit's
 * object-storage sidecar (GCS with presigned URLs), which only exists inside
 * a Replit workspace — on Railway every request failed. Uploaded files are
 * small (board photos, lease documents), so they live in the `stored_objects`
 * table and survive redeploys without extra infrastructure.
 *
 * The presigned-URL API shape is preserved so existing clients keep working:
 * request-url still returns an `uploadURL` the client PUTs the file to — the
 * URL just points back at this server instead of GCS.
 */
const router: IRouter = Router();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * POST /storage/uploads/request-url
 *
 * The client sends JSON metadata (name, size, contentType) — NOT the file —
 * and then PUTs the file to the returned uploadURL.
 */
router.post("/storage/uploads/request-url", (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  const { name, size, contentType } = parsed.data;
  if (size > MAX_UPLOAD_BYTES) {
    res.status(413).json({ error: "File too large (max 25 MB)" });
    return;
  }

  const objectId = randomUUID();
  const objectPath = `/objects/uploads/${objectId}`;
  // Behind Railway's proxy req.protocol is "http"; trust the forwarded proto.
  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  const uploadURL = `${proto}://${req.get("host")}/api/storage/uploads/${objectId}`;

  res.json(
    RequestUploadUrlResponse.parse({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    }),
  );
});

/**
 * PUT /storage/uploads/:objectId
 *
 * Receive the raw file body for a previously requested upload URL.
 */
router.put(
  "/storage/uploads/:objectId",
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  async (req: Request, res: Response) => {
    const rawId = req.params.objectId;
    const objectId = Array.isArray(rawId) ? rawId.join("/") : rawId;
    if (!/^[0-9a-f-]{36}$/i.test(objectId)) {
      res.status(400).json({ error: "invalid object id" });
      return;
    }
    const bytes = req.body as Buffer;
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
      res.status(400).json({ error: "empty upload body" });
      return;
    }
    try {
      await db
        .insert(storedObjectsTable)
        .values({
          path: `/objects/uploads/${objectId}`,
          contentType: req.get("content-type") || "application/octet-stream",
          bytes,
        })
        .onConflictDoUpdate({
          target: storedObjectsTable.path,
          set: {
            contentType: req.get("content-type") || "application/octet-stream",
            bytes,
          },
        });
      res.status(200).json({ objectPath: `/objects/uploads/${objectId}` });
    } catch (err) {
      req.log.error({ err, objectId }, "Error storing uploaded object");
      res.status(500).json({ error: "Failed to store object" });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve a stored object. Objects uploaded before the July 2026 migration to
 * Railway lived in Replit object storage and are gone — those 404.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
  const objectPath = `/objects/${wildcardPath}`;
  try {
    const [row] = await db
      .select()
      .from(storedObjectsTable)
      .where(eq(storedObjectsTable.path, objectPath))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    res.setHeader("Content-Type", row.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(row.bytes);
  } catch (err) {
    req.log.error({ err, objectPath }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Legacy Replit route kept so old links fail cleanly instead of 500ing.
 * Nothing writes public objects on Railway.
 */
router.get("/storage/public-objects/*filePath", (_req: Request, res: Response) => {
  res.status(404).json({ error: "File not found" });
});

export default router;

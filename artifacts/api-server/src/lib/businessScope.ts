import type { Request, RequestHandler } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      businessId?: number;
    }
  }
}

/** Read the business id from the `x-business-id` header. Defaults to 1 (EDGE). */
export function fromHeader(): RequestHandler {
  return (req, _res, next) => {
    const raw = req.header("x-business-id");
    const parsed = raw == null ? NaN : parseInt(raw, 10);
    req.businessId = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    next();
  };
}

/** Hardcode the business id for every request reaching the mounted router. */
export function fixed(businessId: number): RequestHandler {
  return (req, _res, next) => {
    req.businessId = businessId;
    next();
  };
}

/** Read req.businessId (always set by the mounting middleware; fall back to 1). */
export function getBusinessId(req: Request): number {
  return req.businessId ?? 1;
}

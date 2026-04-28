import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * `requireAuth` runs upstream (mounted on the whole `/api` router in
 * `app.ts`), so by the time we get here `req.authedUser` is guaranteed
 * to be populated.
 */
router.get("/me", (req, res): void => {
  res.json(req.authedUser);
});

export default router;

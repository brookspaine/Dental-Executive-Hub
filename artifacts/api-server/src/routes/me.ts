import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/me", requireAuth, (req, res): void => {
  res.json(req.authedUser);
});

export default router;

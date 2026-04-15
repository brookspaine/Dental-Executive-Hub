import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dailyTop3Router from "./dailyTop3";
import organizationsRouter from "./organizations";
import directReportsRouter from "./directReports";
import announcementsRouter from "./announcements";
import dashboardRouter from "./dashboard";
import idealWeekRouter from "./idealWeek";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dailyTop3Router);
router.use(organizationsRouter);
router.use(directReportsRouter);
router.use(announcementsRouter);
router.use(dashboardRouter);
router.use(idealWeekRouter);

export default router;

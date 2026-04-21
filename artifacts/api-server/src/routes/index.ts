import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dailyTop3Router from "./dailyTop3";
import organizationsRouter from "./organizations";
import directReportsRouter from "./directReports";
import announcementsRouter from "./announcements";
import dashboardRouter from "./dashboard";
import idealWeekRouter from "./idealWeek";
import devotionalRouter from "./devotional";
import wisdomQuotesRouter from "./wisdomQuotes";
import orgChartRouter from "./orgChart";
import seatTasksRouter from "./seatTasks";
import seatKeyResultsRouter from "./seatKeyResults";
import vendorPasswordsRouter from "./vendorPasswords";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dailyTop3Router);
router.use(organizationsRouter);
router.use(directReportsRouter);
router.use(announcementsRouter);
router.use(dashboardRouter);
router.use(idealWeekRouter);
router.use(devotionalRouter);
router.use(wisdomQuotesRouter);
router.use(orgChartRouter);
router.use(seatTasksRouter);
router.use(seatKeyResultsRouter);
router.use(vendorPasswordsRouter);
router.use(storageRouter);

export default router;

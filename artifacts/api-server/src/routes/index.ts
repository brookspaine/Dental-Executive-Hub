import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dailyTop3Router from "./dailyTop3";
import organizationsRouter from "./organizations";
import announcementsRouter from "./announcements";
import dashboardRouter from "./dashboard";
import idealWeekRouter from "./idealWeek";
import devotionalRouter from "./devotional";
import wisdomQuotesRouter from "./wisdomQuotes";
import storageRouter from "./storage";
import yearlyPlanningRouter from "./yearlyPlanning";
import weeklyReviewRouter from "./weeklyReview";
import leaseRecordsRouter from "./leaseRecords";
import leaseToolkitRouter from "./leaseToolkit";
import futureTodosRouter from "./futureTodos";
import meRouter from "./me";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dailyTop3Router);
router.use(organizationsRouter);
router.use(announcementsRouter);
router.use(dashboardRouter);
router.use(idealWeekRouter);
router.use(devotionalRouter);
router.use(wisdomQuotesRouter);
router.use(storageRouter);
router.use(yearlyPlanningRouter);
router.use(weeklyReviewRouter);
router.use(leaseRecordsRouter);
router.use(leaseToolkitRouter);
router.use(futureTodosRouter);
router.use(meRouter);
router.use(usersRouter);

export default router;

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
import commandCenterRouter from "./commandCenter";
import businessesRouter from "./businesses";
import meRouter from "./me";
import usersRouter from "./users";
import { fromHeader, fixed } from "../lib/businessScope";

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
router.use(businessesRouter);

// futureTodos at root: header-scoped (dashboard sends x-business-id; Today page uses EDGE).
router.use(fromHeader(), futureTodosRouter);

// Command Center at /command-center: header-scoped.
router.use("/command-center", fromHeader(), commandCenterRouter);

// Same Command Center handlers at /urgent-dental, hardcoded to business id 2.
// Standalone Urgent Dental app reads/writes the unified cc_* tables this way.
router.use("/urgent-dental", fixed(2), commandCenterRouter);
router.use("/urgent-dental", fixed(2), futureTodosRouter);

router.use(meRouter);
router.use(usersRouter);

export default router;

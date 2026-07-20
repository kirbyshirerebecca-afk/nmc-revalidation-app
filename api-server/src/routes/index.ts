import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reflectionsRouter from "./reflections";
import exportRouter from "./export";
import stripeRouter from "./stripe";
import usersRouter from "./users";
import cpdRouter from "./cpd";
import practiceRouter from "./practice";
import storageRouter from "./storage";
import evidenceRouter from "./evidence";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/reflections", reflectionsRouter);
router.use("/export", exportRouter);
router.use("/stripe", stripeRouter);
router.use("/users", usersRouter);
router.use("/cpd", cpdRouter);
router.use("/practice", practiceRouter);
router.use(storageRouter);
router.use("/evidence", evidenceRouter);
router.use("/stats", statsRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import estimatesRouter from "./estimates";
import consumptionRouter from "./consumption";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/projects", projectsRouter);
router.use("/estimates", estimatesRouter);
router.use("/consumption", consumptionRouter);
router.use("/reports", reportsRouter);

export default router;

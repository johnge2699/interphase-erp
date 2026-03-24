import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, estimatesTable, consumptionTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/margin", async (req, res) => {
  try {
    const { projectId } = req.query as { projectId?: string };
    if (!projectId) {
      return res.status(400).json({ error: "bad_request", message: "projectId is required" });
    }
    const id = parseInt(projectId);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) {
      return res.status(404).json({ error: "not_found", message: "Project not found" });
    }

    const estimates = await db.select().from(estimatesTable).where(eq(estimatesTable.projectId, id));
    const consumptions = await db
      .select()
      .from(consumptionTable)
      .where(eq(consumptionTable.projectId, id))
      .orderBy(consumptionTable.weekNumber);

    const projectValue = parseFloat(project.projectValue ?? "0");
    const estimatedCost = estimates.reduce(
      (sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate),
      0
    );
    const actualCost = consumptions.reduce(
      (sum, c) => sum + parseFloat(c.actualQty) * parseFloat(c.unitCost),
      0
    );
    const grossMargin = projectValue - actualCost;
    const marginPercent = projectValue > 0 ? (grossMargin / projectValue) * 100 : 0;

    const categoryCostMap: Record<string, { estimated: number; actual: number }> = {};
    for (const e of estimates) {
      const cat = e.itemCategory;
      if (!categoryCostMap[cat]) categoryCostMap[cat] = { estimated: 0, actual: 0 };
      categoryCostMap[cat].estimated += parseFloat(e.estimatedQuantity) * parseFloat(e.rate);
    }
    for (const c of consumptions) {
      const cat = c.itemName;
      if (!categoryCostMap[cat]) categoryCostMap[cat] = { estimated: 0, actual: 0 };
      categoryCostMap[cat].actual += parseFloat(c.actualQty) * parseFloat(c.unitCost);
    }

    const categoryBreakdown = Object.entries(categoryCostMap).map(([category, costs]) => ({
      category,
      estimatedCost: costs.estimated,
      actualCost: costs.actual,
      variance: costs.estimated - costs.actual,
      variancePercent:
        costs.estimated > 0 ? ((costs.estimated - costs.actual) / costs.estimated) * 100 : 0,
    }));

    const weekMap: Record<number, { weekNumber: number; weekLabel: string; estimated: number; actual: number }> = {};
    for (const c of consumptions) {
      const wn = c.weekNumber;
      if (!weekMap[wn]) {
        weekMap[wn] = {
          weekNumber: wn,
          weekLabel: `Wk ${wn}`,
          estimated: 0,
          actual: 0,
        };
      }
      weekMap[wn].actual += parseFloat(c.actualQty) * parseFloat(c.unitCost);
    }
    const weekEstimated = estimatedCost / Math.max(Object.keys(weekMap).length, 1);
    for (const wk of Object.values(weekMap)) {
      wk.estimated = weekEstimated;
    }

    let cumEst = 0;
    let cumAct = 0;
    const weeklyTrend = Object.values(weekMap)
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map((wk) => {
        cumEst += wk.estimated;
        cumAct += wk.actual;
        return {
          weekNumber: wk.weekNumber,
          weekLabel: wk.weekLabel,
          estimatedCost: wk.estimated,
          actualCost: wk.actual,
          cumulativeEstimated: cumEst,
          cumulativeActual: cumAct,
        };
      });

    const burnRate = estimatedCost > 0 ? (actualCost / estimatedCost) * 100 : 0;
    const forecastAtCompletion = burnRate > 0 ? (actualCost / burnRate) * 100 : estimatedCost;

    const materialEstimated = estimates
      .filter((e) => e.itemCategory.toLowerCase().includes("material"))
      .reduce((sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate), 0);
    const materialActual = consumptions
      .filter((c) => c.itemName.toLowerCase().includes("material"))
      .reduce((sum, c) => sum + parseFloat(c.actualQty) * parseFloat(c.unitCost), 0);
    const labourEstimated = estimates
      .filter((e) => e.itemCategory.toLowerCase().includes("labour") || e.itemCategory.toLowerCase().includes("labor"))
      .reduce((sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate), 0);
    const labourActual = consumptions
      .filter((c) => c.itemName.toLowerCase().includes("labour") || c.itemName.toLowerCase().includes("labor"))
      .reduce((sum, c) => sum + parseFloat(c.actualQty) * parseFloat(c.unitCost), 0);

    res.json({
      projectId: id,
      projectName: project.projectName,
      projectValue,
      estimatedCost,
      actualCost,
      grossMargin,
      marginPercent,
      materialVariance: materialEstimated - materialActual,
      labourVariance: labourEstimated - labourActual,
      burnRate,
      forecastAtCompletion,
      categoryBreakdown,
      weeklyTrend,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get margin report");
    res.status(500).json({ error: "server_error", message: "Failed to get margin report" });
  }
});

router.get("/weekly-trend", async (req, res) => {
  try {
    const { projectId } = req.query as { projectId?: string };
    if (!projectId) {
      return res.status(400).json({ error: "bad_request", message: "projectId is required" });
    }
    const id = parseInt(projectId);
    const estimates = await db.select().from(estimatesTable).where(eq(estimatesTable.projectId, id));
    const consumptions = await db
      .select()
      .from(consumptionTable)
      .where(eq(consumptionTable.projectId, id))
      .orderBy(consumptionTable.weekNumber);

    const estimatedCost = estimates.reduce(
      (sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate),
      0
    );

    const weekMap: Record<number, { weekNumber: number; weekLabel: string; actual: number }> = {};
    for (const c of consumptions) {
      const wn = c.weekNumber;
      if (!weekMap[wn]) {
        weekMap[wn] = { weekNumber: wn, weekLabel: `Wk ${wn}`, actual: 0 };
      }
      weekMap[wn].actual += parseFloat(c.actualQty) * parseFloat(c.unitCost);
    }

    const weeks = Object.values(weekMap).sort((a, b) => a.weekNumber - b.weekNumber);
    const weekEstimated = estimatedCost / Math.max(weeks.length, 1);
    let cumEst = 0;
    let cumAct = 0;
    const result = weeks.map((wk) => {
      cumEst += weekEstimated;
      cumAct += wk.actual;
      return {
        weekNumber: wk.weekNumber,
        weekLabel: wk.weekLabel,
        estimatedCost: weekEstimated,
        actualCost: wk.actual,
        cumulativeEstimated: cumEst,
        cumulativeActual: cumAct,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get weekly trend");
    res.status(500).json({ error: "server_error", message: "Failed to get weekly trend" });
  }
});

router.get("/category-breakdown", async (req, res) => {
  try {
    const { projectId } = req.query as { projectId?: string };
    if (!projectId) {
      return res.status(400).json({ error: "bad_request", message: "projectId is required" });
    }
    const id = parseInt(projectId);
    const estimates = await db.select().from(estimatesTable).where(eq(estimatesTable.projectId, id));
    const consumptions = await db.select().from(consumptionTable).where(eq(consumptionTable.projectId, id));

    const map: Record<string, { estimated: number; actual: number }> = {};
    for (const e of estimates) {
      const cat = e.itemCategory;
      if (!map[cat]) map[cat] = { estimated: 0, actual: 0 };
      map[cat].estimated += parseFloat(e.estimatedQuantity) * parseFloat(e.rate);
    }
    for (const c of consumptions) {
      const cat = c.itemName;
      if (!map[cat]) map[cat] = { estimated: 0, actual: 0 };
      map[cat].actual += parseFloat(c.actualQty) * parseFloat(c.unitCost);
    }

    res.json(
      Object.entries(map).map(([category, costs]) => ({
        category,
        estimatedCost: costs.estimated,
        actualCost: costs.actual,
        variance: costs.estimated - costs.actual,
        variancePercent:
          costs.estimated > 0 ? ((costs.estimated - costs.actual) / costs.estimated) * 100 : 0,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get category breakdown");
    res.status(500).json({ error: "server_error", message: "Failed to get category breakdown" });
  }
});

router.get("/dashboard-summary", async (req, res) => {
  try {
    const projects = await db
      .select()
      .from(projectsTable)
      .orderBy(desc(projectsTable.updatedAt));

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const totalRevenue = projects.reduce((sum, p) => sum + parseFloat(p.projectValue ?? "0"), 0);

    const estimates = await db.select().from(estimatesTable);
    const consumptions = await db.select().from(consumptionTable);

    const totalEstimatedCost = estimates.reduce(
      (sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate),
      0
    );
    const totalActualCost = consumptions.reduce(
      (sum, c) => sum + parseFloat(c.actualQty) * parseFloat(c.unitCost),
      0
    );
    const overallMarginPercent =
      totalRevenue > 0 ? ((totalRevenue - totalActualCost) / totalRevenue) * 100 : 0;

    const projectsAtRisk = projects.filter((p) => {
      const pEstimates = estimates.filter((e) => e.projectId === p.id);
      const pConsumptions = consumptions.filter((c) => c.projectId === p.id);
      const estCost = pEstimates.reduce(
        (sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate),
        0
      );
      const actCost = pConsumptions.reduce(
        (sum, c) => sum + parseFloat(c.actualQty) * parseFloat(c.unitCost),
        0
      );
      return actCost > estCost;
    }).length;

    res.json({
      totalProjects,
      activeProjects,
      totalRevenue,
      totalEstimatedCost,
      totalActualCost,
      overallMarginPercent,
      projectsAtRisk,
      recentProjects: projects.slice(0, 5).map((p) => ({
        ...p,
        projectValue: parseFloat(p.projectValue ?? "0"),
        area: p.area != null ? parseFloat(p.area) : null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "server_error", message: "Failed to get dashboard summary" });
  }
});

export default router;

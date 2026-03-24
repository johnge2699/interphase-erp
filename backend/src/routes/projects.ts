import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, estimatesTable, consumptionTable } from "@workspace/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    let query = db.select().from(projectsTable).$dynamic();

    if (status) {
      query = query.where(eq(projectsTable.status, status as any));
    }
    if (search) {
      query = query.where(
        or(
          ilike(projectsTable.projectName, `%${search}%`),
          ilike(projectsTable.clientName, `%${search}%`)
        )
      );
    }

    const projects = await query.orderBy(sql`${projectsTable.updatedAt} desc`);
    res.json(
      projects.map((p) => ({
        ...p,
        projectValue: parseFloat(p.projectValue ?? "0"),
        area: p.area != null ? parseFloat(p.area) : null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "server_error", message: "Failed to list projects" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [project] = await db
      .insert(projectsTable)
      .values({
        projectName: body.projectName,
        clientName: body.clientName,
        projectType: body.projectType,
        location: body.location || "",
        projectValue: String(body.projectValue ?? 0),
        startDate: body.startDate,
        endDate: body.endDate,
        area: body.area != null ? String(body.area) : null,
        teamEngineer: body.teamEngineer || null,
        status: body.status || "planning",
      })
      .returning();
    res.status(201).json({
      ...project,
      projectValue: parseFloat(project.projectValue ?? "0"),
      area: project.area != null ? parseFloat(project.area) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(400).json({ error: "validation_error", message: "Failed to create project" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) {
      return res.status(404).json({ error: "not_found", message: "Project not found" });
    }
    res.json({
      ...project,
      projectValue: parseFloat(project.projectValue ?? "0"),
      area: project.area != null ? parseFloat(project.area) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "server_error", message: "Failed to get project" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [project] = await db
      .update(projectsTable)
      .set({
        projectName: body.projectName,
        clientName: body.clientName,
        projectType: body.projectType,
        location: body.location || "",
        projectValue: String(body.projectValue ?? 0),
        startDate: body.startDate,
        endDate: body.endDate,
        area: body.area != null ? String(body.area) : null,
        teamEngineer: body.teamEngineer || null,
        status: body.status,
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, id))
      .returning();
    if (!project) {
      return res.status(404).json({ error: "not_found", message: "Project not found" });
    }
    res.json({
      ...project,
      projectValue: parseFloat(project.projectValue ?? "0"),
      area: project.area != null ? parseFloat(project.area) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(400).json({ error: "validation_error", message: "Failed to update project" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "server_error", message: "Failed to delete project" });
  }
});

router.get("/:id/summary", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) {
      return res.status(404).json({ error: "not_found", message: "Project not found" });
    }

    const estimates = await db.select().from(estimatesTable).where(eq(estimatesTable.projectId, id));
    const consumptions = await db.select().from(consumptionTable).where(eq(consumptionTable.projectId, id));

    const projectValue = parseFloat(project.projectValue ?? "0");
    const estimatedCost = estimates.reduce((sum, e) => {
      return sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate);
    }, 0);
    const actualCost = consumptions.reduce((sum, c) => {
      return sum + parseFloat(c.actualQty) * parseFloat(c.unitCost);
    }, 0);
    const grossMargin = projectValue - actualCost;
    const marginPercent = projectValue > 0 ? (grossMargin / projectValue) * 100 : 0;

    const materialEstimates = estimates.filter((e) =>
      e.itemCategory.toLowerCase().includes("material")
    );
    const labourEstimates = estimates.filter((e) =>
      e.itemCategory.toLowerCase().includes("labour") || e.itemCategory.toLowerCase().includes("labor")
    );

    const materialEstimated = materialEstimates.reduce(
      (sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate),
      0
    );
    const labourEstimated = labourEstimates.reduce(
      (sum, e) => sum + parseFloat(e.estimatedQuantity) * parseFloat(e.rate),
      0
    );

    const materialConsumed = consumptions
      .filter((c) => c.itemName.toLowerCase().includes("material"))
      .reduce((sum, c) => sum + parseFloat(c.actualQty) * parseFloat(c.unitCost), 0);
    const labourConsumed = consumptions
      .filter((c) => c.itemName.toLowerCase().includes("labour") || c.itemName.toLowerCase().includes("labor"))
      .reduce((sum, c) => sum + parseFloat(c.actualQty) * parseFloat(c.unitCost), 0);

    const burnRate = estimatedCost > 0 ? (actualCost / estimatedCost) * 100 : 0;
    const forecastAtCompletion = burnRate > 0 ? (actualCost / burnRate) * 100 : estimatedCost;

    res.json({
      projectId: id,
      projectName: project.projectName,
      projectValue,
      estimatedCost,
      actualCost,
      grossMargin,
      marginPercent,
      materialVariance: materialEstimated - materialConsumed,
      labourVariance: labourEstimated - labourConsumed,
      burnRate,
      forecastAtCompletion,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project summary");
    res.status(500).json({ error: "server_error", message: "Failed to get project summary" });
  }
});

export default router;

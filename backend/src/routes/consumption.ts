import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { consumptionTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

function computeFields(r: typeof consumptionTable.$inferSelect) {
  const estQty = parseFloat(r.estimatedQty);
  const actQty = parseFloat(r.actualQty);
  const retQty = parseFloat(r.returnedQty ?? "0");
  const unitCost = parseFloat(r.unitCost);
  const netQty = actQty - retQty;
  const variance = estQty - actQty;
  const variancePercent = estQty > 0 ? (variance / estQty) * 100 : 0;
  return {
    ...r,
    estimatedQty: estQty,
    actualQty: actQty,
    returnedQty: retQty,
    netQty,
    unitCost,
    variance,
    variancePercent,
    actualCost: actQty * unitCost,
    netCost: netQty * unitCost,
  };
}

router.get("/", async (req, res) => {
  try {
    const { projectId, weekNumber } = req.query as { projectId?: string; weekNumber?: string };
    if (!projectId) {
      return res.status(400).json({ error: "bad_request", message: "projectId is required" });
    }

    let conditions: any = eq(consumptionTable.projectId, parseInt(projectId));
    if (weekNumber) {
      conditions = and(
        eq(consumptionTable.projectId, parseInt(projectId)),
        eq(consumptionTable.weekNumber, parseInt(weekNumber))
      );
    }

    const rows = await db
      .select()
      .from(consumptionTable)
      .where(conditions)
      .orderBy(sql`${consumptionTable.weekNumber} asc, ${consumptionTable.createdAt} asc`);

    res.json(rows.map(computeFields));
  } catch (err) {
    req.log.error({ err }, "Failed to list consumption entries");
    res.status(500).json({ error: "server_error", message: "Failed to list consumption entries" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(consumptionTable)
      .values({
        projectId: body.projectId,
        weekNumber: body.weekNumber,
        weekStart: body.weekStart,
        weekEnd: body.weekEnd,
        itemName: body.itemName,
        estimatedQty: String(body.estimatedQty ?? 0),
        actualQty: String(body.actualQty ?? 0),
        returnedQty: String(body.returnedQty ?? 0),
        unitCost: String(body.unitCost ?? 0),
        notes: body.notes || null,
      })
      .returning();
    res.status(201).json(computeFields(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create consumption entry");
    res.status(400).json({ error: "validation_error", message: "Failed to create consumption entry" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db
      .update(consumptionTable)
      .set({
        projectId: body.projectId,
        weekNumber: body.weekNumber,
        weekStart: body.weekStart,
        weekEnd: body.weekEnd,
        itemName: body.itemName,
        estimatedQty: String(body.estimatedQty ?? 0),
        actualQty: String(body.actualQty ?? 0),
        returnedQty: String(body.returnedQty ?? 0),
        unitCost: String(body.unitCost ?? 0),
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(consumptionTable.id, id))
      .returning();
    if (!row) {
      return res.status(404).json({ error: "not_found", message: "Consumption entry not found" });
    }
    res.json(computeFields(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update consumption entry");
    res.status(400).json({ error: "validation_error", message: "Failed to update consumption entry" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(consumptionTable).where(eq(consumptionTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete consumption entry");
    res.status(500).json({ error: "server_error", message: "Failed to delete consumption entry" });
  }
});

export default router;

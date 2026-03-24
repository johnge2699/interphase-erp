import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { estimatesTable } from "@workspace/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { projectId, category } = req.query as { projectId?: string; category?: string };
    if (!projectId) {
      return res.status(400).json({ error: "bad_request", message: "projectId is required" });
    }

    let query = db
      .select()
      .from(estimatesTable)
      .where(eq(estimatesTable.projectId, parseInt(projectId)))
      .$dynamic();

    if (category) {
      query = query.where(
        and(
          eq(estimatesTable.projectId, parseInt(projectId)),
          ilike(estimatesTable.itemCategory, `%${category}%`)
        )
      );
    }

    const rows = await query.orderBy(sql`${estimatesTable.createdAt} asc`);
    res.json(
      rows.map((r) => ({
        ...r,
        estimatedQuantity: parseFloat(r.estimatedQuantity),
        rate: parseFloat(r.rate),
        cost: parseFloat(r.estimatedQuantity) * parseFloat(r.rate),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list estimates");
    res.status(500).json({ error: "server_error", message: "Failed to list estimates" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(estimatesTable)
      .values({
        projectId: body.projectId,
        itemCategory: body.itemCategory,
        itemName: body.itemName,
        specification: body.specification || null,
        unit: body.unit,
        estimatedQuantity: String(body.estimatedQuantity ?? 0),
        rate: String(body.rate ?? 0),
        remarks: body.remarks || null,
      })
      .returning();
    res.status(201).json({
      ...row,
      estimatedQuantity: parseFloat(row.estimatedQuantity),
      rate: parseFloat(row.rate),
      cost: parseFloat(row.estimatedQuantity) * parseFloat(row.rate),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create estimate row");
    res.status(400).json({ error: "validation_error", message: "Failed to create estimate row" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db
      .update(estimatesTable)
      .set({
        projectId: body.projectId,
        itemCategory: body.itemCategory,
        itemName: body.itemName,
        specification: body.specification || null,
        unit: body.unit,
        estimatedQuantity: String(body.estimatedQuantity ?? 0),
        rate: String(body.rate ?? 0),
        remarks: body.remarks || null,
        updatedAt: new Date(),
      })
      .where(eq(estimatesTable.id, id))
      .returning();
    if (!row) {
      return res.status(404).json({ error: "not_found", message: "Estimate row not found" });
    }
    res.json({
      ...row,
      estimatedQuantity: parseFloat(row.estimatedQuantity),
      rate: parseFloat(row.rate),
      cost: parseFloat(row.estimatedQuantity) * parseFloat(row.rate),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update estimate row");
    res.status(400).json({ error: "validation_error", message: "Failed to update estimate row" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(estimatesTable).where(eq(estimatesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete estimate row");
    res.status(500).json({ error: "server_error", message: "Failed to delete estimate row" });
  }
});

export default router;

import { pgTable, serial, text, numeric, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";

export const consumptionTable = pgTable("consumption", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  itemName: text("item_name").notNull(),
  estimatedQty: numeric("estimated_qty", { precision: 12, scale: 3 }).notNull().default("0"),
  actualQty: numeric("actual_qty", { precision: 12, scale: 3 }).notNull().default("0"),
  returnedQty: numeric("returned_qty", { precision: 12, scale: 3 }).notNull().default("0"),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConsumptionSchema = createInsertSchema(consumptionTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConsumption = z.infer<typeof insertConsumptionSchema>;
export type Consumption = typeof consumptionTable.$inferSelect;

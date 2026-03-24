import { pgTable, serial, text, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectTypeEnum = pgEnum("project_type", [
  "electrical",
  "civil",
  "mechanical",
  "plumbing",
  "hvac",
  "other",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  clientName: text("client_name").notNull(),
  projectType: projectTypeEnum("project_type").notNull(),
  location: text("location").notNull().default(""),
  projectValue: numeric("project_value", { precision: 18, scale: 2 }).notNull().default("0"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  area: numeric("area", { precision: 12, scale: 2 }),
  teamEngineer: text("team_engineer"),
  status: projectStatusEnum("status").notNull().default("planning"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

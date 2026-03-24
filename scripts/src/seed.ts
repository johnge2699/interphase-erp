import { db } from "@workspace/db";
import {
  projectsTable,
  estimatesTable,
  consumptionTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(consumptionTable);
  await db.delete(estimatesTable);
  await db.delete(projectsTable);

  // Insert projects
  const projects = await db
    .insert(projectsTable)
    .values([
      {
        projectName: "Hiranandani Garden Electrification",
        clientName: "Hiranandani Developers Pvt Ltd",
        projectType: "electrical",
        location: "Powai, Mumbai",
        projectValue: "48500000",
        startDate: "2025-01-15",
        endDate: "2025-12-31",
        area: "125000",
        teamEngineer: "Rajesh Mehta",
        status: "active",
      },
      {
        projectName: "Bandra Kurla Complex Substation",
        clientName: "MMRDA",
        projectType: "electrical",
        location: "BKC, Mumbai",
        projectValue: "82000000",
        startDate: "2024-09-01",
        endDate: "2026-03-31",
        area: "8500",
        teamEngineer: "Suresh Patil",
        status: "active",
      },
      {
        projectName: "Navi Mumbai Residential HVAC",
        clientName: "Lodha Group",
        projectType: "hvac",
        location: "Kharghar, Navi Mumbai",
        projectValue: "23750000",
        startDate: "2025-03-01",
        endDate: "2025-10-31",
        area: "45000",
        teamEngineer: "Priya Sharma",
        status: "planning",
      },
      {
        projectName: "Thane Industrial Panel Works",
        clientName: "Godrej Industries",
        projectType: "electrical",
        location: "Thane West",
        projectValue: "15200000",
        startDate: "2024-11-01",
        endDate: "2025-06-30",
        area: "12000",
        teamEngineer: "Amit Desai",
        status: "completed",
      },
    ])
    .returning();

  console.log(`Inserted ${projects.length} projects`);

  // Estimates for project 1
  const estimates1 = await db
    .insert(estimatesTable)
    .values([
      {
        projectId: projects[0].id,
        itemCategory: "Material",
        itemName: "HT Cables 11kV XLPE",
        specification: "3 Core 240mm² XLPE",
        unit: "Meter",
        estimatedQuantity: "2500",
        rate: "1850",
        remarks: "Supply only",
      },
      {
        projectId: projects[0].id,
        itemCategory: "Material",
        itemName: "LT Distribution Panels",
        specification: "ACB 3200A, 415V",
        unit: "Nos",
        estimatedQuantity: "12",
        rate: "185000",
        remarks: "Factory tested",
      },
      {
        projectId: projects[0].id,
        itemCategory: "Material",
        itemName: "Transformer 1000 kVA",
        specification: "11kV/415V Dyn11",
        unit: "Nos",
        estimatedQuantity: "4",
        rate: "950000",
        remarks: "Energy efficient",
      },
      {
        projectId: projects[0].id,
        itemCategory: "Labour",
        itemName: "Cable Laying & Jointing",
        specification: "Underground direct burial",
        unit: "Meter",
        estimatedQuantity: "2500",
        rate: "180",
        remarks: "Includes excavation",
      },
      {
        projectId: projects[0].id,
        itemCategory: "Labour",
        itemName: "Panel Installation & Testing",
        specification: "Complete installation",
        unit: "Nos",
        estimatedQuantity: "12",
        rate: "25000",
        remarks: "",
      },
      {
        projectId: projects[0].id,
        itemCategory: "Civil",
        itemName: "Cable Trench & Duct Bank",
        specification: "RCC 600mm deep",
        unit: "RMT",
        estimatedQuantity: "1800",
        rate: "2200",
        remarks: "With cable markers",
      },
      {
        projectId: projects[0].id,
        itemCategory: "Material",
        itemName: "Street Light Poles 9m",
        specification: "MS Galvanised, 9m height",
        unit: "Nos",
        estimatedQuantity: "180",
        rate: "22000",
        remarks: "LED luminaires included",
      },
    ])
    .returning();

  console.log(`Inserted ${estimates1.length} estimates for project 1`);

  // Estimates for project 2
  const estimates2 = await db
    .insert(estimatesTable)
    .values([
      {
        projectId: projects[1].id,
        itemCategory: "Material",
        itemName: "132kV GIS Switchgear",
        specification: "SF6 insulated, 3-phase",
        unit: "Bay",
        estimatedQuantity: "8",
        rate: "4500000",
        remarks: "Import item",
      },
      {
        projectId: projects[1].id,
        itemCategory: "Material",
        itemName: "Control & Relay Panels",
        specification: "Numerical protection relays",
        unit: "Nos",
        estimatedQuantity: "16",
        rate: "285000",
        remarks: "",
      },
      {
        projectId: projects[1].id,
        itemCategory: "Labour",
        itemName: "GIS Erection & Commissioning",
        specification: "Specialized team",
        unit: "Bay",
        estimatedQuantity: "8",
        rate: "350000",
        remarks: "OEM supervision included",
      },
      {
        projectId: projects[1].id,
        itemCategory: "Civil",
        itemName: "GIS Building Construction",
        specification: "Pre-engineered steel structure",
        unit: "Sqm",
        estimatedQuantity: "1200",
        rate: "18500",
        remarks: "",
      },
    ])
    .returning();

  console.log(`Inserted ${estimates2.length} estimates for project 2`);

  // Weekly consumption for project 1
  const weeklyData = [
    { week: 1, start: "2025-01-20", end: "2025-01-26", items: [
      { item: "HT Cables 11kV XLPE", estQty: 300, actQty: 280, unitCost: 1850 },
      { item: "Labour - Cable Laying", estQty: 300, actQty: 290, unitCost: 180 },
    ]},
    { week: 2, start: "2025-01-27", end: "2025-02-02", items: [
      { item: "HT Cables 11kV XLPE", estQty: 300, actQty: 325, unitCost: 1850 },
      { item: "Labour - Cable Laying", estQty: 300, actQty: 310, unitCost: 180 },
      { item: "Cable Trench", estQty: 200, actQty: 185, unitCost: 2200 },
    ]},
    { week: 3, start: "2025-02-03", end: "2025-02-09", items: [
      { item: "HT Cables 11kV XLPE", estQty: 300, actQty: 310, unitCost: 1850 },
      { item: "Labour - Cable Laying", estQty: 300, actQty: 295, unitCost: 180 },
      { item: "Cable Trench", estQty: 200, actQty: 220, unitCost: 2200 },
    ]},
    { week: 4, start: "2025-02-10", end: "2025-02-16", items: [
      { item: "LT Distribution Panels", estQty: 3, actQty: 3, unitCost: 185000 },
      { item: "Labour - Panel Installation", estQty: 3, actQty: 4, unitCost: 25000 },
    ]},
    { week: 5, start: "2025-02-17", end: "2025-02-23", items: [
      { item: "Transformer 1000 kVA", estQty: 1, actQty: 1, unitCost: 950000 },
      { item: "HT Cables 11kV XLPE", estQty: 300, actQty: 285, unitCost: 1850 },
    ]},
    { week: 6, start: "2025-02-24", end: "2025-03-02", items: [
      { item: "Transformer 1000 kVA", estQty: 1, actQty: 1, unitCost: 950000 },
      { item: "Street Light Poles 9m", estQty: 30, actQty: 35, unitCost: 22000 },
    ]},
  ];

  let totalConsumption = 0;
  for (const week of weeklyData) {
    for (const item of week.items) {
      await db.insert(consumptionTable).values({
        projectId: projects[0].id,
        weekNumber: week.week,
        weekStart: week.start,
        weekEnd: week.end,
        itemName: item.item,
        estimatedQty: String(item.estQty),
        actualQty: String(item.actQty),
        unitCost: String(item.unitCost),
        notes: null,
      });
      totalConsumption++;
    }
  }

  console.log(`Inserted ${totalConsumption} consumption entries`);
  console.log("Seed complete!");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Printer, RefreshCw, AlertCircle } from "lucide-react";
import {
  useListProjects,
  useListEstimates,
  useListConsumption,
  useGetMarginReport,
} from "@workspace/api-client-react";
import { useAppState } from "@/hooks/use-app-state";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v || 0);

const fmtNum = (v: number, dec = 2) =>
  isNaN(v) ? "—" : v.toFixed(dec);

function downloadCSV(filename: string, headers: string[], rows: (string | number)[]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csvContent =
    headers.map(escape).join(",") +
    "\n" +
    rows
      .map((row) =>
        (Array.isArray(row) ? row : [row]).map(escape).join(",")
      )
      .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "ACTIVE", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
    planning: { label: "PLANNING", cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
    on_hold: { label: "ON HOLD", cls: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
    completed: { label: "COMPLETED", cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
    cancelled: { label: "CANCELLED", cls: "bg-red-500/10 text-red-700 border-red-500/20" },
  };
  const s = map[status] || { label: status.toUpperCase(), cls: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 ${s.cls}`}>
      {s.label}
    </Badge>
  );
}

function TableSkeleton({ rows = 4, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("project-summary");
  const { selectedProjectId, setSelectedProjectId } = useAppState();

  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useListProjects({});

  const { data: estimates = [], isLoading: estimatesLoading, refetch: refetchEstimates } = useListEstimates(
    { projectId: selectedProjectId! },
    { query: { enabled: !!selectedProjectId } }
  );

  const { data: consumption = [], isLoading: consumptionLoading, refetch: refetchConsumption } = useListConsumption(
    { projectId: selectedProjectId! },
    { query: { enabled: !!selectedProjectId } }
  );

  const { data: marginReport, isLoading: marginLoading, refetch: refetchMargin } = useGetMarginReport(
    { projectId: selectedProjectId! },
    { query: { enabled: !!selectedProjectId } }
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  function handleRefresh() {
    refetchProjects();
    if (selectedProjectId) {
      refetchEstimates();
      refetchConsumption();
      refetchMargin();
    }
  }

  function handleExportCSV() {
    if (activeTab === "project-summary") {
      const headers = ["Project Name", "Client", "Type", "PO Value (₹)", "Status", "Start Date", "End Date", "Area (sqm)", "Site Engineer"];
      const rows = projects.map((p) => [
        p.projectName,
        p.clientName,
        p.projectType,
        p.projectValue,
        p.status,
        p.startDate,
        p.endDate,
        p.area ?? "",
        p.teamEngineer ?? "",
      ]);
      downloadCSV("interphase_projects_summary.csv", headers, rows as any);
    } else if (activeTab === "estimates") {
      const headers = ["Project", "Category", "Item Name", "Specification", "Unit", "Est. Qty", "Rate (₹)", "Cost (₹)", "Remarks"];
      const rows = estimates.map((e: any) => [
        selectedProject?.projectName ?? "",
        e.itemCategory,
        e.itemName,
        e.specification ?? "",
        e.unit,
        e.estimatedQuantity,
        e.rate,
        e.cost,
        e.remarks ?? "",
      ]);
      downloadCSV(`interphase_estimates_${selectedProject?.projectName ?? "export"}.csv`, headers, rows as any);
    } else if (activeTab === "consumption") {
      const headers = ["Week #", "Week Range", "Item", "Est. Qty", "Actual Qty", "Returned Qty", "Net Qty", "Variance %", "Unit Cost (₹)", "Actual Cost (₹)", "Net Cost (₹)", "Notes"];
      const rows = (consumption as any[]).map((c: any) => [
        c.weekNumber,
        `${c.weekStart} to ${c.weekEnd}`,
        c.itemName,
        c.estimatedQty,
        c.actualQty,
        c.returnedQty ?? 0,
        c.netQty ?? c.actualQty,
        fmtNum(c.variancePercent) + "%",
        c.unitCost,
        c.actualCost,
        c.netCost ?? c.actualCost,
        c.notes ?? "",
      ]);
      downloadCSV(`interphase_consumption_${selectedProject?.projectName ?? "export"}.csv`, headers, rows as any);
    } else if (activeTab === "variance") {
      const headers = ["Category", "Estimated Cost (₹)", "Actual Cost (₹)", "Variance (₹)", "Variance %"];
      const rows = (marginReport?.categoryBreakdown ?? []).map((c: any) => [
        c.category,
        c.estimatedCost,
        c.actualCost,
        c.variance,
        fmtNum(c.variancePercent) + "%",
      ]);
      downloadCSV(`interphase_variance_${selectedProject?.projectName ?? "export"}.csv`, headers, rows as any);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Exports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Generate and export standardised project reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button size="sm" className="h-9 gap-1.5 shadow-sm shadow-primary/20" onClick={handleExportCSV}>
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground font-medium">Project:</div>
        <Select
          value={selectedProjectId?.toString() ?? "all"}
          onValueChange={(v) => setSelectedProjectId(v === "all" ? null : parseInt(v))}
        >
          <SelectTrigger className="h-8 w-56 text-sm bg-secondary/50 border-border/60 shadow-none focus:ring-1 focus:ring-primary/30">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.projectName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProject && (
          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 px-2 py-0.5">
            {selectedProject.projectName}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
          {projects.length} project{projects.length !== 1 ? "s" : ""} total · {estimates.length} estimate rows
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/40 border border-border/50 p-1 h-auto gap-0.5">
          <TabsTrigger value="project-summary" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Project Summary
          </TabsTrigger>
          <TabsTrigger value="estimates" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            BOQ Estimates
          </TabsTrigger>
          <TabsTrigger value="consumption" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Consumption Ledger
          </TabsTrigger>
          <TabsTrigger value="variance" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Variance Analysis
          </TabsTrigger>
        </TabsList>

        {/* PROJECT SUMMARY */}
        <TabsContent value="project-summary" className="mt-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 border-b border-border/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">PO Value</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Engineer</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {projectsLoading ? (
                    <TableSkeleton rows={4} cols={6} />
                  ) : projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No projects found
                      </td>
                    </tr>
                  ) : (
                    projects.map((p, i) => (
                      <tr key={p.id} className={`hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-secondary/5"}`}>
                        <td className="px-5 py-3 font-medium">{p.projectName}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.clientName}</td>
                        <td className="px-5 py-3 capitalize text-muted-foreground">{p.projectType}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium">{fmt(p.projectValue)}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.teamEngineer ?? "—"}</td>
                        <td className="px-5 py-3 text-center">{statusBadge(p.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-secondary/30 border-t border-border/60">
                  <tr>
                    <td className="px-5 py-3 text-xs font-semibold text-muted-foreground" colSpan={3}>
                      TOTAL ({projects.length} projects)
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-bold text-foreground">
                      {fmt(projects.reduce((s, p) => s + (p.projectValue || 0), 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* BOQ ESTIMATES */}
        <TabsContent value="estimates" className="mt-4">
          {!selectedProjectId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground opacity-50" />
              <p className="font-medium">Select a project above to view its BOQ estimates</p>
              <p className="text-sm text-muted-foreground">Use the project filter dropdown to choose a project</p>
            </div>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Spec</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate (₹)</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {estimatesLoading ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : estimates.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                          No estimates entered for this project yet.
                        </td>
                      </tr>
                    ) : (
                      (estimates as any[]).map((e: any, i: number) => (
                        <tr key={e.id} className={`hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-secondary/5"}`}>
                          <td className="px-5 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-5 py-2.5">
                            <Badge variant="outline" className="text-xs bg-secondary/50">{e.itemCategory}</Badge>
                          </td>
                          <td className="px-5 py-2.5 font-medium">{e.itemName}</td>
                          <td className="px-5 py-2.5 text-muted-foreground text-xs max-w-[180px] truncate">{e.specification ?? "—"}</td>
                          <td className="px-5 py-2.5 text-muted-foreground">{e.unit}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{Number(e.estimatedQuantity).toLocaleString("en-IN")}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{Number(e.rate).toLocaleString("en-IN")}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums font-semibold">{fmt(e.cost)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-secondary/30 border-t border-border/60">
                    <tr>
                      <td colSpan={7} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Total Estimated Cost
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-foreground">
                        {fmt((estimates as any[]).reduce((s: number, e: any) => s + (e.cost || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* CONSUMPTION LEDGER */}
        <TabsContent value="consumption" className="mt-4">
          {!selectedProjectId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground opacity-50" />
              <p className="font-medium">Select a project to view its consumption ledger</p>
            </div>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wk #</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Week Range</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Est. Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actual Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-emerald-700 uppercase tracking-wide">Ret. Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Var %</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Cost</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actual Cost</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-emerald-700 uppercase tracking-wide bg-emerald-500/5">Net Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {consumptionLoading ? (
                      <TableSkeleton rows={5} cols={11} />
                    ) : (consumption as any[]).length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-10 text-center text-muted-foreground">
                          No consumption entries recorded yet for this project.
                        </td>
                      </tr>
                    ) : (
                      (consumption as any[]).map((c: any, i: number) => {
                        const isOver = c.variancePercent < -5;
                        const isUnder = c.variancePercent > 5;
                        const hasReturn = (c.returnedQty ?? 0) > 0;
                        return (
                          <tr key={c.id} className={`hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-secondary/5"}`}>
                            <td className="px-5 py-2.5 font-medium text-muted-foreground">W{c.weekNumber}</td>
                            <td className="px-5 py-2.5 text-xs text-muted-foreground">{c.weekStart} – {c.weekEnd}</td>
                            <td className="px-5 py-2.5 font-medium">{c.itemName}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums">{Number(c.estimatedQty).toLocaleString("en-IN")}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums">{Number(c.actualQty).toLocaleString("en-IN")}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-emerald-700 font-medium">
                              {hasReturn ? Number(c.returnedQty).toLocaleString("en-IN") : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums font-medium">
                              {Number(c.netQty ?? c.actualQty).toLocaleString("en-IN")}
                            </td>
                            <td className={`px-5 py-2.5 text-right tabular-nums text-xs font-semibold ${isOver ? "text-destructive" : isUnder ? "text-emerald-600" : "text-muted-foreground"}`}>
                              {c.variance > 0 ? "+" : ""}{fmtNum(c.variancePercent)}%
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(c.unitCost)}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(c.actualCost)}</td>
                            <td className={`px-5 py-2.5 text-right tabular-nums font-semibold bg-emerald-500/5 ${hasReturn ? "text-emerald-700" : "text-foreground"}`}>
                              {fmt(c.netCost ?? c.actualCost)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-secondary/30 border-t border-border/60">
                    <tr>
                      <td colSpan={9} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Total
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-muted-foreground">
                        {fmt((consumption as any[]).reduce((s: number, c: any) => s + (c.actualCost || 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-emerald-700 bg-emerald-500/5">
                        {fmt((consumption as any[]).reduce((s: number, c: any) => s + ((c.netCost ?? c.actualCost) || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* VARIANCE ANALYSIS */}
        <TabsContent value="variance" className="mt-4">
          {!selectedProjectId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground opacity-50" />
              <p className="font-medium">Select a project to view item-wise variance</p>
            </div>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category / Item</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estimated (₹)</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actual (₹)</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variance (₹)</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Var %</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {marginLoading ? (
                      <TableSkeleton rows={4} cols={6} />
                    ) : !marginReport || marginReport.categoryBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                          No data available. Ensure estimates and consumption entries exist.
                        </td>
                      </tr>
                    ) : (
                      marginReport.categoryBreakdown.map((c: any, i: number) => {
                        const isOver = c.variancePercent < -10;
                        const isWarn = c.variancePercent < 0 && !isOver;
                        return (
                          <tr key={i} className={`hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-secondary/5"}`}>
                            <td className="px-5 py-3 font-medium">{c.category}</td>
                            <td className="px-5 py-3 text-right tabular-nums">{fmt(c.estimatedCost)}</td>
                            <td className="px-5 py-3 text-right tabular-nums">{fmt(c.actualCost)}</td>
                            <td className={`px-5 py-3 text-right tabular-nums font-semibold ${isOver ? "text-destructive" : isWarn ? "text-yellow-600" : "text-emerald-600"}`}>
                              {c.variance >= 0 ? "+" : ""}{fmt(c.variance)}
                            </td>
                            <td className={`px-5 py-3 text-right tabular-nums font-semibold ${isOver ? "text-destructive" : isWarn ? "text-yellow-600" : "text-emerald-600"}`}>
                              {c.variancePercent >= 0 ? "+" : ""}{fmtNum(c.variancePercent)}%
                            </td>
                            <td className="px-5 py-3 text-center">
                              {isOver ? (
                                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">OVER BUDGET</Badge>
                              ) : isWarn ? (
                                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/20">WARNING</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">ON TRACK</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

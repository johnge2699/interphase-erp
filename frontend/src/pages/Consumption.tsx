import { useState } from "react";
import { useAppState } from "@/hooks/use-app-state";
import { useListConsumption, useCreateConsumptionEntry, useUpdateConsumptionEntry, useDeleteConsumptionEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Plus, Calendar as CalendarIcon, Save, X, Edit2, Trash2, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RowForm = {
  projectId: number;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  itemName: string;
  estimatedQty: number | string;
  actualQty: number | string;
  returnedQty: number | string;
  unitCost: number | string;
  notes: string;
};

export default function Consumption() {
  const { selectedProjectId, selectedWeekNumber, setSelectedWeekNumber } = useAppState();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [editForm, setEditForm] = useState<RowForm>({} as RowForm);

  const { data: consumption = [], isLoading } = useListConsumption(
    { projectId: selectedProjectId!, weekNumber: selectedWeekNumber },
    { query: { enabled: !!selectedProjectId } }
  );

  const safeConsumption = Array.isArray(consumption) ? consumption : [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/consumption"] });

  const createMutation = useCreateConsumptionEntry({
    mutation: {
      onSuccess: () => { invalidate(); setEditingId(null); toast({ title: "Saved", description: "Entry logged." }); },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to save entry." })
    }
  });

  const updateMutation = useUpdateConsumptionEntry({
    mutation: {
      onSuccess: () => { invalidate(); setEditingId(null); toast({ title: "Updated", description: "Entry updated." }); },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update entry." })
    }
  });

  const deleteMutation = useDeleteConsumptionEntry({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Deleted", description: "Entry removed." }); },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to delete entry." })
    }
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

  const blankForm = (): RowForm => {
    const today = new Date();
    const weekStart = new Date(today.getFullYear(), 0, 1 + (selectedWeekNumber - 1) * 7).toISOString().split("T")[0];
    const weekEnd = new Date(today.getFullYear(), 0, 7 + (selectedWeekNumber - 1) * 7).toISOString().split("T")[0];
    return {
      projectId: selectedProjectId!,
      weekNumber: selectedWeekNumber,
      weekStart,
      weekEnd,
      itemName: "",
      estimatedQty: 0,
      actualQty: 0,
      returnedQty: 0,
      unitCost: 0,
      notes: "",
    };
  };

  const startNew = () => {
    setEditingId("new");
    setEditForm(blankForm());
  };

  const startEdit = (row: any) => {
    setEditingId(row.id);
    setEditForm({
      projectId: row.projectId,
      weekNumber: row.weekNumber,
      weekStart: row.weekStart,
      weekEnd: row.weekEnd,
      itemName: row.itemName,
      estimatedQty: row.estimatedQty,
      actualQty: row.actualQty,
      returnedQty: row.returnedQty ?? 0,
      unitCost: row.unitCost,
      notes: row.notes ?? "",
    });
  };

  const saveEdit = () => {
    if (!editForm.itemName?.toString().trim()) {
      toast({ variant: "destructive", title: "Error", description: "Item Name is required." });
      return;
    }
    const payload = {
      ...editForm,
      estimatedQty: Number(editForm.estimatedQty) || 0,
      actualQty: Number(editForm.actualQty) || 0,
      returnedQty: Number(editForm.returnedQty) || 0,
      unitCost: Number(editForm.unitCost) || 0,
    };
    if (editingId === "new") {
      createMutation.mutate({ data: payload });
    } else {
      updateMutation.mutate({ id: editingId as number, data: payload });
    }
  };

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  const previewNetQty =
    (Number(editForm.actualQty) || 0) - (Number(editForm.returnedQty) || 0);
  const previewNetCost = previewNetQty * (Number(editForm.unitCost) || 0);

  const totals = safeConsumption.reduce(
    (acc: any, r: any) => ({
      estCost: acc.estCost + (r.estimatedQty * r.unitCost),
      actCost: acc.actCost + r.actualCost,
      netCost: acc.netCost + (r.netCost ?? r.actualCost),
      returned: acc.returned + (r.returnedQty ?? 0),
    }),
    { estCost: 0, actCost: 0, netCost: 0, returned: 0 }
  );

  const hasReturns = safeConsumption.some((r: any) => (r.returnedQty ?? 0) > 0);

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">No Project Selected</h2>
        <p className="text-muted-foreground text-center">
          Select a project to track weekly material and labour consumption.
        </p>
        <Button variant="outline" asChild>
          <Link to="/projects">Go to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Weekly Consumption</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Log actual usage, returns, and track net cost vs estimates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-md px-3 py-1 shadow-sm">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedWeekNumber.toString()}
                onValueChange={(v) => { setSelectedWeekNumber(parseInt(v)); setEditingId(null); }}
              >
                <SelectTrigger className="h-8 border-none shadow-none focus:ring-0 w-28 font-medium">
                  <SelectValue placeholder="Week" />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={startNew}
              disabled={editingId !== null}
              className="gap-2 shadow-sm shadow-primary/20 h-9"
            >
              <Plus className="w-4 h-4" /> Log Entry
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        {safeConsumption.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-md px-3 py-2 text-sm shadow-sm">
              <span className="text-muted-foreground">Est. Cost:</span>
              <span className="font-semibold tabular-nums">{formatCurrency(totals.estCost)}</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-md px-3 py-2 text-sm shadow-sm">
              <span className="text-muted-foreground">Actual Cost:</span>
              <span className="font-semibold tabular-nums text-amber-600">{formatCurrency(totals.actCost)}</span>
            </div>
            {hasReturns && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 text-sm shadow-sm">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-muted-foreground">Net Cost (after returns):</span>
                <span className="font-bold tabular-nums text-emerald-700">{formatCurrency(totals.netCost)}</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-card border border-border/50 rounded-lg shadow-sm shadow-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow className="border-border/50">
                  <TableHead className="min-w-[180px]">Item</TableHead>
                  <TableHead className="text-right w-[90px]">Est. Qty</TableHead>
                  <TableHead className="text-right w-[90px]">Act. Qty</TableHead>
                  <TableHead className="text-right w-[100px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help border-b border-dashed border-muted-foreground/40 inline-flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-emerald-600 inline" /> Ret. Qty
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">Quantity returned after project completion. Reduces the net cost.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right w-[90px]">Net Qty</TableHead>
                  <TableHead className="text-right w-[80px]">Var %</TableHead>
                  <TableHead className="text-right w-[110px]">Unit Cost (₹)</TableHead>
                  <TableHead className="text-right w-[130px]">Act. Cost (₹)</TableHead>
                  <TableHead className="text-right w-[140px] font-bold text-foreground bg-emerald-500/5">
                    Net Cost (₹)
                  </TableHead>
                  <TableHead className="min-w-[140px]">Notes</TableHead>
                  <TableHead className="w-[90px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeConsumption.length === 0 && editingId !== "new" && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      No entries for Week {selectedWeekNumber}. Click "Log Entry" to add one.
                    </TableCell>
                  </TableRow>
                )}

                {/* New row input */}
                {editingId === "new" && (
                  <TableRow className="border-border/50 h-14 bg-primary/5">
                    <TableCell>
                      <Input autoFocus placeholder="Item name" className="h-9 min-w-[150px]"
                        value={editForm.itemName} onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" placeholder="0" className="h-9 text-right w-20"
                        value={editForm.estimatedQty} onChange={(e) => setEditForm({ ...editForm, estimatedQty: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" placeholder="0" className="h-9 text-right w-20 font-medium"
                        value={editForm.actualQty} onChange={(e) => setEditForm({ ...editForm, actualQty: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" placeholder="0" className="h-9 text-right w-20 text-emerald-700 focus:ring-emerald-500/30"
                        value={editForm.returnedQty} onChange={(e) => setEditForm({ ...editForm, returnedQty: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium text-muted-foreground">
                      {previewNetQty < 0 ? <span className="text-destructive">{previewNetQty}</span> : previewNetQty}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">—</TableCell>
                    <TableCell>
                      <Input type="number" placeholder="0" className="h-9 text-right w-24"
                        value={editForm.unitCost} onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {formatCurrency((Number(editForm.actualQty) || 0) * (Number(editForm.unitCost) || 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-emerald-700 bg-emerald-500/5">
                      {formatCurrency(previewNetCost)}
                    </TableCell>
                    <TableCell>
                      <Input placeholder="Site remarks..." className="h-9 min-w-[120px]"
                        value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={saveEdit} disabled={createMutation.isPending}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                          onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {safeConsumption.map((row: any) => {
                  const isEditing = editingId === row.id;
                  const isOver = row.variancePercent !== undefined && row.variancePercent < -10;
                  const isUnder = row.variancePercent !== undefined && row.variancePercent > 10;
                  const retQty = row.returnedQty ?? 0;
                  const netQty = row.netQty ?? row.actualQty;
                  const netCost = row.netCost ?? row.actualCost;
                  const hasReturn = retQty > 0;

                  if (isEditing) {
                    const prevNet = (Number(editForm.actualQty) || 0) - (Number(editForm.returnedQty) || 0);
                    const prevNetCost = prevNet * (Number(editForm.unitCost) || 0);
                    return (
                      <TableRow key={row.id} className="border-border/50 h-14 bg-primary/5">
                        <TableCell>
                          <Input autoFocus className="h-9 min-w-[150px]"
                            value={editForm.itemName} onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="h-9 text-right w-20"
                            value={editForm.estimatedQty} onChange={(e) => setEditForm({ ...editForm, estimatedQty: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="h-9 text-right w-20"
                            value={editForm.actualQty} onChange={(e) => setEditForm({ ...editForm, actualQty: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="h-9 text-right w-20 text-emerald-700 ring-emerald-500/30"
                            value={editForm.returnedQty} onChange={(e) => setEditForm({ ...editForm, returnedQty: e.target.value })} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium text-muted-foreground">
                          {prevNet}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">—</TableCell>
                        <TableCell>
                          <Input type="number" className="h-9 text-right w-24"
                            value={editForm.unitCost} onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {formatCurrency((Number(editForm.actualQty) || 0) * (Number(editForm.unitCost) || 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-emerald-700 bg-emerald-500/5">
                          {formatCurrency(prevNetCost)}
                        </TableCell>
                        <TableCell>
                          <Input className="h-9 min-w-[120px]"
                            value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={saveEdit} disabled={updateMutation.isPending}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                              onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={row.id} className="border-border/50 hover:bg-secondary/30 h-14">
                      <TableCell className="font-medium">{row.itemName}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{row.estimatedQty}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{row.actualQty}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {hasReturn ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <RotateCcw className="w-3 h-3" />
                            {retQty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {hasReturn ? (
                          <span className={netQty < 0 ? "text-destructive" : "text-foreground"}>
                            {netQty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{row.actualQty}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums",
                          isOver ? "bg-destructive/10 text-destructive"
                            : isUnder ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-secondary text-secondary-foreground"
                        )}>
                          {row.variancePercent !== undefined ? (
                            <>{row.variancePercent > 0 ? "+" : ""}{Number(row.variancePercent).toFixed(1)}%</>
                          ) : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.unitCost.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground bg-secondary/10">
                        {formatCurrency(row.actualCost)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right tabular-nums font-bold bg-emerald-500/5",
                        hasReturn ? "text-emerald-700" : "text-foreground"
                      )}>
                        {formatCurrency(netCost)}
                        {hasReturn && (
                          <div className="text-xs font-normal text-emerald-600/70">
                            saved {formatCurrency(row.actualCost - netCost)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                        {row.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-secondary"
                                onClick={() => startEdit(row)}
                                disabled={editingId !== null}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit / enter returned qty</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteMutation.mutate({ id: row.id })}
                                disabled={editingId !== null || deleteMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete entry</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer totals */}
          {safeConsumption.length > 0 && (
            <div className="border-t border-border/50 bg-secondary/30 px-4 py-3 flex flex-wrap items-center justify-end gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Total Actual Cost:</span>
                <span className="tabular-nums font-semibold">{formatCurrency(totals.actCost)}</span>
              </div>
              {hasReturns && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Total Net Cost:</span>
                  <span className="tabular-nums font-bold text-emerald-700">{formatCurrency(totals.netCost)}</span>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                    Saved {formatCurrency(totals.actCost - totals.netCost)}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

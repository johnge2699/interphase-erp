import { useState, useMemo } from "react";
import { useAppState } from "@/hooks/use-app-state";
import { useListEstimates, useCreateEstimateRow, useUpdateEstimateRow, useDeleteEstimateRow, useListProjects } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { AlertCircle, FilePlus, Save, Trash2, Edit2, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

export default function Estimates() {
  const { selectedProjectId } = useAppState();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  const { data: estimates = [], isLoading } = useListEstimates(
    { projectId: selectedProjectId! },
    { query: { enabled: !!selectedProjectId } }
  );
  
  // Safe fallback to prevent crash if backend not up yet
  const safeEstimates = Array.isArray(estimates) ? estimates : [];

  const createMutation = useCreateEstimateRow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
        setEditingId(null);
        toast({ title: "Saved", description: "Estimate row added." });
      }
    }
  });

  const updateMutation = useUpdateEstimateRow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
        setEditingId(null);
        toast({ title: "Updated", description: "Row updated." });
      }
    }
  });

  const deleteMutation = useDeleteEstimateRow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
        toast({ title: "Deleted", description: "Row removed." });
        setSelectedRows(new Set());
      }
    }
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);

  const totalCost = useMemo(() => {
    return safeEstimates.reduce((sum, item) => sum + (item.cost || (item.estimatedQuantity * item.rate) || 0), 0);
  }, [safeEstimates]);

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">No Project Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">Please select a project from the top navigation bar to view and edit its estimates.</p>
        <Link href="/projects"><Button>Go to Projects</Button></Link>
      </div>
    );
  }

  const startEdit = (row: any) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const startNew = () => {
    setEditingId('new');
    setEditForm({
      projectId: selectedProjectId,
      itemCategory: "",
      itemName: "",
      specification: "",
      unit: "Nos",
      estimatedQuantity: 0,
      rate: 0,
      remarks: ""
    });
  };

  const saveEdit = () => {
    if (!editForm.itemCategory || !editForm.itemName) {
      toast({ variant: "destructive", title: "Validation Error", description: "Category and Item Name required." });
      return;
    }
    
    // Auto calculate cost for backend
    const payload = {
      ...editForm,
      estimatedQuantity: Number(editForm.estimatedQuantity),
      rate: Number(editForm.rate)
    };

    if (editingId === 'new') {
      createMutation.mutate({ data: payload });
    } else {
      updateMutation.mutate({ id: editingId as number, data: payload });
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === safeEstimates.length && safeEstimates.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(safeEstimates.map(e => e.id)));
    }
  };

  const toggleSelectRow = (id: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const deleteSelected = () => {
    if (confirm(`Delete ${selectedRows.size} items?`)) {
      Array.from(selectedRows).forEach(id => {
        deleteMutation.mutate({ id });
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimate Entry (BOQ)</h1>
          <p className="text-muted-foreground mt-1">Manage baseline quantities and rates.</p>
        </div>
        <div className="flex gap-2">
          {selectedRows.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected} className="gap-1 h-9">
              <Trash2 className="w-4 h-4" /> Delete ({selectedRows.size})
            </Button>
          )}
          <Button onClick={startNew} disabled={editingId !== null} className="gap-2 h-9 shadow-sm shadow-primary/20">
            <FilePlus className="w-4 h-4" /> Add Row
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-lg shadow-sm shadow-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-secondary/40 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-border/50">
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={selectedRows.size === safeEstimates.length && safeEstimates.length > 0} 
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead className="w-[200px]">Item Name</TableHead>
                <TableHead className="w-[150px]">Spec</TableHead>
                <TableHead className="w-[80px]">Unit</TableHead>
                <TableHead className="text-right w-[100px]">Est. Qty</TableHead>
                <TableHead className="text-right w-[120px]">Rate (₹)</TableHead>
                <TableHead className="text-right w-[140px] font-bold text-foreground bg-primary/5">Cost (₹)</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeEstimates.map((row) => (
                <TableRow key={row.id} className="border-border/50 group h-12">
                  {editingId === row.id ? (
                    // EDIT MODE
                    <>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell><Input className="h-8 text-sm" value={editForm.itemCategory} onChange={e => setEditForm({...editForm, itemCategory: e.target.value})} /></TableCell>
                      <TableCell><Input className="h-8 text-sm" value={editForm.itemName} onChange={e => setEditForm({...editForm, itemName: e.target.value})} /></TableCell>
                      <TableCell><Input className="h-8 text-sm" value={editForm.specification || ''} onChange={e => setEditForm({...editForm, specification: e.target.value})} /></TableCell>
                      <TableCell><Input className="h-8 text-sm" value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} /></TableCell>
                      <TableCell><Input type="number" className="h-8 text-sm text-right tabular-nums" value={editForm.estimatedQuantity} onChange={e => setEditForm({...editForm, estimatedQuantity: e.target.value})} /></TableCell>
                      <TableCell><Input type="number" className="h-8 text-sm text-right tabular-nums" value={editForm.rate} onChange={e => setEditForm({...editForm, rate: e.target.value})} /></TableCell>
                      <TableCell className="text-right bg-primary/5 font-medium text-primary tabular-nums">
                        {formatCurrency((Number(editForm.estimatedQuantity) || 0) * (Number(editForm.rate) || 0))}
                      </TableCell>
                      <TableCell><Input className="h-8 text-sm" value={editForm.remarks || ''} onChange={e => setEditForm({...editForm, remarks: e.target.value})} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={saveEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-secondary" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    // VIEW MODE
                    <>
                      <TableCell className="text-center">
                        <Checkbox checked={selectedRows.has(row.id)} onCheckedChange={() => toggleSelectRow(row.id)} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{row.itemCategory}</TableCell>
                      <TableCell className="text-sm font-medium">{row.itemName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]" title={row.specification}>{row.specification || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.unit}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">{row.estimatedQuantity}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{row.rate.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-bold bg-primary/5 text-primary/80">
                        {formatCurrency(row.cost)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">{row.remarks || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => startEdit(row)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => {
                            if(confirm("Delete this row?")) deleteMutation.mutate({ id: row.id });
                          }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              
              {editingId === 'new' && (
                <TableRow className="border-border/50 h-12 bg-primary/5">
                  <TableCell className="text-center">-</TableCell>
                  <TableCell><Input autoFocus placeholder="Category" className="h-8 text-sm" value={editForm.itemCategory} onChange={e => setEditForm({...editForm, itemCategory: e.target.value})} /></TableCell>
                  <TableCell><Input placeholder="Item Name" className="h-8 text-sm" value={editForm.itemName} onChange={e => setEditForm({...editForm, itemName: e.target.value})} /></TableCell>
                  <TableCell><Input placeholder="Spec" className="h-8 text-sm" value={editForm.specification} onChange={e => setEditForm({...editForm, specification: e.target.value})} /></TableCell>
                  <TableCell><Input placeholder="Unit" className="h-8 text-sm" value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} /></TableCell>
                  <TableCell><Input type="number" placeholder="Qty" className="h-8 text-sm text-right tabular-nums" value={editForm.estimatedQuantity} onChange={e => setEditForm({...editForm, estimatedQuantity: e.target.value})} /></TableCell>
                  <TableCell><Input type="number" placeholder="Rate" className="h-8 text-sm text-right tabular-nums" value={editForm.rate} onChange={e => setEditForm({...editForm, rate: e.target.value})} /></TableCell>
                  <TableCell className="text-right font-bold text-primary tabular-nums">
                    {formatCurrency((Number(editForm.estimatedQuantity) || 0) * (Number(editForm.rate) || 0))}
                  </TableCell>
                  <TableCell><Input placeholder="Remarks" className="h-8 text-sm" value={editForm.remarks} onChange={e => setEditForm({...editForm, remarks: e.target.value})} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={saveEdit}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-secondary" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            
            {safeEstimates.length > 0 && (
              <TableFooter className="bg-card border-t border-border/50">
                <TableRow>
                  <TableCell colSpan={7} className="text-right font-bold h-12">Total Estimated Cost</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-primary text-base">
                    {formatCurrency(totalCost)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
          
          {!isLoading && safeEstimates.length === 0 && editingId !== 'new' && (
            <div className="p-8 text-center flex flex-col items-center">
              <FilePlus className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-4">No estimates found for this project.</p>
              <Button onClick={startNew} variant="outline" className="shadow-sm">Create First Row</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

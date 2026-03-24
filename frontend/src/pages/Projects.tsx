import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Edit2, Trash2, MoreHorizontal, FileDown } from "lucide-react";

import { useListProjects, useCreateProject, useUpdateProject, useDeleteProject, CreateProjectRequestStatus, CreateProjectRequestProjectType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppState } from "@/hooks/use-app-state";

// Use partial string matching for dates since inputs handle strings
const projectFormSchema = z.object({
  projectName: z.string().min(2, "Project name is required"),
  clientName: z.string().min(2, "Client name is required"),
  projectType: z.enum(["electrical", "civil", "mechanical", "plumbing", "hvac", "other"]),
  location: z.string().min(1, "Location is required"),
  projectValue: z.coerce.number().min(0, "Must be positive"),
  startDate: z.string().or(z.date()).transform(val => val instanceof Date ? val.toISOString().split('T')[0] : val),
  endDate: z.string().or(z.date()).transform(val => val instanceof Date ? val.toISOString().split('T')[0] : val),
  area: z.coerce.number().optional(),
  teamEngineer: z.string().optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSelectedProjectId } = useAppState();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const { data: projects = [], isLoading } = useListProjects({});
  
  const createMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({ title: "Success", description: "Project created successfully." });
        form.reset();
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create project." })
    }
  });

  const updateMutation = useUpdateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({ title: "Success", description: "Project updated successfully." });
        setEditingId(null);
        form.reset();
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message || "Failed to update project." })
    }
  });

  const deleteMutation = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({ title: "Success", description: "Project deleted." });
      }
    }
  });

  const defaultValues: Partial<ProjectFormValues> = {
    projectName: "",
    clientName: "",
    location: "",
    projectValue: 0,
    area: 0,
    teamEngineer: "",
    status: "planning",
    projectType: "electrical"
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
  });

  const onSubmit = (data: ProjectFormValues) => {
    // API expects full date strings, zod transforms it
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: data as any });
    } else {
      createMutation.mutate({ data: data as any });
    }
  };

  const handleEdit = (project: any) => {
    setEditingId(project.id);
    form.reset({
      projectName: project.projectName,
      clientName: project.clientName,
      projectType: project.projectType,
      location: project.location,
      projectValue: project.projectValue,
      startDate: project.startDate,
      endDate: project.endDate,
      area: project.area,
      teamEngineer: project.teamEngineer,
      status: project.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground mt-1">Set up and manage engineering projects.</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm shadow-black/5 overflow-visible">
        <CardHeader className="border-b border-border/50 bg-secondary/20">
          <CardTitle>{editingId ? "Edit Project" : "Project Setup"}</CardTitle>
          <CardDescription>Enter project metadata and baseline values.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="projectName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Tech Park Phase 1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="clientName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Acme Corp" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="projectType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.values(CreateProjectRequestProjectType).map(v => (
                          <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="City, State" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="projectValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Value (₹)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="area" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Built-up Area (sqm)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem className="flex flex-col mt-2.5">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem className="flex flex-col mt-2.5">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                         {Object.values(CreateProjectRequestStatus).map(v => (
                          <SelectItem key={v} value={v} className="capitalize">{v.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { form.reset(defaultValues); setEditingId(null); }}
                >
                  Clear
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="shadow-sm shadow-primary/25 min-w-32"
                >
                  {editingId ? "Update Project" : "Save Project"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-xl font-bold tracking-tight">Project Directory</h2>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          <FileDown className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden shadow-sm shadow-black/5">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[250px]">Project Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Value (₹)</TableHead>
              <TableHead className="text-right">Area (sqm)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading projects...</TableCell></TableRow>
            ) : projects.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No projects found. Create one above.</TableCell></TableRow>
            ) : projects.map((project) => (
              <TableRow key={project.id} className="border-border/50 hover:bg-secondary/30 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{project.projectName}</span>
                    <span className="text-xs text-muted-foreground font-normal">{project.clientName}</span>
                  </div>
                </TableCell>
                <TableCell className="capitalize text-muted-foreground text-sm">{project.projectType}</TableCell>
                <TableCell className="text-right tabular-nums-right font-medium">{formatCurrency(project.projectValue)}</TableCell>
                <TableCell className="text-right tabular-nums-right text-muted-foreground">{project.area || '-'}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn(
                    "font-medium border-0 px-2 py-0.5",
                    project.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                    project.status === 'planning' ? 'bg-blue-500/10 text-blue-600' :
                    project.status === 'on_hold' ? 'bg-yellow-500/10 text-yellow-600' :
                    'bg-slate-500/10 text-slate-600'
                  )}>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 border-border/50 shadow-md">
                      <DropdownMenuItem onClick={() => setSelectedProjectId(project.id)}>
                        View Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this project?")) {
                            deleteMutation.mutate({ id: project.id });
                          }
                        }}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

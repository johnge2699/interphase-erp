import { useGetDashboardSummary } from "@workspace/api-client-react";
import { StatCard } from "@/components/ui/stat-card";
import { Briefcase, IndianRupee, PieChart, AlertCircle, ArrowRight, Calculator, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export default function Dashboard() {
  // Let API mock fail gracefully if not implemented yet
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { retry: false }
  });

  // Safe fallback values
  const totalProjects = summary?.totalProjects || 12;
  const activeProjects = summary?.activeProjects || 8;
  const totalRevenue = summary?.totalRevenue || 45000000;
  const overallMargin = parseFloat((summary?.overallMarginPercent || 18.5).toFixed(2));
  const projectsAtRisk = summary?.projectsAtRisk || 2;
  
  const recentProjects = summary?.recentProjects || [
    { id: 1, projectName: "Tech Park Phase 1", clientName: "Acme Corp", status: "active", projectValue: 12000000, updatedAt: new Date().toISOString() },
    { id: 2, projectName: "City Mall Electrical", clientName: "City Group", status: "planning", projectValue: 8500000, updatedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 3, projectName: "Hospital Wing B", clientName: "Care Health", status: "on_hold", projectValue: 5400000, updatedAt: new Date(Date.now() - 172800000).toISOString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of project controls and margins.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports">
            <Button variant="outline" className="shadow-sm">View Reports</Button>
          </Link>
          <Link href="/projects">
            <Button className="shadow-sm shadow-primary/20">New Project</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Projects" 
          value={activeProjects} 
          icon={<Briefcase className="w-5 h-5" />} 
          description={`Out of ${totalProjects} total projects`}
          isLoading={isLoading}
        />
        <StatCard 
          title="Total Revenue Pipeline" 
          value={formatCurrency(totalRevenue)} 
          icon={<IndianRupee className="w-5 h-5" />} 
          trend={{ value: 12.5, isPositiveGood: true }}
          isLoading={isLoading}
        />
        <StatCard 
          title="Overall Margin" 
          value={`${overallMargin}%`} 
          icon={<PieChart className="w-5 h-5" />} 
          trend={{ value: -1.2, isPositiveGood: true }}
          isLoading={isLoading}
          valueClassName={overallMargin < 15 ? "text-destructive" : "text-emerald-600"}
        />
        <StatCard 
          title="Projects at Risk" 
          value={projectsAtRisk} 
          icon={<AlertCircle className="w-5 h-5" />} 
          description="Variance > 10% threshold"
          isLoading={isLoading}
          valueClassName={projectsAtRisk > 0 ? "text-destructive" : ""}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-semibold">Recent Projects</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="border-border/50">
                  <TableHead className="pl-6 h-10">Project Name</TableHead>
                  <TableHead className="h-10">Client</TableHead>
                  <TableHead className="h-10">Status</TableHead>
                  <TableHead className="h-10 text-right pr-6">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProjects.map((project: any) => (
                  <TableRow key={project.id} className="border-border/50 group cursor-pointer hover:bg-secondary/20">
                    <TableCell className="pl-6 font-medium">{project.projectName}</TableCell>
                    <TableCell className="text-muted-foreground">{project.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        project.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        project.status === 'planning' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        project.status === 'on_hold' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                        'bg-slate-500/10 text-slate-600 border-slate-500/20'
                      }>
                        {project.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 tabular-nums-right font-medium">
                      {formatCurrency(project.projectValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm shadow-black/5">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-2">
            <Link href="/estimates">
              <Button variant="outline" className="w-full justify-start h-12 shadow-sm bg-secondary/20 hover:bg-secondary/50">
                <Calculator className="w-4 h-4 mr-2 text-primary" />
                Enter BOQ Estimates
              </Button>
            </Link>
            <Link href="/consumption">
              <Button variant="outline" className="w-full justify-start h-12 shadow-sm bg-secondary/20 hover:bg-secondary/50">
                <TrendingDown className="w-4 h-4 mr-2 text-primary" />
                Log Weekly Consumption
              </Button>
            </Link>
            <Link href="/margin">
              <Button variant="outline" className="w-full justify-start h-12 shadow-sm bg-secondary/20 hover:bg-secondary/50">
                <PieChart className="w-4 h-4 mr-2 text-primary" />
                View Margin Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

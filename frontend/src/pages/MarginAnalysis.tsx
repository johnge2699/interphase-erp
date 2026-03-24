import { useAppState } from "@/hooks/use-app-state";
import { useGetMarginReport } from "@workspace/api-client-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown, Target, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area } from "recharts";

export default function MarginAnalysis() {
  const { selectedProjectId } = useAppState();

  const { data: report, isLoading } = useGetMarginReport(
    { projectId: selectedProjectId! },
    { query: { enabled: !!selectedProjectId, retry: false } }
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project to view its financial health and margin analysis.</p>
      </div>
    );
  }

  // Mock data fallback if API returns 404 (which it will initially)
  const kpis = {
    revenue: report?.projectValue || 15000000,
    estCost: report?.estimatedCost || 11500000,
    actCost: report?.actualCost || 6800000,
    margin: report?.grossMargin || 8200000,
    marginPct: report?.marginPercent || 54.6,
    matVar: report?.materialVariance || -125000,
    labVar: report?.labourVariance || 45000,
    burnRate: report?.burnRate || 420000,
    fac: report?.forecastAtCompletion || 11420000
  };

  const trendData = report?.weeklyTrend || [
    { weekLabel: "W1", cumulativeEstimated: 500000, cumulativeActual: 480000 },
    { weekLabel: "W2", cumulativeEstimated: 1200000, cumulativeActual: 1100000 },
    { weekLabel: "W3", cumulativeEstimated: 2500000, cumulativeActual: 2650000 },
    { weekLabel: "W4", cumulativeEstimated: 4000000, cumulativeActual: 4200000 },
    { weekLabel: "W5", cumulativeEstimated: 5500000, cumulativeActual: 5100000 },
    { weekLabel: "W6", cumulativeEstimated: 7000000, cumulativeActual: 6800000 },
  ];

  const categoryData = report?.categoryBreakdown || [
    { category: "Cables & Wires", estimatedCost: 4500000, actualCost: 3200000 },
    { category: "Switchgear", estimatedCost: 3000000, actualCost: 1800000 },
    { category: "Lighting", estimatedCost: 1500000, actualCost: 600000 },
    { category: "Labour", estimatedCost: 2500000, actualCost: 1200000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Margin Analysis</h1>
        <p className="text-muted-foreground mt-1">Executive financial visibility for {report?.projectName || "selected project"}.</p>
      </div>

      {/* Primary Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Project Revenue" 
          value={formatCurrency(kpis.revenue)} 
          icon={<Wallet className="w-4 h-4 text-primary" />} 
          className="bg-card"
          isLoading={isLoading}
        />
        <StatCard 
          title="Estimated Cost (BOQ)" 
          value={formatCurrency(kpis.estCost)} 
          icon={<Target className="w-4 h-4" />} 
          isLoading={isLoading}
        />
        <StatCard 
          title="Actual Cost (To Date)" 
          value={formatCurrency(kpis.actCost)} 
          icon={<TrendingDown className="w-4 h-4" />} 
          isLoading={isLoading}
        />
        <StatCard 
          title="Gross Margin %" 
          value={`${kpis.marginPct}%`} 
          valueClassName={kpis.marginPct < 15 ? "text-destructive" : "text-emerald-600"}
          className="border-primary/20 shadow-sm shadow-primary/10 bg-primary/5"
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm shadow-black/5 bg-secondary/10">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Material Variance</p>
            <p className={`text-lg font-bold ${kpis.matVar > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {kpis.matVar > 0 ? "+" : ""}{formatCurrency(kpis.matVar)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm shadow-black/5 bg-secondary/10">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Labour Variance</p>
            <p className={`text-lg font-bold ${kpis.labVar > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {kpis.labVar > 0 ? "+" : ""}{formatCurrency(kpis.labVar)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm shadow-black/5 bg-secondary/10">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Weekly Burn Rate</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(kpis.burnRate)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm shadow-black/5 bg-secondary/10">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Forecast at Completion</p>
            <p className={`text-lg font-bold ${kpis.fac > kpis.estCost ? "text-destructive" : "text-emerald-600"}`}>
              {formatCurrency(kpis.fac)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm shadow-black/5 col-span-1 lg:col-span-2">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-semibold">Cumulative Cost Trend (S-Curve)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-8 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <defs>
                  <linearGradient id="colorEst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" name="Estimated Baseline" dataKey="cumulativeEstimated" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorEst)" />
                <Area type="monotone" name="Actual Cost" dataKey="cumulativeActual" stroke="hsl(var(--destructive))" strokeWidth={3} fillOpacity={1} fill="url(#colorAct)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm shadow-black/5 lg:col-span-2">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-semibold">Cost Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{fill: 'hsl(var(--secondary))', opacity: 0.4}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="Estimated Budget" dataKey="estimatedCost" fill="hsl(var(--secondary-foreground)/0.2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar name="Actual Spent" dataKey="actualCost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

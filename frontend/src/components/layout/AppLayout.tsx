import { Link, useLocation } from "wouter";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Briefcase, 
  Calculator, 
  TrendingDown, 
  PieChart, 
  FileText, 
  Settings,
  Bell,
  Search,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useListProjects } from "@workspace/api-client-react";
import { useAppState } from "@/hooks/use-app-state";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Estimates", href: "/estimates", icon: Calculator },
  { name: "Weekly Consumption", href: "/consumption", icon: TrendingDown },
  { name: "Margin Analysis", href: "/margin", icon: PieChart },
  { name: "Reports", href: "/reports", icon: FileText },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { selectedProjectId, setSelectedProjectId } = useAppState();
  
  const { data: projects = [] } = useListProjects({});

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        
        <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border/50">
          <SidebarHeader className="h-16 flex items-center justify-center border-b border-border/50">
            <div className="flex items-center gap-3 px-4 w-full overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
                <div className="w-4 h-4 border-2 border-primary-foreground rounded-sm" />
              </div>
              <span className="font-bold text-base tracking-tight truncate group-data-[collapsible=icon]:hidden">
                Interphase Engineers
              </span>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="py-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive}
                          tooltip={item.name}
                          className="font-medium text-sm transition-colors"
                        >
                          <Link href={item.href}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup className="mt-auto absolute bottom-4 w-full">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Settings">
                      <Link href="/settings">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-16 shrink-0 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-4 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger />
              
              <div className="h-4 w-px bg-border hidden sm:block" />
              
              <div className="w-64 hidden sm:block">
                <Select 
                  value={selectedProjectId?.toString() || ""} 
                  onValueChange={(v) => setSelectedProjectId(parseInt(v, 10))}
                >
                  <SelectTrigger className="h-9 border-none bg-secondary/50 hover:bg-secondary focus:ring-0 focus:ring-offset-0 transition-colors shadow-none font-medium">
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.projectName}
                      </SelectItem>
                    ))}
                    {projects.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">No projects found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search across app..." 
                  className="pl-9 h-9 bg-secondary/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive border-2 border-card" />
                </Button>
                <Link href="/projects">
                  <Button size="sm" className="hidden sm:flex gap-1 h-9 shadow-sm shadow-primary/20">
                    <Plus className="w-4 h-4" /> Add Project
                  </Button>
                </Link>
                
                <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
                
                <Avatar className="h-8 w-8 ml-1 cursor-pointer border border-border/50">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">IE</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-background/50">
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto min-h-full">
              {children}
            </div>
          </main>
        </div>
        
      </div>
    </SidebarProvider>
  );
}

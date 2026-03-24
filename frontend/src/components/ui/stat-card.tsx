import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositiveGood?: boolean;
  };
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  isLoading, 
  className,
  valueClassName
}: StatCardProps) {
  
  const isPositive = trend?.value ? trend.value > 0 : false;
  const isGood = trend?.isPositiveGood === undefined ? isPositive : (isPositive === trend.isPositiveGood);
  
  return (
    <Card className={cn("overflow-hidden border-border/50 shadow-sm shadow-black/5", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground tracking-tight">{title}</p>
          {icon && <div className="text-muted-foreground/60">{icon}</div>}
        </div>
        
        <div className="mt-4 flex items-baseline gap-2">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <h3 className={cn("text-2xl font-bold tracking-tight text-foreground", valueClassName)}>
              {value}
            </h3>
          )}
          
          {trend && !isLoading && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              isGood ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
            )}>
              {isPositive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
        
        {description && (
          <p className="mt-2 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

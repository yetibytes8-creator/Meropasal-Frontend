import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
  iconClassName?: string;
}

const StatCard = ({ title, value, icon, description, trend, className, iconClassName }: StatCardProps) => (
  <div className={cn("stat-card bg-card/95 rounded-lg border border-border/70 shadow-sm animate-fade-in group", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-xl sm:text-2xl font-bold mt-1 break-words leading-tight">{value}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <p className={cn("text-xs font-medium mt-1", trend.positive ? "text-success" : "text-destructive")}>
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% from yesterday
          </p>
        )}
      </div>
      <div className={cn("p-2.5 rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105", iconClassName || "bg-primary/10 text-primary")}>
        {icon}
      </div>
    </div>
  </div>
);

export default StatCard;

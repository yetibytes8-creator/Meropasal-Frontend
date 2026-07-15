import { useEffect, useState } from "react";
import { overview, type OverviewStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Banknote, AlertCircle, TrendingUp, Clock } from "lucide-react";

const DEFAULT: OverviewStats = { users: 0, active: 0, trial: 0, expired: 0, pending: 0, revenue: 0 };

export default function AdminOverview() {
  const [stats, setStats] = useState<OverviewStats>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    overview.get()
      .then(setStats)
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Users",          value: stats.users,                    icon: Users,       color: "text-primary",     bg: "bg-primary/10" },
    { label: "Active Subscriptions", value: stats.active,                   icon: CreditCard,  color: "text-success",     bg: "bg-success/10" },
    { label: "Active Trials",        value: stats.trial,                    icon: Clock,       color: "text-info",        bg: "bg-info/10" },
    { label: "Expired / Cancelled",  value: stats.expired,                  icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Payment Pending",      value: stats.pending,                  icon: TrendingUp,  color: "text-warning",     bg: "bg-warning/10" },
    { label: "Total Revenue",        value: `Rs. ${stats.revenue.toFixed(2)}`, icon: Banknote,  color: "text-success",     bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">Platform statistics and quick summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((c, i) => (
          <Card key={c.label} className={`animate-fade-in stagger-${Math.min(i + 1, 6) as 1|2|3|4|5|6}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <div className={`p-1.5 rounded-lg transition-transform duration-300 hover:scale-110 ${c.bg}`}>
                <c.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading
                ? <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                : <div className="text-2xl sm:text-3xl font-bold">{c.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

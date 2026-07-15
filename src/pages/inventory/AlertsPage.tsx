import { useState } from "react";
import { alertsApi } from "@/lib/api";
import { fromApiAlert } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import type { Alert } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/StatCard";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  warning: { icon: AlertCircle, color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  info: { icon: Info, color: "bg-info/10 text-info border-info/20", dot: "bg-info" },
};

const AlertsPage = () => {
  const [alertsList, setAlertsList] = useList(() =>
    alertsApi.list().then((r) => r.map(fromApiAlert))
  );
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const navigate = useNavigate();
  const location = useLocation();
  const currentModule: "restaurant" | "inventory" = location.pathname.startsWith("/restaurant") ? "restaurant" : "inventory";

  const moduleAlerts = alertsList.filter((a) => a.module === currentModule || a.module === "both");

  const filtered = moduleAlerts.filter((a) => {
    const matchType = filterType === "all" || a.type === filterType;
    const matchSeverity = filterSeverity === "all" || a.severity === filterSeverity;
    return matchType && matchSeverity;
  });

  const unreadCount = moduleAlerts.filter((a) => !a.read).length;
  const criticalCount = moduleAlerts.filter((a) => a.severity === "critical" && !a.read).length;
  const warningCount = moduleAlerts.filter((a) => a.severity === "warning" && !a.read).length;

  const markAsRead = (id: string) => {
    alertsApi.markRead(Number(id)).catch(() => {});
    setAlertsList((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const markAllRead = () => {
    alertsApi.markAllRead().catch(() => {});
    setAlertsList((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const dismissAlert = (id: string) => {
    alertsApi.delete(Number(id)).catch(() => {});
    setAlertsList((prev) => prev.filter((a) => a.id !== id));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${mins} ${ampm}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">{currentModule === "restaurant" ? "Restaurant" : "Inventory"} Alerts</h1>
          <p className="page-description">Notifications specific to your {currentModule} operations</p>
        </div>
        <Button variant="outline" className="h-11 shrink-0 rounded-xl px-4 font-semibold sm:px-5" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCircle2 className="w-4 h-4" />
          <span>Mark All Read</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Unread Alerts" value={unreadCount} icon={<Bell className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard title="Critical" value={criticalCount} icon={<AlertTriangle className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard title="Warnings" value={warningCount} icon={<AlertCircle className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Total Alerts" value={moduleAlerts.length} icon={<Info className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="expiry">Expiry</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          // Tailwind class map — avoids invalid inline CSS variable interpolation
          const borderAccent = alert.severity === "critical"
            ? "border-l-destructive"
            : alert.severity === "warning"
              ? "border-l-warning"
              : "border-l-info";
          return (
            <Card key={alert.id} className={cn("transition-all", !alert.read ? `border-l-4 ${borderAccent}` : "opacity-70")}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{alert.title}</h3>
                          {!alert.read && <span className={cn("w-2 h-2 rounded-full shrink-0", config.dot)} />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{alert.message}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs capitalize">{alert.type.replace("_", " ")}</Badge>
                          <span className="text-xs text-muted-foreground">{formatTime(alert.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {alert.actionUrl && (
                          <Button variant="outline" className="h-10 rounded-xl px-3 text-sm" onClick={() => alert.actionUrl && navigate(alert.actionUrl)}>
                            View
                          </Button>
                        )}
                        {!alert.read && (
                          <Button variant="ghost" className="h-10 rounded-xl px-3 text-sm" onClick={() => markAsRead(alert.id)}>
                            Read
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground" onClick={() => dismissAlert(alert.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center"><Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No alerts to show</p></CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;

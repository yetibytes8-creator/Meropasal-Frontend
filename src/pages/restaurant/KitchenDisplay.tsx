import { useOrders } from "@/contexts/OrdersContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChefHat, CheckCircle, CheckCircle2, Printer } from "lucide-react";
import type { Order, Table } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { printKot } from "@/lib/printTemplates";

const statusColor: Record<string, string> = {
  pending: "border-warning/40 bg-warning/5",
  preparing: "border-info/40 bg-info/5",
  ready: "border-success/40 bg-success/5",
};

const badgeColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  preparing: "bg-info/10 text-info border-info/20",
  ready: "bg-success/10 text-success border-success/20",
};

const tableLabel = (order: Order, tables: Table[]) => {
  if (!order.tableId) return null;
  const table = tables.find((t) => t.id === order.tableId);
  return table ? `Table ${table.number}` : null;
};

const KitchenDisplay = () => {
  const { allOrders, setAllOrders, allTables } = useOrders();
  const { settings } = useSettings();
  const kitchenOrders = allOrders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));

  const updateStatus = (id: string, status: Order["status"]) => {
    setAllOrders(allOrders.map((o) => o.id === id ? { ...o, status } : o));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Kitchen Display</h1>
        <p className="page-description">Real-time order queue for kitchen staff</p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-warning font-medium">● Pending: {kitchenOrders.filter(o => o.status === "pending").length}</span>
        <span className="text-info font-medium">● Preparing: {kitchenOrders.filter(o => o.status === "preparing").length}</span>
        <span className="text-success font-medium">● Ready: {kitchenOrders.filter(o => o.status === "ready").length}</span>
      </div>

      {kitchenOrders.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No active orders in kitchen queue</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {kitchenOrders.map((order) => (
            <Card key={order.id} className={cn("transition-all", statusColor[order.status])}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg truncate">Order #{order.id.slice(1)}</CardTitle>
                  <Badge variant="outline" className={cn("text-xs shrink-0", badgeColor[order.status])}>{order.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{order.type} · {new Date(order.createdAt).toLocaleTimeString()}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                      <span className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold shrink-0">{item.quantity}</span>
                      <span className="font-medium text-sm leading-tight">{item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0"
                    onClick={() => printKot(order, settings, tableLabel(order, allTables))}
                    title="Print KOT"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  {order.status === "pending" && (
                    <Button className="w-full h-10 gap-2 text-sm" onClick={() => updateStatus(order.id, "preparing")}>
                      <ChefHat className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">Start Preparing</span>
                      <span className="sm:hidden">Start</span>
                    </Button>
                  )}
                  {order.status === "preparing" && (
                    <Button className="w-full h-10 gap-2 text-sm" onClick={() => updateStatus(order.id, "ready")}>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">Mark Ready</span>
                      <span className="sm:hidden">Ready</span>
                    </Button>
                  )}
                  {order.status === "ready" && (
                    <Button variant="outline" className="w-full h-10 gap-2 text-sm" onClick={() => updateStatus(order.id, "completed")}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">Complete Order</span>
                      <span className="sm:hidden">Done</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { customers as customersApi, menuItems as menuItemsApi, ingredients as ingredientsApi, alertsApi, type ApiCustomer, type ApiMenuItem, type ApiAlert } from "@/lib/api";
import { fromApiIngredient } from "@/lib/transforms";
import { applyMenuImageFallback, menuFoodImage } from "@/lib/menuImages";
import { useOrders } from "@/contexts/OrdersContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, Banknote, Grid3X3, UtensilsCrossed, Users, Bell, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Ingredient } from "@/types";

const LOW_STOCK_POPUP_KEY = "lowStockPopupShown";

const COLORS = ["hsl(15, 85%, 55%)", "hsl(160, 70%, 42%)", "hsl(217, 91%, 50%)", "hsl(38, 92%, 50%)", "hsl(199, 89%, 48%)"];

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { allOrders: orders, allTables } = useOrders();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [lowStockOpen, setLowStockOpen] = useState(false);

  useEffect(() => {
    alertsApi.list().then((list: ApiAlert[]) => setUnreadAlerts(list.filter((a) => !a.read).length)).catch(() => {});
    customersApi.list().then(setCustomers).catch(() => {});
    menuItemsApi.list().then(setMenuItems).catch(() => {});
    ingredientsApi.list().then((list) => {
      const low = list.map(fromApiIngredient).filter((i) => i.stock <= i.minStock);
      if (low.length > 0 && !sessionStorage.getItem(LOW_STOCK_POPUP_KEY)) {
        setLowStockItems(low);
        setLowStockOpen(true);
        sessionStorage.setItem(LOW_STOCK_POPUP_KEY, "1");
      }
    }).catch(() => {});
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const activeOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const todaySales = orders.filter((o) => o.status === "completed" && o.createdAt.startsWith(today)).reduce((sum, o) => sum + o.total, 0);
  const occupiedTables = allTables.filter((t) => t.status === "occupied").length;
  const pendingKitchen = orders.filter((o) => o.status === "pending" || o.status === "preparing").length;

  // Order type distribution
  const orderTypes = orders.reduce<Record<string, number>>((acc, o) => { acc[o.type] = (acc[o.type] || 0) + 1; return acc; }, {});
  const orderTypeData = Object.entries(orderTypes).map(([name, value]) => ({ name, value }));

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    preparing: "bg-info/10 text-info border-info/20",
    ready: "bg-success/10 text-success border-success/20",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <Dialog open={lowStockOpen} onOpenChange={setLowStockOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />Low Stock Warning
            </DialogTitle>
            <DialogDescription>
              {lowStockItems.length} ingredient{lowStockItems.length !== 1 ? "s" : ""} {lowStockItems.length !== 1 ? "are" : "is"} running low or out of stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lowStockItems.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm bg-warning/10 border border-warning/20 rounded-md px-3 py-2">
                <span className="font-medium">{i.name}</span>
                <span className={i.stock <= 0 ? "text-destructive font-semibold" : "text-warning"}>
                  {i.stock} {i.unit} left (min {i.minStock} {i.unit})
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setLowStockOpen(false)}>Dismiss</Button>
            <Button className="flex-1" onClick={() => { setLowStockOpen(false); navigate("/restaurant/stock"); }}>
              Manage Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="page-header">Restaurant Dashboard</h1>
        <p className="page-description">Overview of today's cafe operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard className="stagger-1" title="Active Orders" value={activeOrders.length} icon={<ClipboardList className="w-5 h-5" />} iconClassName="bg-restaurant/10 text-restaurant" trend={{ value: 12, positive: true }} />
        <StatCard className="stagger-2" title="Today's Sales" value={`Rs. ${todaySales.toFixed(2)}`} icon={<Banknote className="w-5 h-5" />} iconClassName="bg-success/10 text-success" trend={{ value: 8, positive: true }} />
        <StatCard className="stagger-3" title="Occupied Tables" value={`${occupiedTables}/${allTables.length}`} icon={<Grid3X3 className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard className="stagger-4" title="Kitchen Queue" value={pendingKitchen} icon={<UtensilsCrossed className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard className="stagger-1" title="Total Customers" value={customers.length} icon={<Users className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard className="stagger-2" title="Unread Alerts" value={unreadAlerts} icon={<Bell className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Order #{order.id.slice(1)}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} items · {order.type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusColor[order.status]}>{order.status}</Badge>
                    <span className="font-semibold text-sm">Rs. {order.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={orderTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {orderTypeData.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Popular Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {menuItems.filter(m => m.available).slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <img
                    src={menuFoodImage(item.name, item.category, item.image)}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(event) => applyMenuImageFallback(event.currentTarget, item.name, item.category)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <span className="font-semibold text-sm">Rs. {Number(item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantDashboard;

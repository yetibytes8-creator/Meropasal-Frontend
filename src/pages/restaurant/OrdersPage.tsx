import { useState, useEffect } from "react";
import { menuItems as menuItemsApi, orders as ordersApi } from "@/lib/api";
import { useOrders } from "@/contexts/OrdersContext";
import { fromApiOrder } from "@/lib/transforms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { menuFoodImage } from "@/lib/menuImages";
import { Plus, Minus, Clock, ShoppingCart, Search, Trash2, X, ChefHat, CheckCircle, CheckCircle2 } from "lucide-react";
import type { Order } from "@/types";
import { toast } from "sonner";

type LiveMenuItem = { id: string; name: string; price: number; available: boolean; image?: string; category: string };

const DEFAULT_MENU_CATEGORIES = ["Coffee", "Tea", "Khaja", "Meals", "Snacks", "Desserts", "Combo"];

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  preparing: "bg-info/10 text-info border-info/20",
  ready: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const OrdersPage = () => {
  const { allOrders, setAllOrders: setOrders } = useOrders();
  const [liveMenuItems, setLiveMenuItems] = useState<LiveMenuItem[]>([]);

  useEffect(() => {
    menuItemsApi.list()
      .then((items) => setLiveMenuItems(items.map((i) => ({
        id: String(i.id), name: i.name, price: Number(i.price),
        available: i.available, image: menuFoodImage(i.name, i.category, i.image), category: i.category,
      }))))
      .catch(() => {});
  }, []);

  const menuItemMap = Object.fromEntries(liveMenuItems.map((m) => [m.id, m]));
  const availableMenuItems = liveMenuItems.filter((m) => m.available);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const addToCart = (id: string) => setCart((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart((p) => {
    const n = { ...p };
    if ((n[id] || 0) > 1) n[id]--; else delete n[id];
    return n;
  });

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = menuItemMap[id];
    return { id, qty, item };
  }).filter((x) => x.item);
  const cartTotal = cartItems.reduce((s, { qty, item }) => s + qty * item.price, 0);
  const cartCount = cartItems.reduce((s, { qty }) => s + qty, 0);
  const menuCategories = ["all", ...Array.from(new Set([
    ...DEFAULT_MENU_CATEGORIES,
    ...availableMenuItems.map((item) => item.category).filter(Boolean),
  ]))];
  const filteredMenuItems = availableMenuItems.filter((item) => {
    const q = menuSearch.trim().toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    const matchesCategory = menuCategory === "all" || item.category === menuCategory;
    return matchesSearch && matchesCategory;
  });

  const createOrder = async () => {
    if (cartCount === 0) { toast.error("Add at least one item to the order"); return; }
    try {
      const created = await ordersApi.create({
        table_id: null,
        type: "dine-in",
        status: "pending",
        total: cartTotal,
        customer_name: null,
        payment_method: null,
        split_cash: null,
        split_online: null,
        items: cartItems.map(({ id, qty, item }) => ({
          menu_item_id: Number.isFinite(Number(id)) ? Number(id) : null,
          name: item.name,
          quantity: qty,
          price: item.price,
        })),
      });
      setOrders((prev) => [fromApiOrder(created), ...prev]);
      setCart({});
      setDialogOpen(false);
      toast.success("Order created");
    } catch {
      toast.error("Order save failed. Please check backend connection.");
    }
  };

  const deleteOrder = (id: string) => {
    setOrders(allOrders.filter((o) => o.id !== id));
    toast.success("Order deleted");
  };

  const filtered = allOrders.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      o.id.toLowerCase().includes(q) ||
      (o.customerName?.toLowerCase().includes(q) ?? false) ||
      o.items.some((i) => i.name.toLowerCase().includes(q));
    return (filterStatus === "all" || o.status === filterStatus) && (filterType === "all" || o.type === filterType) && matchesSearch;
  });

  const updateStatus = async (id: string, status: Order["status"]) => {
    setOrders(allOrders.map((o) => o.id === id ? { ...o, status } : o));
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return;
    try {
      const updated = await ordersApi.update(numericId, { status });
      setOrders((prev) => prev.map((o) => o.id === id ? fromApiOrder(updated) : o));
    } catch {
      toast.error("Status update failed. Please try again.");
    }
  };

  const nextStatus: Record<string, Order["status"]> = {
    pending: "preparing", preparing: "ready", ready: "completed",
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Orders</h1>
          <p className="page-description">Manage customer orders</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setMenuSearch("");
            setMenuCategory("all");
          }
        }}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--restaurant))] px-5 font-semibold shadow-lg shadow-primary/25 shrink-0">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span>New Order</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:w-full flex flex-col max-h-[85vh]">
            <DialogHeader><DialogTitle>New Order</DialogTitle></DialogHeader>
            <div className="flex-1 overflow-auto space-y-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search menu or category..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} className="pl-10" />
                </div>
                <Select value={menuCategory} onValueChange={setMenuCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Catalog" />
                  </SelectTrigger>
                  <SelectContent>
                    {menuCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === "all" ? "All Catalog" : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {menuCategories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={menuCategory === category ? "default" : "outline"}
                    className="h-9 shrink-0 rounded-xl px-3 text-xs"
                    onClick={() => setMenuCategory(category)}
                  >
                    {category === "all" ? "All" : category}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {filteredMenuItems.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No menu items in this catalog.
                  </div>
                )}
                {filteredMenuItems.map((item) => {
                  const qty = cart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className={`group flex flex-col items-stretch rounded-xl border bg-card text-left transition-all hover:shadow-md overflow-hidden ${qty > 0 ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"}`}
                    >
                      {/* Image / tap to add */}
                      <button onClick={() => addToCart(item.id)} className="text-left focus:outline-none">
                        {item.image ? (
                          <div className="aspect-square w-full overflow-hidden bg-muted">
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          </div>
                        ) : (
                          <div className="aspect-square w-full bg-muted flex items-center justify-center">
                            <span className="text-2xl">🍽️</span>
                          </div>
                        )}
                      </button>

                      {/* Name + price */}
                      <div className="px-2.5 pt-2 pb-1">
                        <p className="text-sm font-medium line-clamp-1 leading-tight">{item.name}</p>
                        <p className="text-xs font-bold text-primary mt-0.5">Rs. {item.price}</p>
                      </div>

                      {/* Add / qty controls */}
                      <div className="px-2.5 pb-2.5 mt-1">
                        {qty > 0 ? (
                          <div className="flex items-center justify-between gap-1 bg-primary/10 rounded-lg px-1 py-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-primary/20 text-primary shrink-0"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </Button>
                            <span className="flex-1 text-center text-sm font-bold text-primary">{qty}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-primary/20 text-primary shrink-0"
                              onClick={() => addToCart(item.id)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => addToCart(item.id)}
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {cartCount > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cartCount} item{cartCount > 1 ? "s" : ""}</span>
                  <span className="font-bold text-lg">Rs. {cartTotal.toFixed(2)}</span>
                </div>
                <Button className="w-full" onClick={createOrder}>
                  <ShoppingCart className="w-4 h-4 mr-2" />Create Order
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders, customers, items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-full" />
        </div>
        <div className="flex gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dine-in">Dine-in</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((order) => (
          <Card key={order.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Order #{order.id.slice(1)}</CardTitle>
                <Badge variant="outline" className={statusColor[order.status]}>{order.status}</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(order.createdAt).toLocaleTimeString()}
                <Badge variant="secondary" className="text-xs">{order.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-3">
                {order.items.map((item, idx) => {
                  const menuItem = menuItemMap[item.menuItemId];
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm min-w-0">
                      {menuItem?.image && (
                        <img src={menuItem.image} alt={item.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      )}
                      <span className="flex-1 min-w-0 truncate">{item.quantity}x {item.name}</span>
                      <span className="text-muted-foreground">Rs. {(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base">Rs. {order.total.toFixed(2)}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete order #{order.id.slice(1)}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteOrder(order.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {order.status !== "completed" && order.status !== "cancelled" && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2" onClick={() => updateStatus(order.id, "cancelled")}>
                      <X className="w-3.5 h-3.5 shrink-0" />Cancel
                    </Button>
                    <Button className="h-10 flex-1 rounded-xl gap-2 capitalize" onClick={() => updateStatus(order.id, nextStatus[order.status])}>
                      {nextStatus[order.status] === "preparing" && <ChefHat className="w-3.5 h-3.5 shrink-0" />}
                      {nextStatus[order.status] === "ready" && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                      {nextStatus[order.status] === "completed" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      {nextStatus[order.status]}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrdersPage;

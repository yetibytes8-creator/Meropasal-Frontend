import { useState, useEffect } from "react";
import { menuItems as menuItemsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { applyMenuImageFallback, menuFoodImage } from "@/lib/menuImages";
import { orders as ordersApi } from "@/lib/api";
import { fromApiOrder } from "@/lib/transforms";
import { balanceMoneyInput, formatMoneyInput, parseMoneyInput, sanitizeMoneyInput } from "@/lib/moneyInput";
import { postRestaurantBillToAccounts } from "@/lib/accountingAutoPost";
import { printRestaurantBill } from "@/lib/restaurantBill";
import { Plus, Minus, ShoppingCart, XCircle, Banknote, CreditCard, Smartphone, SplitSquareHorizontal, Search, Printer } from "lucide-react";
import { useOrders } from "@/contexts/OrdersContext";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";
import type { Order } from "@/types";

type LiveMenuItem = { id: string; name: string; price: number; available: boolean; image?: string; category: string };
const formatNPR = (amount: number) => `Rs. ${amount.toFixed(2)}`;

const statusStyles: Record<string, { bg: string; label: string }> = {
  available: { bg: "border-success/40 bg-success/5 hover:border-success/70", label: "bg-success/10 text-success border-success/20" },
  occupied: { bg: "border-destructive/45 bg-destructive/8 ring-1 ring-destructive/10 hover:border-destructive/70", label: "bg-destructive/10 text-destructive border-destructive/25" },
  reserved: { bg: "border-warning/45 bg-warning/10 hover:border-warning/70", label: "bg-warning/10 text-warning border-warning/20" },
};

const tableStatusLabel: Record<string, string> = {
  available: "Available",
  occupied: "Occupied / Pack",
  reserved: "Booked",
};

const tableStatusDot: Record<string, string> = {
  available: "bg-success",
  occupied: "bg-destructive",
  reserved: "bg-warning",
};

const statusColorMap: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  preparing: "bg-info/10 text-info border-info/20",
  ready: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground",
};

const TablesPage = () => {
  const { allTables, setTables, allOrders, setAllOrders, closeTable } = useOrders();
  const { settings } = useSettings();
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
  const menuCategories = Array.from(new Set(availableMenuItems.map((m) => m.category).filter(Boolean))).sort();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTableNum, setSelectedTableNum] = useState<number>(0);
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const [addTableDialog, setAddTableDialog] = useState(false);
  const [addTableSeats, setAddTableSeats] = useState("4");

  const handleAddTable = () => {
    const seats = parseInt(addTableSeats);
    if (!seats || seats < 1) { toast.error("Seats must be at least 1"); return; }
    if (seats > 20) { toast.error("Seats cannot exceed 20"); return; }
    const nextNumber = allTables.length > 0 ? Math.max(...allTables.map(t => t.number)) + 1 : 1;
    setTables(prev => [...prev, { id: `t${Date.now()}`, number: nextNumber, seats, status: "available" }]);
    toast.success(`Table ${nextNumber} added (${seats} seats)`);
    setAddTableDialog(false);
    setAddTableSeats("4");
  };

  const [newOrderDialog, setNewOrderDialog] = useState(false);
  const [newOrderTableId, setNewOrderTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [addingToOrder, setAddingToOrder] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("all");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<NonNullable<Order["paymentMethod"]>>("cash");
  const [splitCash, setSplitCash] = useState("");
  const [splitOnline, setSplitOnline] = useState("");

  const newOrderTable = newOrderTableId ? allTables.find(t => t.id === newOrderTableId) : null;
  const filteredMenuItems = availableMenuItems.filter((item) => {
    const q = menuSearch.trim().toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    const matchesCategory = menuCategory === "all" || item.category === menuCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTableClick = (table: typeof allTables[0]) => {
    if (table.orderId) {
      const order = allOrders.find(o => o.id === table.orderId);
      if (order) {
        setSelectedOrder(order);
        setSelectedTableNum(table.number);
        setSelectedTableId(table.id);
        return;
      }
    }
    if (table.status === "available") {
      setNewOrderTableId(table.id);
      setCart({});
      setAddingToOrder(false);
      setMenuSearch("");
      setMenuCategory("all");
      setNewOrderDialog(true);
      return;
    }
    const statusOrder = ["available", "reserved", "occupied"] as const;
    setTables(allTables.map((t) => {
      if (t.id !== table.id) return t;
      const next = statusOrder[(statusOrder.indexOf(t.status) + 1) % 3];
      return { ...t, status: next };
    }));
  };

  const openAddItems = () => {
    if (!selectedOrder) return;
    const table = allTables.find(t => t.orderId === selectedOrder.id);
    if (!table) return;
    setNewOrderTableId(table.id);
    setCart({});
    setAddingToOrder(true);
    setMenuSearch("");
    setMenuCategory("all");
    setSelectedOrder(null);
    setNewOrderDialog(true);
  };

  const openPaymentDialog = () => {
    setPaymentMethod("cash");
    const half = selectedOrder ? selectedOrder.total / 2 : 0;
    setSplitCash(formatMoneyInput(half));
    setSplitOnline(formatMoneyInput(half));
    setPaymentDialog(true);
  };

  const printSelectedBill = async (order = selectedOrder) => {
    if (!order) return;
    const printableOrder: Order = order.paymentMethod ? order : { ...order, paymentMethod };
    const printed = await printRestaurantBill(printableOrder, settings, allTables);
    if (!printed) toast.error("Popup blocked. Please allow popups to print bill.");
  };

  const confirmCloseTable = async () => {
    if (!selectedTableId || !selectedOrder) return;
    let splitPayment: Order["splitPayment"];
    if (paymentMethod === "split") {
      const cash = parseMoneyInput(splitCash);
      const online = parseMoneyInput(splitOnline);
      if (cash < 0 || online < 0) {
        toast.error("Split amount cannot be negative");
        return;
      }
      if (Math.abs(cash + online - selectedOrder.total) > 0.01) {
        toast.error(`Cash + Online must equal ${formatNPR(selectedOrder.total)}`);
        return;
      }
      splitPayment = { cash, online };
    }
    const paidOrder: Order = { ...selectedOrder, status: "completed", paymentMethod, splitPayment };
    await closeTable(selectedTableId, paymentMethod, splitPayment);
    await printSelectedBill(paidOrder);
    postRestaurantBillToAccounts(paidOrder).catch(() => toast.warning("Payment saved, finance auto-entry pending"));
    setPaymentDialog(false);
    setSelectedOrder(null);
    toast.success("Payment recorded, bill printed, and table closed");
  };

  const addToCart = (menuItemId: string) => setCart(prev => ({ ...prev, [menuItemId]: (prev[menuItemId] || 0) + 1 }));
  const removeFromCart = (menuItemId: string) => setCart(prev => {
    const newCart = { ...prev };
    if (newCart[menuItemId] > 1) newCart[menuItemId]--;
    else delete newCart[menuItemId];
    return newCart;
  });

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItemMap[id];
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const createOrder = async () => {
    if (!newOrderTable || cartItemCount === 0) return;
    const draftOrder: Order = {
      id: `temp-${Date.now()}`,
      tableId: newOrderTable.id,
      type: "dine-in",
      status: "pending",
      items: Object.entries(cart).map(([menuItemId, quantity]) => {
        const item = menuItemMap[menuItemId];
        return { menuItemId, name: item.name, quantity, price: item.price };
      }),
      total: cartTotal,
      createdAt: new Date().toISOString(),
    };
    let savedOrder = draftOrder;
    try {
      const created = await ordersApi.create({
        table_id: Number.isFinite(Number(newOrderTable.id)) ? Number(newOrderTable.id) : null,
        type: draftOrder.type,
        status: draftOrder.status,
        total: draftOrder.total,
        customer_name: draftOrder.customerName ?? null,
        payment_method: null,
        split_cash: null,
        split_online: null,
        items: draftOrder.items.map((item) => ({
          menu_item_id: Number.isFinite(Number(item.menuItemId)) ? Number(item.menuItemId) : null,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      savedOrder = fromApiOrder(created);
      toast.success("Table order saved");
    } catch {
      toast.warning("Order saved locally. Backend sync failed.");
    }
    setAllOrders(prev => [...prev.filter((item) => item.id !== savedOrder.id), savedOrder]);
    setTables(allTables.map(t =>
      t.id === newOrderTable.id ? { ...t, status: "occupied" as const, orderId: savedOrder.id } : t
    ));
    setNewOrderDialog(false);
    setCart({});
    setNewOrderTableId(null);
  };

  const addItemsToOrder = async () => {
    if (!newOrderTable || cartItemCount === 0) return;
    const existingOrder = allOrders.find(o => o.id === newOrderTable.orderId);
    if (!existingOrder) return;

    const newItems = Object.entries(cart).map(([menuItemId, quantity]) => {
      const item = menuItemMap[menuItemId];
      return { menuItemId, name: item.name, quantity, price: item.price };
    });

    const mergedItems = [...existingOrder.items];
    for (const newItem of newItems) {
      const existing = mergedItems.find(i => i.menuItemId === newItem.menuItemId);
      if (existing) existing.quantity += newItem.quantity;
      else mergedItems.push(newItem);
    }
    const newTotal = mergedItems.reduce((sum, i) => sum + i.quantity * i.price, 0);
    const updatedLocal = { ...existingOrder, items: mergedItems, total: newTotal };

    setAllOrders(prev => prev.map(o =>
      o.id === existingOrder.id ? updatedLocal : o
    ));
    const numericOrderId = Number(existingOrder.id);
    if (Number.isFinite(numericOrderId)) {
      try {
        const updated = await ordersApi.update(numericOrderId, {
          items: mergedItems.map((item) => ({
            menu_item_id: Number.isFinite(Number(item.menuItemId)) ? Number(item.menuItemId) : null,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: newTotal,
        });
        setAllOrders(prev => prev.map(o => o.id === existingOrder.id ? fromApiOrder(updated) : o));
      } catch {
        toast.warning("Items added locally. Backend sync failed.");
      }
    }
    setNewOrderDialog(false);
    setCart({});
    setNewOrderTableId(null);
    setAddingToOrder(false);
  };

  const counts = {
    available: allTables.filter(t => t.status === "available").length,
    occupied: allTables.filter(t => t.status === "occupied").length,
    reserved: allTables.filter(t => t.status === "reserved").length,
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Table Management</h1>
          <p className="page-description">View and manage restaurant tables</p>
        </div>
        <Button className="h-11 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--restaurant))] px-5 font-semibold shadow-lg shadow-primary/25 shrink-0" onClick={() => setAddTableDialog(true)}>
          <Plus className="w-4 h-4 sm:mr-2" />
          <span>Add Table</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 sm:gap-4">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <div className={cn("w-3 h-3 rounded-full shrink-0", tableStatusDot[status])} />
            <span className="text-muted-foreground">{tableStatusLabel[status] || status}: {count}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {allTables.map((table) => (
          <Card key={table.id} className={cn("cursor-pointer transition-all hover:shadow-md", statusStyles[table.status].bg)} onClick={() => handleTableClick(table)}>
            <CardContent className="p-3 sm:p-5 text-center">
              <div className="text-2xl sm:text-3xl font-bold mb-2">{table.number}</div>
              <Badge variant="outline" className={statusStyles[table.status].label}>{tableStatusLabel[table.status] || table.status}</Badge>
              <p className="text-xs text-muted-foreground mt-2">{table.seats} seats</p>
              {table.status === "available" && <p className="text-xs text-success mt-2 font-medium">Click to create order</p>}
              {table.status === "reserved" && <p className="text-xs text-warning mt-2 font-medium">Booked table</p>}
              {table.status === "occupied" && <p className="text-xs text-destructive mt-2 font-medium">Click to view bill/order</p>}
              {table.orderId && (() => {
                const order = allOrders.find(o => o.id === table.orderId);
                return order ? (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Order #{table.orderId.slice(1)} · {order.items.reduce((sum, i) => sum + i.quantity, 0)} items</p>
                    <p className="text-sm font-semibold text-foreground">{formatNPR(order.total)}</p>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Click available table to create order · Click occupied table to view order · Click reserved to cycle status</p>

      {/* View Order Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle>Table {selectedTableNum} — Order #{selectedOrder?.id.slice(1)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColorMap[selectedOrder.status]}>{selectedOrder.status}</Badge>
                <Badge variant="secondary" className="text-xs">{selectedOrder.type}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => {
                  const menuItem = menuItemMap[item.menuItemId];
                  return (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      {menuItem?.image && (
                        <img
                          src={menuItem.image}
                          alt={item.name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                          onError={(event) => applyMenuImageFallback(event.currentTarget, item.name, menuItem.category)}
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatNPR(item.price)}</p>
                      </div>
                      <span className="font-medium">{formatNPR(item.quantity * item.price)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-bold">{formatNPR(selectedOrder.total)}</span>
              </div>
              {selectedOrder.status !== "completed" && (
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={openAddItems}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add More Items
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={openPaymentDialog}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Close Table
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Order / Add Items Dialog */}
      <Dialog open={newOrderDialog} onOpenChange={(open) => {
        setNewOrderDialog(open);
        if (!open) {
          setMenuSearch("");
          setMenuCategory("all");
        }
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{addingToOrder ? "Add Items" : "New Order"} — Table {newOrderTable?.number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-3">
            <p className="text-xs text-muted-foreground">Tap an item to add it to the order</p>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search dishes or drinks..."
                  className="pl-10"
                />
              </div>
              <Select value={menuCategory} onValueChange={setMenuCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {menuCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {filteredMenuItems.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No menu items match this search.
                </div>
              )}
              {filteredMenuItems.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${qty > 0 ? "border-primary/50 bg-primary/5" : "bg-card hover:border-primary/30"}`}
                  >
                    {/* Thumbnail */}
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        onError={(event) => applyMenuImageFallback(event.currentTarget, item.name, item.category)}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xl">🍽️</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate leading-tight">{item.name}</p>
                      <p className="text-xs font-bold text-primary mt-0.5">{formatNPR(item.price)}</p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {qty > 0 ? (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold text-primary">{qty}</span>
                        </>
                      ) : null}
                      <Button
                        variant={qty > 0 ? "default" : "outline"}
                        size="icon"
                        className={`h-9 w-9 rounded-lg ${qty > 0 ? "bg-primary hover:bg-primary/90" : "border-primary/30 text-primary hover:bg-primary/10"}`}
                        onClick={() => addToCart(item.id)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {cartItemCount > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cartItemCount} item{cartItemCount > 1 ? "s" : ""}</span>
                <span className="font-bold text-lg">{formatNPR(cartTotal)}</span>
              </div>
              <Button className="w-full" onClick={addingToOrder ? addItemsToOrder : createOrder}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {addingToOrder ? "Add to Order" : "Create Order"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Table Dialog */}
      <Dialog open={addTableDialog} onOpenChange={setAddTableDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full">
          <DialogHeader><DialogTitle>Add New Table</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Number of Seats</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="20"
                value={addTableSeats}
                onChange={(e) => setAddTableSeats(e.target.value)}
                placeholder="e.g. 4"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">Table number will be assigned automatically as Table {allTables.length > 0 ? Math.max(...allTables.map(t => t.number)) + 1 : 1}</p>
            </div>
            <Button className="w-full" onClick={handleAddTable}>
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-bold text-foreground text-lg">Rs. {selectedOrder?.total.toFixed(2)}</span>
            </p>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as NonNullable<Order["paymentMethod"]>)}>
              {[
                { value: "cash", label: "Cash", icon: Banknote },
                { value: "card", label: "Card", icon: CreditCard },
                { value: "mobile", label: "Mobile Payment", icon: Smartphone },
                { value: "split", label: "Split Cash + Online", icon: SplitSquareHorizontal },
              ].map(({ value, label, icon: Icon }) => (
                <Label key={value} htmlFor={`pay-${value}`} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value={value} id={`pay-${value}`} />
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                </Label>
              ))}
            </RadioGroup>

            {paymentMethod === "split" && selectedOrder && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Split payment</p>
                    <p className="text-xs text-muted-foreground">Cash + Online total must match bill amount.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full border-primary/30 px-3 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      const cash = selectedOrder.total / 2;
                      const online = selectedOrder.total - cash;
                      setSplitCash(formatMoneyInput(cash));
                      setSplitOnline(formatMoneyInput(online));
                    }}
                  >
                    50 / 50
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cash (Rs.)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      autoComplete="off"
                      autoFocus
                      value={splitCash}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const value = sanitizeMoneyInput(e.target.value);
                        setSplitCash(value);
                        setSplitOnline(balanceMoneyInput(selectedOrder.total, value));
                      }}
                      onBlur={(e) => {
                        const value = formatMoneyInput(parseMoneyInput(e.target.value));
                        setSplitCash(value);
                        setSplitOnline(balanceMoneyInput(selectedOrder.total, value));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Online (Rs.)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      autoComplete="off"
                      value={splitOnline}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const value = sanitizeMoneyInput(e.target.value);
                        setSplitOnline(value);
                        setSplitCash(balanceMoneyInput(selectedOrder.total, value));
                      }}
                      onBlur={(e) => {
                        const value = formatMoneyInput(parseMoneyInput(e.target.value));
                        setSplitOnline(value);
                        setSplitCash(balanceMoneyInput(selectedOrder.total, value));
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Split total</span>
                  <span className="font-semibold">{formatNPR(parseMoneyInput(splitCash) + parseMoneyInput(splitOnline))}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => printSelectedBill()}>
                <Printer className="h-4 w-4" />
                Print Bill
              </Button>
              <Button className="h-11 rounded-xl shadow-lg shadow-primary/20" onClick={confirmCloseTable}>
                Pay, Print & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;

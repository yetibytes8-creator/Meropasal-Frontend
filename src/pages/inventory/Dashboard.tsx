import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { products as productsApi, sales as salesApi, purchases as purchasesApi, expenses as expensesApi, customers as customersApi, alertsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, GitBranch, Package, ShoppingCart, AlertTriangle, TrendingUp, ReceiptText, Users, Bell, XCircle, Warehouse, ShieldCheck, Wrench } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Product, Sale, Purchase, Expense } from "@/types";
import { fromApiProduct, fromApiSale, fromApiPurchase, fromApiExpense } from "@/lib/transforms";

const InventoryDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [stockPanel, setStockPanel] = useState<"risk" | "out" | "low">("risk");
  const [chartMode, setChartMode] = useState<"lowest" | "highest" | "out_first">("lowest");

  useEffect(() => {
    Promise.all([
      productsApi.list(),
      salesApi.list(),
      purchasesApi.list(),
      expensesApi.list(),
      customersApi.list(),
      alertsApi.list(),
    ]).then(([pr, sa, pu, ex, cu, al]) => {
      setProducts(pr.map(fromApiProduct));
      setSales(sa.map(fromApiSale));
      setPurchases(pu.map(fromApiPurchase));
      setExpenses(ex.map(fromApiExpense));
      setCustomerCount(cu.length);
      setUnreadAlerts(al.filter((a) => !a.read).length);
    }).catch(console.error);
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const outOfStockItems = products.filter((p) => p.stock <= 0);
  const lowStockItems = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  const stockRiskItems = [...outOfStockItems, ...lowStockItems].sort((a, b) => a.stock - b.stock);
  const watchlistItems = stockPanel === "out"
    ? outOfStockItems
    : stockPanel === "low"
      ? lowStockItems
      : stockRiskItems;
  const completedSales = sales.filter((s) => s.status !== "refunded");
  const todaySales = completedSales.filter((s) => s.date === today).reduce((sum, s) => sum + s.total, 0);
  const pendingPurchases = purchases.filter((p) => p.status === "pending").length;
  const monthlyExpenses = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const chartProducts = [...products]
    .sort((a, b) => {
      if (chartMode === "highest") return b.stock - a.stock;
      if (chartMode === "out_first") return (a.stock <= 0 ? 0 : 1) - (b.stock <= 0 ? 0 : 1) || a.stock - b.stock;
      return a.stock - b.stock;
    })
    .slice(0, 6);

  const stockData = chartProducts.map((p) => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name,
    stock: p.stock,
    min: p.minStock,
  }));

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Inventory Dashboard</h1>
          <p className="page-description">Overview of your shop inventory and business</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/inventory/stock-control">
            <Warehouse className="w-4 h-4" />
            Stock Control
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard className="stagger-1" title="Total Products" value={products.length} icon={<Package className="w-5 h-5" />} iconClassName="bg-inventory/10 text-inventory" />
        <StatCard className="stagger-2" title="Today's Sales" value={`Rs. ${todaySales.toFixed(2)}`} icon={<TrendingUp className="w-5 h-5" />} iconClassName="bg-success/10 text-success" trend={{ value: 15, positive: true }} />
        <StatCard className="stagger-3" title="Pending Purchases" value={pendingPurchases} icon={<ShoppingCart className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard className="stagger-4" title="Monthly Expenses" value={`Rs. ${monthlyExpenses.toLocaleString()}`} icon={<ReceiptText className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard className="stagger-1" title="Low Stock Items" value={lowStockItems.length} icon={<AlertTriangle className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard className="stagger-2" title="Out of Stock" value={outOfStockItems.length} icon={<XCircle className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard className="stagger-3" title="Customers" value={customerCount} icon={<Users className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard className="stagger-4" title="Unread Alerts" value={unreadAlerts} icon={<Bell className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Shop Digital Workflow</CardTitle>
            <p className="text-sm text-muted-foreground">Computer/mobile shop, branch, staff, warranty, sales and return flow</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/inventory/operations">
              Open Operations Hub
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Catalog & Barcode", detail: "Brand, model, SKU, category, serial/IMEI", path: "/inventory/products", icon: Package },
            { title: "Branch Stock", detail: "Main store, counters, service desk transfer", path: "/inventory/operations", icon: GitBranch },
            { title: "POS + Returns", detail: "Discount, payment, invoice, refund/exchange", path: "/inventory/sales", icon: ShoppingCart },
            { title: "Service & Warranty", detail: "Repair ticket, warranty claim, approval", path: "/inventory/operations", icon: Wrench },
          ].map((item) => (
            <Link key={item.title} to={item.path} className="group rounded-lg border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-md bg-primary/10 p-2 text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          {[
            ["Owner view", "सबै branch को stock value, sales, due, cash/bank एकै ठाउँमा हेर्ने।"],
            ["Manager view", "Purchase receive, transfer approve, low-stock reorder, staff task assign गर्ने।"],
            ["Staff view", "आफ्नो branch को POS, stock count, serial scan, service ticket update गर्ने।"],
          ].map(([title, detail]) => (
            <div key={title} className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Stock Levels</CardTitle>
            <Select value={chartMode} onValueChange={(value) => setChartMode(value as typeof chartMode)}>
              <SelectTrigger className="h-9 sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lowest">Lowest Stock</SelectItem>
                <SelectItem value="highest">Highest Stock</SelectItem>
                <SelectItem value="out_first">Out First</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stockData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="stock" name="Stock" fill="hsl(var(--inventory))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="min" name="Min" fill="hsl(var(--destructive) / 0.4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Stock Watchlist</CardTitle>
            <Select value={stockPanel} onValueChange={(value) => setStockPanel(value as typeof stockPanel)}>
              <SelectTrigger className="h-9 sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">All Risk</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-2">
            {watchlistItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All items are well stocked</p>
            ) : watchlistItems.slice(0, 5).map((p) => {
              const out = p.stock <= 0;
              return (
              <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg border ${out ? "bg-destructive/5 border-destructive/10" : "bg-warning/5 border-warning/10"}`}>
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={`${out ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"} text-xs`}>
                    {p.stock} / {p.minStock}
                  </Badge>
                  <p className="mt-1 text-[11px] text-muted-foreground">{out ? "Out of Stock" : "Low Stock"}</p>
                </div>
              </div>
            );})}
            {watchlistItems.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{watchlistItems.length - 5} more item{watchlistItems.length - 5 === 1 ? "" : "s"} hidden
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryDashboard;

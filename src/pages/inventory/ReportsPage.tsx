import { useState, useEffect, useMemo } from "react";
import { products as productsApi, sales as salesApi, expenses as expensesApi, customers as customersApi } from "@/lib/api";
import { fromApiProduct, fromApiSale, fromApiExpense, fromApiCustomer } from "@/lib/transforms";
import type { Product, Sale, Expense, Customer } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { TrendingUp, ReceiptText, ShoppingCart, Users } from "lucide-react";

const COLORS = [
  "hsl(160, 70%, 42%)",
  "hsl(217, 91%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(15, 85%, 55%)",
  "hsl(199, 89%, 48%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 81%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(188, 86%, 43%)",
];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PERIOD_LABELS: Record<string, string> = {
  week: "This Week", month: "This Month", quarter: "This Quarter", year: "This Year",
};

function buildChartData(sales: Sale[], expenses: Expense[], period: string) {
  const now = new Date();
  type Bucket = { day: string; revenue: number; expenses: number };
  const buckets: Record<string, Bucket> = {};

  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().split("T")[0];
      buckets[key] = { day: SHORT_DAYS[d.getDay()], revenue: 0, expenses: 0 };
    }
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 6);
    sales.filter(s => new Date(s.date) >= cutoff).forEach(s => {
      const k = s.date.split("T")[0];
      if (buckets[k]) buckets[k].revenue += s.total;
    });
    expenses.filter(e => new Date(e.date) >= cutoff).forEach(e => {
      const k = e.date.split("T")[0];
      if (buckets[k]) buckets[k].expenses += e.amount;
    });
  } else if (period === "month") {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      buckets[key] = { day: `${d.getDate()}`, revenue: 0, expenses: 0 };
    }
    sales.filter(s => new Date(s.date) >= cutoff).forEach(s => {
      const k = s.date.split("T")[0];
      if (buckets[k]) buckets[k].revenue += s.total;
    });
    expenses.filter(e => new Date(e.date) >= cutoff).forEach(e => {
      const k = e.date.split("T")[0];
      if (buckets[k]) buckets[k].expenses += e.amount;
    });
  } else if (period === "quarter") {
    for (let i = 2; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${m.getMonth()}`;
      buckets[key] = { day: SHORT_MONTHS[m.getMonth()], revenue: 0, expenses: 0 };
    }
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    sales.filter(s => new Date(s.date) >= cutoff).forEach(s => {
      const d = new Date(s.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets[k]) buckets[k].revenue += s.total;
    });
    expenses.filter(e => new Date(e.date) >= cutoff).forEach(e => {
      const d = new Date(e.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets[k]) buckets[k].expenses += e.amount;
    });
  } else {
    for (let i = 0; i <= now.getMonth(); i++) {
      const key = `${now.getFullYear()}-${i}`;
      buckets[key] = { day: SHORT_MONTHS[i], revenue: 0, expenses: 0 };
    }
    const cutoff = new Date(now.getFullYear(), 0, 1);
    sales.filter(s => new Date(s.date) >= cutoff).forEach(s => {
      const d = new Date(s.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets[k]) buckets[k].revenue += s.total;
    });
    expenses.filter(e => new Date(e.date) >= cutoff).forEach(e => {
      const d = new Date(e.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets[k]) buckets[k].expenses += e.amount;
    });
  }

  return Object.values(buckets);
}

function filterByPeriod<T extends { date: string }>(items: T[], period: string): T[] {
  const now = new Date();
  let cutoff: Date;
  if (period === "week") { cutoff = new Date(now); cutoff.setDate(now.getDate() - 6); }
  else if (period === "month") { cutoff = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (period === "quarter") { cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1); }
  else { cutoff = new Date(now.getFullYear(), 0, 1); }
  return items.filter(i => new Date(i.date) >= cutoff);
}

function formatMoney(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function compactPieData(data: Array<{ name: string; value: number }>, limit = 8) {
  const sorted = data.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  const visible = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((sum, item) => sum + item.value, 0);
  return rest > 0 ? [...visible, { name: "Others", value: rest }] : visible;
}

const ReportsPage = () => {
  const [period, setPeriod] = useState("month");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenseData, setExpenseData] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    Promise.all([productsApi.list(), salesApi.list(), expensesApi.list(), customersApi.list()])
      .then(([pr, sa, ex, cu]) => {
        setProducts(pr.map(fromApiProduct));
        setSales(sa.map(fromApiSale));
        setExpenseData(ex.map(fromApiExpense));
        setCustomers(cu.map(fromApiCustomer));
      })
      .catch(() => {});
  }, []);

  const completedSales = useMemo(() => sales.filter((sale) => sale.status !== "refunded"), [sales]);
  const dailyRevenue = useMemo(() => buildChartData(completedSales, expenseData, period), [completedSales, expenseData, period]);
  const periodSales = useMemo(() => filterByPeriod(completedSales, period), [completedSales, period]);
  const periodExpenses = useMemo(() => filterByPeriod(expenseData, period), [expenseData, period]);
  const totalRevenue = Math.round(periodSales.reduce((s, sale) => s + sale.total, 0));
  const totalExpenses = Math.round(periodExpenses.reduce((s, e) => s + e.amount, 0));
  const profit = totalRevenue - totalExpenses;
  const label = PERIOD_LABELS[period] ?? period;

  // Sales by category
  const categoryData = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.stock * p.price;
    return acc;
  }, {});
  const categoryChartData = compactPieData(Object.entries(categoryData).map(([name, value]) => ({ name, value: Math.round(value) })));

  // Stock levels
  const stockData = products.map((p) => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name, stock: p.stock, minStock: p.minStock }));

  // Top customers
  const topCustomers = [...customers].sort((a, b) => b.totalSpent - Number(a.total_spent)).slice(0, 5).map(c => ({ name: c.name.split(" ")[0], spent: c.totalSpent, orders: c.totalOrders }));

  // Payment methods
  const paymentData = completedSales.reduce<Record<string, number>>((acc, s) => { acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + 1; return acc; }, {});
  const paymentChartData = compactPieData(Object.entries(paymentData).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })), 5);

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Reports &amp; Analytics</h1>
          <p className="page-description">Business insights, trends, and performance metrics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title={`Revenue (${label})`} value={`Rs. ${totalRevenue.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} iconClassName="bg-success/10 text-success" trend={{ value: 15, positive: true }} />
        <StatCard title={`Expenses (${label})`} value={`Rs. ${totalExpenses.toLocaleString()}`} icon={<ReceiptText className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard title="Net Profit" value={`Rs. ${profit.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} iconClassName={profit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"} />
        <StatCard title={`Orders (${label})`} value={periodSales.length} icon={<ShoppingCart className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses — {label}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="hsl(160, 70%, 42%)" fill="hsl(160, 70%, 42%)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Inventory Value by Category</CardTitle></CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1fr_240px]">
            <div className="min-h-[240px]">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={96}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {categoryChartData.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                <span>Category</span>
                <span>Value</span>
              </div>
              {categoryChartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No stock value yet.</p>
              ) : categoryChartData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-md bg-background px-2.5 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="truncate font-medium">{item.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatMoney(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Stock Levels vs Minimum</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="minStock" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers by Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="spent" fill="hsl(160, 70%, 42%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1fr_220px]">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={paymentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={96}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {paymentChartData.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              {paymentChartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
              ) : paymentChartData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-md bg-background px-2.5 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="truncate font-medium">{item.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;

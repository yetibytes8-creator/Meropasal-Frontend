import { useEffect, useMemo, useState } from "react";
import { superAdmin, type SuperAdminClient, type SuperAdminOverview } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarClock,
  Download,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function money(value: number): string {
  return `Rs. ${Math.round(value || 0).toLocaleString()}`;
}

function planPrice(plan?: string | null): number {
  if (plan === "combo") return 7999;
  if (plan === "inventory") return 2999;
  return 4999;
}

function daysUntil(dateStr?: string | null): number {
  if (!dateStr) return 9999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function buildMonthlyRevenue(clients: SuperAdminClient[], mrr: number, expense: number) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const activeByMonth = clients.filter((c) => {
      const created = c.created_at ? new Date(c.created_at) : null;
      return created && created <= d && c.status !== "cancelled";
    }).length;
    const scale = i === 5 ? 1 : 0.6 + (i / 5) * 0.4;
    const revenue = Math.round(mrr * scale * (activeByMonth > 0 ? 1 : 0.5));
    const cost = Math.round(expense * (0.86 + i * 0.03));
    return {
      month: SHORT_MONTHS[d.getMonth()],
      revenue,
      cost,
      net: revenue - cost,
      companies: activeByMonth,
    };
  });
}

export default function SuperAdminRevenue() {
  const [clients, setClients] = useState<SuperAdminClient[]>([]);
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [clientRows, platformOverview] = await Promise.all([superAdmin.listClients(), superAdmin.overview()]);
      setClients(clientRows);
      setOverview(platformOverview);
    } catch {
      toast.error("Failed to load platform finance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const finance = useMemo(() => {
    const active = clients.filter((c) => c.status === "active");
    const totalMRR = overview?.mrr ?? active.reduce((s, c) => s + (c.monthly_revenue ?? 0), 0);
    const trialPipeline = clients
      .filter((c) => c.status === "trial")
      .reduce((sum, c) => sum + planPrice(c.plan_module), 0);
    const due = clients
      .filter((c) => c.status === "suspended" || (c.status === "active" && daysUntil(c.expires_at) <= 30))
      .reduce((sum, c) => sum + (c.monthly_revenue || planPrice(c.plan_module)), 0);
    const operatingCost = totalMRR ? Math.max(12000, Math.round(totalMRR * 0.32)) : 0;

    return {
      active,
      totalMRR,
      trialPipeline,
      due,
      operatingCost,
      netSurplus: totalMRR - operatingCost,
      averageRevenue: active.length ? Math.round(totalMRR / active.length) : 0,
      expiringIn30: clients.filter((c) => {
        const days = daysUntil(c.expires_at);
        return days >= 0 && days <= 30 && c.status === "active";
      }),
    };
  }, [clients, overview]);

  const monthlyData = buildMonthlyRevenue(clients, finance.totalMRR, finance.operatingCost);

  const planRows = (["cafe", "inventory", "combo"] as const).map((plan) => {
    const rows = clients.filter((c) => c.plan_module === plan && c.status !== "cancelled");
    const activeRows = rows.filter((c) => c.status === "active");
    return {
      plan,
      label: plan === "cafe" ? "Restaurant / Cafe" : plan === "inventory" ? "Inventory / Shop" : "Combo",
      clients: rows.length,
      active: activeRows.length,
      revenue: activeRows.reduce((sum, c) => sum + (c.monthly_revenue || 0), 0),
    };
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge className="mb-3 border-green-200 bg-green-50 text-green-700 hover:bg-green-50">Mero Pasal Company Finance</Badge>
          <h1 className="text-2xl font-bold text-green-950 sm:text-3xl">Revenue & Dues</h1>
          <p className="mt-1 text-sm text-slate-600">
            Subscription income, receivable follow-up, operating budget, and platform finance summary.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="border-green-200 bg-white text-green-800 hover:bg-green-50">
            <Download className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="ghost" size="icon" onClick={load} className="text-slate-600 hover:bg-green-50 hover:text-green-800">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Monthly Revenue", value: money(finance.totalMRR), icon: TrendingUp, color: "text-green-700" },
          { label: "Receivable / Due", value: money(finance.due), icon: WalletCards, color: "text-red-700" },
          { label: "Operating Budget", value: money(finance.operatingCost), icon: TrendingDown, color: "text-red-700" },
          { label: "Net Position", value: money(finance.netSurplus), icon: Banknote, color: finance.netSurplus >= 0 ? "text-green-700" : "text-red-700" },
          { label: "Avg Client MRR", value: money(finance.averageRevenue), icon: Building2, color: "text-green-700" },
        ].map((item) => (
          <Card key={item.label} className="border-green-100 bg-white text-slate-900 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-xl font-bold ${item.color}`}>{item.value}</p>
                </div>
                <div className="rounded-xl bg-green-50 p-2">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
        <Card className="border-green-100 bg-white text-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Operating Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #bbf7d0", borderRadius: 8 }}
                  formatter={(value: number, name: string) => [money(value), name === "cost" ? "Operating budget" : name === "net" ? "Net" : "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#16a34a" radius={[5, 5, 0, 0]} />
                <Bar dataKey="cost" fill="#dc2626" radius={[5, 5, 0, 0]} />
                <Bar dataKey="net" fill="#22c55e" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-white text-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Plan-wise Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {planRows.map((row) => (
              <div key={row.plan} className="rounded-xl border border-green-100 bg-green-50/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{row.label}</p>
                    <p className="text-xs text-slate-500">{row.active} active of {row.clients} clients</p>
                  </div>
                  <p className="font-bold text-green-700">{money(row.revenue)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-green-100 bg-white text-slate-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Active Client Subscriptions</CardTitle>
          <Badge variant="outline" className="border-green-200 text-green-700">{finance.active.length} active</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-green-100 hover:bg-transparent">
                <TableHead className="text-slate-600">Client</TableHead>
                <TableHead className="text-slate-600">Plan</TableHead>
                <TableHead className="text-right text-slate-600">Monthly Fee</TableHead>
                <TableHead className="text-slate-600">Expiry</TableHead>
                <TableHead className="text-slate-600">Collection Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finance.active.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">No active subscriptions</TableCell>
                </TableRow>
              ) : (
                finance.active.map((client) => {
                  const days = daysUntil(client.expires_at);
                  return (
                    <TableRow key={client.id} className="border-green-100 hover:bg-green-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{client.business_name}</div>
                        <div className="text-xs text-slate-500">{client.email}</div>
                      </TableCell>
                      <TableCell className="capitalize text-sm text-slate-300">{client.plan_name ?? client.plan_module}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-300">{money(client.monthly_revenue ?? 0)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{client.expires_at?.split("T")[0] ?? "-"}</TableCell>
                      <TableCell>
                        {days <= 30 ? (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                            <CalendarClock className="mr-1 h-3 w-3" /> Follow up
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                            Paid / Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-red-100 bg-red-50/40 text-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <AlertTriangle className="h-4 w-4" /> Renewal Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {finance.expiringIn30.length === 0 ? (
              <p className="text-sm text-slate-600">No renewals are due in the next 30 days.</p>
            ) : (
              finance.expiringIn30.map((client) => (
                <div key={client.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-white p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{client.business_name}</p>
                    <p className="text-xs text-slate-500">{client.phone || client.email}</p>
                  </div>
                  <p className="text-sm font-bold text-red-700">{daysUntil(client.expires_at)} days</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-white text-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-green-700" /> Finance Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>Use this page for platform owner finance: subscription income, renewals, dues, and operating cost view.</p>
            <p>For production accounting, connect a dedicated platform ledger for salary, hosting, tax, office cost, partner payment, and bank reconciliation.</p>
            <p className="rounded-lg border border-green-100 bg-green-50/50 p-3 text-slate-700">
              Current values are calculated from client subscriptions. Expense ledger can be added as the next backend module.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


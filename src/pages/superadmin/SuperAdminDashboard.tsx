import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import type { Company } from "./types";
import { superAdmin } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DashStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  mrr: number;
  expiringSoon: number;
  totalUsers: number;
}

const planColors = {
  cafe: "#dc2626",
  inventory: "#059669",
  combo: "#1d4ed8",
} as const;

const planLabel: Record<string, string> = {
  cafe: "Restaurant",
  inventory: "Inventory",
  combo: "Combo",
};

const statusStyle: Record<string, string> = {
  active: "border-green-200 bg-green-50 text-green-700",
  trial: "border-green-200 bg-green-50 text-green-700",
  suspended: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function money(value: number): string {
  return `Rs. ${Math.round(value || 0).toLocaleString()}`;
}

function daysUntil(dateStr?: string | null): number {
  if (!dateStr) return 9999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function planPrice(plan: Company["plan"]): number {
  if (plan === "combo") return 7999;
  if (plan === "inventory") return 2999;
  return 4999;
}

function mapClient(c: Awaited<ReturnType<typeof superAdmin.listClients>>[number]): Company {
  return {
    id: String(c.id),
    userId: c.user_id,
    name: c.business_name,
    businessType: (c.business_type as Company["businessType"]) || "",
    contactPerson: c.contact_person,
    email: c.email,
    phone: c.phone || "",
    address: c.address || "",
    city: c.city || "",
    country: c.country || "Nepal",
    plan: (c.plan_module as Company["plan"]) || "cafe",
    planId: c.plan_id ?? undefined,
    planName: c.plan_name ?? undefined,
    subscriptionId: c.subscription_id ?? undefined,
    status: c.status as Company["status"],
    createdAt: c.created_at?.split("T")[0] ?? "",
    expiresAt: c.expires_at ?? "",
    maxUsers: c.max_users,
    activeUsers: c.active_users,
    monthlyRevenue: c.monthly_revenue,
    notes: c.internal_notes || "",
  };
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, clients] = await Promise.all([superAdmin.overview(), superAdmin.listClients()]);
      setStats({
        total: overview.total_clients,
        active: overview.active,
        trial: overview.trial,
        suspended: overview.suspended,
        mrr: overview.mrr,
        expiringSoon: overview.expiring_soon,
        totalUsers: overview.total_users,
      });
      setCompanies(clients.map(mapClient));
      setApiAvailable(true);
    } catch {
      setApiAvailable(false);
      setCompanies([]);
      setStats({
        total: 0,
        active: 0,
        trial: 0,
        suspended: 0,
        mrr: 0,
        expiringSoon: 0,
        totalUsers: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const snapshot = stats ?? {
    total: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    mrr: 0,
    expiringSoon: 0,
    totalUsers: 0,
  };

  const finance = useMemo(() => {
    const activeRevenue = companies
      .filter((company) => company.status === "active")
      .reduce((sum, company) => sum + company.monthlyRevenue, 0);
    const trialPipeline = companies
      .filter((company) => company.status === "trial")
      .reduce((sum, company) => sum + planPrice(company.plan), 0);
    const suspendedDue = companies
      .filter((company) => company.status === "suspended")
      .reduce((sum, company) => sum + (company.monthlyRevenue || planPrice(company.plan)), 0);
    const expiringDue = companies
      .filter((company) => {
        const days = daysUntil(company.expiresAt);
        return days >= 0 && days <= 30 && company.status === "active";
      })
      .reduce((sum, company) => sum + (company.monthlyRevenue || planPrice(company.plan)), 0);
    const receivable = suspendedDue + expiringDue;
    const operatingBudget = activeRevenue ? Math.max(12000, Math.round(activeRevenue * 0.32)) : 0;

    return {
      activeRevenue,
      trialPipeline,
      receivable,
      operatingBudget,
      netPosition: activeRevenue - operatingBudget,
      annualRunRate: activeRevenue * 12,
    };
  }, [companies]);

  const revenueTrend = months.map((month, index) => ({
    month,
    revenue: Math.round(finance.activeRevenue * (0.7 + index * 0.06)),
    expense: Math.round(finance.operatingBudget * (0.82 + index * 0.035)),
  }));

  const moduleMix = (["cafe", "inventory", "combo"] as const).map((plan) => {
    const rows = companies.filter((company) => company.plan === plan && company.status !== "cancelled");
    return {
      name: planLabel[plan],
      value: rows.length,
      revenue: rows.filter((company) => company.status === "active").reduce((sum, company) => sum + company.monthlyRevenue, 0),
      color: planColors[plan],
    };
  });

  const expiringClients = companies
    .filter((company) => {
      const days = daysUntil(company.expiresAt);
      return days >= 0 && days <= 30 && company.status !== "cancelled";
    })
    .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt))
    .slice(0, 5);

  const clientRows = [...companies]
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
    .slice(0, 8);

  const controlCards = [
    {
      title: "Client access control",
      detail: "Enable modules, finance access, plan status, branch limits, and staff permissions.",
      icon: LockKeyhole,
      to: "/super-admin/system-config",
    },
    {
      title: "Subscription collection",
      detail: "Track active clients, suspended clients, renewal queue, and pending dues.",
      icon: WalletCards,
      to: "/super-admin/revenue",
    },
    {
      title: "Company onboarding",
      detail: "Create client company, owner login, plan expiry, notes, and implementation handover.",
      icon: Building2,
      to: "/super-admin/companies",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.12),transparent_34%),linear-gradient(135deg,#fff1f2,#ffffff_55%,#f0fdf4)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-green-200 bg-green-600 text-white hover:bg-green-600">Platform Owner</Badge>
              <Badge variant="outline" className={apiAvailable ? "border-green-200 bg-white text-green-700" : "border-red-200 bg-white text-red-700"}>
                {apiAvailable ? "Backend connected" : "Backend unavailable"}
              </Badge>
            </div>
            <h1 className="mt-4 max-w-2xl font-display text-2xl font-extrabold tracking-tight text-green-950 sm:text-4xl">
              Super Admin Command Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage client companies, subscription revenue, access permissions, renewals, and your own software-company finance from one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => navigate("/super-admin/companies")} className="bg-green-600 text-white hover:bg-green-700">
                <Building2 className="mr-2 h-4 w-4" /> Add / Manage Company
              </Button>
              <Button variant="outline" onClick={() => navigate("/super-admin/revenue")} className="border-green-200 bg-white text-green-700 hover:bg-green-50">
                <Banknote className="mr-2 h-4 w-4" /> View Platform Finance
              </Button>
              <Button variant="ghost" onClick={load} className="text-slate-700 hover:bg-green-50 hover:text-green-700">
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-green-100">
            {[
              { label: "MRR", value: money(finance.activeRevenue), hint: "Active subscription" },
              { label: "Receivable", value: money(finance.receivable), hint: "Due / renewal queue" },
              { label: "Net Position", value: money(finance.netPosition), hint: "Revenue less budget" },
              { label: "ARR", value: money(finance.annualRunRate), hint: "Run rate" },
            ].map((item) => (
              <div key={item.label} className="bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-extrabold text-green-950">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading && !stats ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-green-100 bg-white py-16 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading dashboard...
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Clients", value: snapshot.total.toLocaleString(), detail: `${snapshot.active} active, ${snapshot.trial} trial`, icon: Building2, color: "text-green-700", bg: "bg-green-50" },
              { label: "Platform Users", value: snapshot.totalUsers.toLocaleString(), detail: "Owners and staff accounts", icon: Users, color: "text-green-700", bg: "bg-green-50" },
              { label: "Trial Pipeline", value: money(finance.trialPipeline), detail: "Possible monthly conversion", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
              { label: "Expiring Soon", value: snapshot.expiringSoon.toLocaleString(), detail: "Renewals within 30 days", icon: Clock, color: "text-red-600", bg: "bg-red-50" },
            ].map((item) => (
              <Card key={item.label} className="border-green-100 bg-white text-slate-900 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-extrabold text-green-950">{item.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                    </div>
                    <div className={cn("rounded-xl p-3", item.bg)}>
                      <item.icon className={cn("h-5 w-5", item.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
            <Card className="border-green-100 bg-white text-slate-900 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base text-green-950">Software Company Finance</CardTitle>
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Monthly view</Badge>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip
                      cursor={{ fill: "rgba(220,38,38,0.06)" }}
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #fecaca", borderRadius: 10, color: "#0f172a" }}
                      formatter={(value: number, name: string) => [money(value), name === "revenue" ? "Revenue" : "Operating budget"]}
                    />
                    <Bar dataKey="revenue" fill="#dc2626" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expense" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-emerald-100 bg-white text-slate-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-950">Module Sales Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={155}>
                  <PieChart>
                    <Pie data={moduleMix} dataKey="value" innerRadius={44} outerRadius={68} paddingAngle={4}>
                      {moduleMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1fae5", borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {moduleMix.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-semibold">{item.value} clients</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
            <Card className="border-emerald-100 bg-white text-slate-900 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base text-emerald-950">Collection Follow-up</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-red-800">Due and renewal amount</span>
                    <span className="font-bold text-red-900">{money(finance.receivable)}</span>
                  </div>
                </div>
                {expiringClients.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="mb-2 h-5 w-5" />
                    No urgent renewals right now.
                  </div>
                ) : (
                  expiringClients.map((client) => {
                    const days = daysUntil(client.expiresAt);
                    return (
                      <button
                        key={client.id}
                        onClick={() => navigate("/super-admin/companies")}
                        className="w-full rounded-xl border border-emerald-100 bg-white p-3 text-left transition hover:bg-emerald-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{client.name}</p>
                            <p className="truncate text-xs text-slate-500">{client.email}</p>
                          </div>
                          <Badge variant="outline" className={days <= 7 ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>
                            {days === 0 ? "Today" : `${days}d`}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-emerald-100 bg-white text-slate-900 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base text-emerald-950">Client Finance Summary</CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-emerald-50 hover:text-emerald-800" onClick={() => navigate("/super-admin/companies")}>
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-emerald-100 hover:bg-transparent">
                      <TableHead className="text-slate-500">Company</TableHead>
                      <TableHead className="text-slate-500">Module</TableHead>
                      <TableHead className="text-right text-slate-500">MRR</TableHead>
                      <TableHead className="text-slate-500">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRows.map((client) => (
                      <TableRow key={client.id} className="border-emerald-100 hover:bg-emerald-50/50">
                        <TableCell>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-xs text-slate-500">{client.city || "Nepal"}</div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{planLabel[client.plan]}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">{money(client.monthlyRevenue)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border text-xs capitalize", statusStyle[client.status])}>
                            {client.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {clientRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                          No companies available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {controlCards.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(item.to)}
                className="rounded-xl border border-emerald-100 bg-white p-4 text-left text-slate-900 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-green-50 p-2">
                    <item.icon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{item.detail}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Card className="border-emerald-100 bg-white text-slate-900 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">Owner panel now covers clients, access control, and platform finance.</p>
                  <p className="text-xs text-slate-500">Next backend scale step: dedicated platform expense and invoice ledger.</p>
                </div>
              </div>
              <Button variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50" onClick={() => navigate("/super-admin/revenue")}>
                <FileText className="mr-2 h-4 w-4" /> Finance Detail
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}



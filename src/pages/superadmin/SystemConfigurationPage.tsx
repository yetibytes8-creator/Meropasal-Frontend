import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  BarChart3,
  Building2,
  Coffee,
  FileText,
  Landmark,
  LockKeyhole,
  Package,
  QrCode,
  ReceiptText,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { superAdmin, type SuperAdminClient } from "@/lib/api";

type FeatureKey =
  | "restaurant"
  | "inventory"
  | "finance"
  | "branches"
  | "billing"
  | "reports"
  | "staff"
  | "customers"
  | "qrMenu"
  | "delivery"
  | "bankRecon"
  | "taxes"
  | "refunds";

type RoleKey = "owner" | "manager" | "accountant" | "cashier" | "kitchen" | "viewer";

type CompanyConfig = {
  defaultModule: "restaurant" | "inventory" | "finance";
  accessStatus: "enabled" | "limited" | "blocked";
  maxUsers: number;
  branchLimit: number;
  features: Record<FeatureKey, boolean>;
  roles: Record<RoleKey, FeatureKey[]>;
};

const featureMeta: Array<{
  key: FeatureKey;
  title: string;
  description: string;
  group: "Core" | "Finance" | "Operations";
  icon: typeof Coffee;
}> = [
  { key: "restaurant", title: "Restaurant / Cafe", description: "Menu, orders, tables, kitchen and QR menu.", group: "Core", icon: Coffee },
  { key: "inventory", title: "Inventory / Shop", description: "Products, stock, purchases, POS and suppliers.", group: "Core", icon: Package },
  { key: "finance", title: "Finance & Accounts", description: "Ledger, chart of accounts, journals and statements.", group: "Finance", icon: Landmark },
  { key: "billing", title: "Billing & Invoice", description: "Receipt, tax invoice, discount, credit and print.", group: "Finance", icon: ReceiptText },
  { key: "bankRecon", title: "Bank Reconciliation", description: "Cash, bank, cheque and transfer matching.", group: "Finance", icon: Banknote },
  { key: "taxes", title: "VAT / TDS / Tax", description: "VAT, TDS and statutory reporting support.", group: "Finance", icon: FileText },
  { key: "refunds", title: "Refunds & Returns", description: "Overpayment, sales return and supplier return handling.", group: "Finance", icon: RotateCcw },
  { key: "branches", title: "Branch Management", description: "Multiple branch setup, transfer and branch-wise reports.", group: "Operations", icon: Building2 },
  { key: "reports", title: "Reports", description: "Sales, stock, profit/loss, balance sheet and trial balance.", group: "Operations", icon: BarChart3 },
  { key: "staff", title: "Staff & Roles", description: "Staff login, attendance, role permission and activity.", group: "Operations", icon: Users },
  { key: "customers", title: "Customers & Creditors", description: "Customer records, credit tracking and party ledger access.", group: "Operations", icon: Users },
  { key: "qrMenu", title: "QR / Public Menu", description: "Customer-facing QR menu and table ordering.", group: "Operations", icon: QrCode },
  { key: "delivery", title: "Delivery", description: "Delivery orders, customer details and delivery report.", group: "Operations", icon: Truck },
];

const roleMeta: Array<{ key: RoleKey; title: string; description: string }> = [
  { key: "owner", title: "Owner / Admin", description: "Full company control, settings, finance and staff permissions." },
  { key: "manager", title: "Manager", description: "Operations, reports, staff and day closing." },
  { key: "accountant", title: "Accountant", description: "Finance, ledger, taxes, bank and reports." },
  { key: "cashier", title: "Cashier", description: "POS, billing, collections and refunds." },
  { key: "kitchen", title: "Kitchen Staff", description: "Kitchen display and order status only." },
  { key: "viewer", title: "Viewer", description: "Read-only dashboard and reports." },
];

function defaultFeatures(planModule: SuperAdminClient["plan_module"]): Record<FeatureKey, boolean> {
  const cafe = planModule !== "inventory";
  const inventory = planModule !== "cafe";
  return {
    restaurant: cafe,
    inventory,
    finance: true,
    branches: planModule === "combo",
    billing: true,
    reports: true,
    staff: true,
    customers: true,
    qrMenu: cafe,
    delivery: cafe,
    bankRecon: true,
    taxes: true,
    refunds: true,
  };
}

function defaultConfig(client: SuperAdminClient): CompanyConfig {
  const features = defaultFeatures(client.plan_module);
  return {
    defaultModule: client.plan_module === "inventory" ? "inventory" : "restaurant",
    accessStatus: client.status === "suspended" || client.status === "cancelled" ? "blocked" : "enabled",
    maxUsers: client.max_users || 5,
    branchLimit: client.plan_module === "combo" ? 5 : 1,
    features,
    roles: {
      owner: featureMeta.map((feature) => feature.key),
      manager: ["restaurant", "inventory", "billing", "reports", "staff", "customers", "qrMenu", "delivery", "refunds"],
      accountant: ["finance", "billing", "reports", "bankRecon", "taxes", "refunds"],
      cashier: ["restaurant", "inventory", "billing", "customers", "refunds", "qrMenu"],
      kitchen: ["restaurant"],
      viewer: ["reports", "finance", "customers"],
    },
  };
}

function normalizeConfig(client: SuperAdminClient): CompanyConfig {
  const fromApi = ((client as SuperAdminClient & { system_config?: Partial<CompanyConfig> }).system_config ?? {}) as Partial<CompanyConfig>;
  const fallback = defaultConfig(client);
  return {
    ...fallback,
    ...fromApi,
    features: { ...fallback.features, ...(fromApi.features ?? {}) },
    roles: { ...fallback.roles, ...(fromApi.roles ?? {}) },
    maxUsers: fromApi.maxUsers ?? client.max_users ?? fallback.maxUsers,
  };
}

function apiStatus(configStatus: CompanyConfig["accessStatus"], current: SuperAdminClient["status"]): SuperAdminClient["status"] {
  if (configStatus === "blocked") return "suspended";
  if (configStatus === "limited") return "trial";
  return current === "cancelled" ? "active" : current;
}

export default function SystemConfigurationPage() {
  const [clients, setClients] = useState<SuperAdminClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    superAdmin
      .listClients()
      .then((rows) => {
        if (!mounted) return;
        setClients(rows);
        const first = rows[0];
        if (first) {
          setSelectedClientId(String(first.user_id));
          setConfig(normalizeConfig(first));
        }
      })
      .catch(() => toast.error("Failed to load client configuration"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.user_id) === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const enabledCount = config ? Object.values(config.features).filter(Boolean).length : 0;
  const enabledFinance = config ? ["finance", "billing", "bankRecon", "taxes", "refunds"].filter((key) => config.features[key as FeatureKey]).length : 0;

  const selectClient = (id: string) => {
    const client = clients.find((item) => String(item.user_id) === id);
    setSelectedClientId(id);
    setConfig(client ? normalizeConfig(client) : null);
  };

  const updateConfig = (next: CompanyConfig) => setConfig(next);

  const toggleFeature = (feature: FeatureKey, enabled: boolean) => {
    if (!config) return;
    updateConfig({ ...config, features: { ...config.features, [feature]: enabled } });
  };

  const toggleRoleFeature = (role: RoleKey, feature: FeatureKey) => {
    if (!config) return;
    const current = config.roles[role] ?? [];
    const next = current.includes(feature)
      ? current.filter((item) => item !== feature)
      : [...current, feature];
    updateConfig({ ...config, roles: { ...config.roles, [role]: next } });
  };

  const save = async () => {
    if (!selectedClient || !config) return;
    setSaving(true);
    try {
      const updated = await superAdmin.updateClient(selectedClient.user_id, {
        max_users: config.maxUsers,
        status: apiStatus(config.accessStatus, selectedClient.status),
        system_config: config,
      });
      setClients((prev) => prev.map((client) => (client.user_id === updated.user_id ? updated : client)));
      setConfig(normalizeConfig(updated));
      toast.success("System configuration saved");
    } catch {
      toast.error("Failed to save system configuration");
    } finally {
      setSaving(false);
    }
  };

  const resetCompany = () => {
    if (!selectedClient) return;
    setConfig(defaultConfig(selectedClient));
    toast.success("Configuration reset to plan defaults");
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading system configuration...</div>;
  }

  if (!selectedClient || !config) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">No client company found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Company module and role control
          </div>
          <h1 className="mt-3 text-3xl font-bold text-white">System Configuration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Select a client, enable modules, set limits, and decide what each user role can access.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" onClick={resetCompany}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="text-base">Client Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Client Company</Label>
              <Select value={selectedClientId} onValueChange={selectClient}>
                <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.user_id} value={String(client.user_id)}>
                      {client.business_name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{selectedClient.business_name}</p>
                  <p className="text-xs text-slate-400">{selectedClient.business_type || "Business"} · {selectedClient.email}</p>
                </div>
                <Badge className="border-indigo-400/30 bg-indigo-500/10 text-indigo-200">{selectedClient.plan_name || "No plan"}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-slate-500">Enabled modules</p>
                  <p className="mt-1 text-xl font-bold text-white">{enabledCount}/{featureMeta.length}</p>
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-slate-500">Finance tools</p>
                  <p className="mt-1 text-xl font-bold text-emerald-300">{enabledFinance}/5</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Default Module After Login</Label>
                <Select
                  value={config.defaultModule}
                  onValueChange={(value: CompanyConfig["defaultModule"]) => updateConfig({ ...config, defaultModule: value })}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Access Status</Label>
                <Select
                  value={config.accessStatus}
                  onValueChange={(value: CompanyConfig["accessStatus"]) => updateConfig({ ...config, accessStatus: value })}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="limited">Limited / Trial</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Max Users</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.maxUsers}
                  onChange={(event) => updateConfig({ ...config, maxUsers: Number(event.target.value || 1) })}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Branch Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.branchLimit}
                  onChange={(event) => updateConfig({ ...config, branchLimit: Number(event.target.value || 1) })}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-indigo-300" />
              Module Entitlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="modules">
              <TabsList className="grid w-full grid-cols-2 bg-slate-950">
                <TabsTrigger value="modules">Modules</TabsTrigger>
                <TabsTrigger value="roles">Role Access</TabsTrigger>
              </TabsList>
              <TabsContent value="modules" className="mt-4">
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {featureMeta.map((feature) => {
                    const Icon = feature.icon;
                    const enabled = config.features[feature.key];
                    return (
                      <div
                        key={feature.key}
                        className={cn(
                          "rounded-xl border p-4 transition-colors",
                          enabled ? "border-indigo-400/30 bg-indigo-500/10" : "border-slate-800 bg-slate-950"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", enabled ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400")}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="font-semibold text-white">{feature.title}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-400">{feature.description}</p>
                            </div>
                          </div>
                          <Switch checked={enabled} onCheckedChange={(checked) => toggleFeature(feature.key, checked)} />
                        </div>
                        <Badge variant="outline" className="mt-3 border-slate-700 text-slate-300">{feature.group}</Badge>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
              <TabsContent value="roles" className="mt-4 space-y-4">
                {roleMeta.map((role) => (
                  <div key={role.key} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{role.title}</p>
                        <p className="text-xs text-slate-400">{role.description}</p>
                      </div>
                      <Badge className="bg-slate-800 text-slate-200">{config.roles[role.key]?.length ?? 0} access</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {featureMeta.map((feature) => {
                        const active = config.roles[role.key]?.includes(feature.key);
                        return (
                          <button
                            key={feature.key}
                            type="button"
                            onClick={() => toggleRoleFeature(role.key, feature.key)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                              active
                                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                : "border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-200"
                            )}
                          >
                            {feature.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { icon: Store, title: "Company-wise Access", text: "Each client can have different Restaurant, Inventory, Finance, QR, Delivery and Branch access." },
          { icon: Landmark, title: "Accountant Permission", text: "Accountant role can be limited to ledger, bank reconciliation, taxes, reports and refunds." },
          { icon: LockKeyhole, title: "Trial and Lock Control", text: "Super admin can block, limit or enable companies based on payment, contract or trial status." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-slate-800 bg-slate-900 text-slate-100">
              <CardContent className="flex gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-indigo-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { superAdmin, type SuperAdminClient } from "@/lib/api";
import {
  buildBusinessSystemConfig,
  businessProfiles,
  getBusinessProfile,
  profileFeatureDefaults,
  resolveBusinessProfile,
  type BusinessProfileKey,
} from "@/lib/businessProfiles";

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
type ConfigSectionKey = "modules" | "roles" | "fields" | "setup";

type CompanyConfig = {
  businessProfile: BusinessProfileKey;
  defaultModule: "restaurant" | "inventory" | "finance";
  accessStatus: "enabled" | "limited" | "blocked";
  maxUsers: number;
  branchLimit: number;
  features: Record<FeatureKey, boolean>;
  roles: Record<RoleKey, FeatureKey[]>;
  profileLabels?: Record<string, string>;
  profileFields?: string[];
  productConfig?: {
    categories?: string[];
    units?: string[];
    visibleFields?: string[];
    requiredFields?: string[];
    labels?: Record<string, string>;
  };
  setupChecklist?: string[];
  implementationFlow?: string[];
  roleAccessGuide?: string[];
  financeMapping?: string[];
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
  const businessProfile = resolveBusinessProfile(client.business_type || (client.plan_module === "combo" ? "combo" : client.plan_module));
  const profile = getBusinessProfile(businessProfile);
  const planDefaults = defaultFeatures(client.plan_module);
  const features = { ...planDefaults, ...profileFeatureDefaults(businessProfile) };
  const profileConfig = buildBusinessSystemConfig(businessProfile);
  return {
    ...profileConfig,
    businessProfile,
    defaultModule: profile.defaultModule,
    accessStatus: client.status === "suspended" || client.status === "cancelled" ? "blocked" : "enabled",
    maxUsers: client.max_users || 5,
    branchLimit: client.plan_module === "combo" ? 5 : profile.branchLimit,
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
  const businessProfile = resolveBusinessProfile(fromApi.businessProfile || fallback.businessProfile || client.business_type);
  const profile = getBusinessProfile(businessProfile);
  return {
    ...fallback,
    ...fromApi,
    businessProfile,
    defaultModule: fromApi.defaultModule ?? profile.defaultModule,
    features: { ...fallback.features, ...(fromApi.features ?? {}) },
    roles: { ...fallback.roles, ...(fromApi.roles ?? {}) },
    maxUsers: fromApi.maxUsers ?? client.max_users ?? fallback.maxUsers,
    profileLabels: { ...(fallback.profileLabels ?? {}), ...(fromApi.profileLabels ?? {}) },
    productConfig: { ...(fallback.productConfig ?? {}), ...(fromApi.productConfig ?? {}) },
    profileFields: fromApi.profileFields ?? fallback.profileFields,
    setupChecklist: fromApi.setupChecklist ?? fallback.setupChecklist,
    implementationFlow: fromApi.implementationFlow ?? fallback.implementationFlow,
    roleAccessGuide: fromApi.roleAccessGuide ?? fallback.roleAccessGuide,
    financeMapping: fromApi.financeMapping ?? fallback.financeMapping,
  };
}

function apiStatus(configStatus: CompanyConfig["accessStatus"], current: SuperAdminClient["status"]): SuperAdminClient["status"] {
  if (configStatus === "blocked") return "suspended";
  if (configStatus === "limited") return "trial";
  return current === "cancelled" ? "active" : current;
}

const previewClients: SuperAdminClient[] = [
  {
    id: 901,
    user_id: 901,
    business_name: "Himalayan Clothing Store",
    business_type: "clothing",
    contact_person: "Preview Owner",
    email: "clothes@preview.local",
    phone: "9800000001",
    address: "Kathmandu",
    city: "Kathmandu",
    country: "Nepal",
    plan_module: "inventory",
    plan_id: 2,
    plan_name: "Inventory Pro",
    subscription_id: 9001,
    status: "active",
    created_at: "2026-07-17",
    expires_at: "2027-07-17",
    max_users: 8,
    active_users: 4,
    monthly_revenue: 2500,
    internal_notes: "Preview clothing setup with size, color, SKU and branch stock.",
    finance_enabled: true,
    system_config: buildBusinessSystemConfig("clothing"),
  },
  {
    id: 902,
    user_id: 902,
    business_name: "City Pharmacy",
    business_type: "pharmacy",
    contact_person: "Preview Pharmacist",
    email: "pharmacy@preview.local",
    phone: "9800000002",
    address: "Pokhara",
    city: "Pokhara",
    country: "Nepal",
    plan_module: "inventory",
    plan_id: 2,
    plan_name: "Inventory Pro",
    subscription_id: 9002,
    status: "trial",
    created_at: "2026-07-17",
    expires_at: "2026-08-17",
    max_users: 5,
    active_users: 2,
    monthly_revenue: 1800,
    internal_notes: "Preview pharmacy setup with batch, expiry, supplier and tax alerts.",
    finance_enabled: true,
    system_config: buildBusinessSystemConfig("pharmacy"),
  },
];

export default function SystemConfigurationPage() {
  const [clients, setClients] = useState<SuperAdminClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<ConfigSectionKey>("modules");
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
      .catch(() => {
        if (import.meta.env.DEV) {
          setClients(previewClients);
          setSelectedClientId(String(previewClients[0].user_id));
          setConfig(normalizeConfig(previewClients[0]));
          toast.info("Backend not reachable. Showing preview clients.");
          return;
        }
        toast.error("Failed to load client configuration");
      })
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
  const activeProfile = getBusinessProfile(config?.businessProfile || selectedClient?.business_type || "general_inventory");
  const ActiveProfileIcon = activeProfile.icon;
  const profileOptions = Object.values(businessProfiles);
  const coreEnabled = config ? featureMeta.filter((feature) => feature.group === "Core" && config.features[feature.key]).length : 0;
  const operationsEnabled = config ? featureMeta.filter((feature) => feature.group === "Operations" && config.features[feature.key]).length : 0;

  const selectClient = (id: string) => {
    const client = clients.find((item) => String(item.user_id) === id);
    setSelectedClientId(id);
    setConfig(client ? normalizeConfig(client) : null);
  };

  const updateConfig = (next: CompanyConfig) => setConfig(next);

  const applyBusinessProfile = (profileKey: BusinessProfileKey) => {
    if (!config) return;
    const profile = getBusinessProfile(profileKey);
    const profileFeatures = profileFeatureDefaults(profileKey);
    const profileConfig = buildBusinessSystemConfig(profileKey);
    updateConfig({
      ...config,
      ...profileConfig,
      businessProfile: profileKey,
      defaultModule: profile.defaultModule,
      branchLimit: Math.max(config.branchLimit, profile.branchLimit),
      features: {
        ...config.features,
        ...profileFeatures,
      },
    });
  };

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
        business_type: config.businessProfile,
        finance_enabled: config.features.finance,
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
    return <div className="rounded-xl border border-emerald-100 bg-white p-6 text-slate-700 shadow-sm">Loading system configuration...</div>;
  }

  if (!selectedClient || !config) {
    return <div className="rounded-xl border border-emerald-100 bg-white p-6 text-slate-700 shadow-sm">No client company found.</div>;
  }

  const featureGroups = (["Core", "Finance", "Operations"] as const).map((group) => ({
    group,
    items: featureMeta.filter((feature) => feature.group === group),
  }));
  const groupMeta: Record<"Core" | "Finance" | "Operations", { title: string; description: string; helper: string }> = {
    Core: {
      title: "Business modules",
      description: "Choose the primary app experience for this client.",
      helper: "Restaurant, inventory, or both.",
    },
    Finance: {
      title: "Accounts & compliance",
      description: "Ledger, tax, bank, refund and invoice access for accounting teams.",
      helper: "Billing + finance mapping.",
    },
    Operations: {
      title: "Daily operations",
      description: "Branch, staff, customer, reports, QR menu and delivery add-ons.",
      helper: "Enable only the tools this business will actually use.",
    },
  };
  const visibleFields = config.productConfig?.visibleFields ?? [];
  const requiredFields = config.productConfig?.requiredFields ?? [];
  const defaultCategories = config.productConfig?.categories ?? activeProfile.defaultCategories ?? [];
  const defaultUnits = config.productConfig?.units ?? [];
  const configSidebarItems: Array<{
    key: ConfigSectionKey;
    title: string;
    description: string;
    icon: typeof Coffee;
    count: number;
  }> = [
    {
      key: "modules",
      title: "Modules",
      description: "Core apps, finance and add-on tools.",
      icon: SlidersHorizontal,
      count: enabledCount,
    },
    {
      key: "roles",
      title: "Role Access",
      description: "Owner, manager, accountant and cashier permissions.",
      icon: ShieldCheck,
      count: roleMeta.length,
    },
    {
      key: "fields",
      title: "Business Fields",
      description: `${activeProfile.label} product form fields.`,
      icon: Package,
      count: visibleFields.length,
    },
    {
      key: "setup",
      title: "Setup Flow",
      description: "Implementation checklist and finance mapping.",
      icon: CheckCircle2,
      count: config.setupChecklist?.length ?? 0,
    },
  ];

  return (
    <div className="mx-auto w-full space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-green-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-green-600 via-green-500 to-red-500" />
        <div className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-800">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Client configuration
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-green-950 sm:text-3xl">System Configuration</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Configure client modules, business-specific fields, branch limits, finance mapping, role access and implementation steps from one control room.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="border border-green-100 bg-white text-green-800 hover:bg-white">{activeProfile.label}</Badge>
              <Badge className="border border-green-100 bg-green-50 text-green-700 hover:bg-green-50">{selectedClient.plan_name || "No plan"}</Badge>
              <Badge className="border border-slate-200 bg-white text-slate-700 hover:bg-white">{selectedClient.business_name}</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
            {[
              { label: "Core", value: `${coreEnabled}/2`, tone: "text-green-700 bg-green-50 border-green-100" },
              { label: "Finance", value: `${enabledFinance}/5`, tone: "text-green-700 bg-green-50 border-green-100" },
              { label: "Ops", value: `${operationsEnabled}/6`, tone: "text-slate-700 bg-white border-slate-200" },
            ].map((item) => (
              <div key={item.label} className={cn("rounded-xl border p-3 shadow-sm", item.tone)}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">{item.label}</p>
                <p className="mt-1 text-xl font-black">{item.value}</p>
              </div>
            ))}
            <div className="flex gap-2 sm:col-span-3 xl:col-span-1 xl:flex-col">
              <Button variant="outline" className="flex-1 border-green-200 bg-white text-green-800 hover:bg-green-50" onClick={resetCompany}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button className="flex-1 bg-green-600 text-white shadow-lg shadow-green-900/10 hover:bg-green-700" onClick={save} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden border-green-100 bg-white text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-green-50 bg-gradient-to-r from-green-50 to-white p-4">
            <CardTitle className="flex items-center gap-2 text-base text-green-950">
              <Building2 className="h-5 w-5 text-green-600" />
              Client Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Client Company</Label>
              <Select value={selectedClientId} onValueChange={selectClient}>
                <SelectTrigger className="h-11 border-green-100 bg-white text-slate-900 shadow-sm">
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

            <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-green-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-green-950">{selectedClient.business_name}</p>
                <p className="text-xs text-slate-400">{selectedClient.business_type || "Business"} / {selectedClient.email}</p>
                </div>
                <Badge className="border-green-200 bg-green-50 text-green-700">{selectedClient.plan_name || "No plan"}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-green-100 bg-white p-3 shadow-sm">
                  <p className="text-slate-500">Enabled modules</p>
                  <p className="mt-1 text-xl font-black text-green-950">{enabledCount}/{featureMeta.length}</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-white p-3 shadow-sm">
                  <p className="text-slate-500">Finance tools</p>
                  <p className="mt-1 text-xl font-black text-green-700">{enabledFinance}/5</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-md shadow-green-900/10">
                  <ActiveProfileIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Label className="text-slate-800">Business Profile</Label>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Select clothes, hardware, pharmacy, cafe or another profile. Modules and fields adjust automatically.
                  </p>
                </div>
              </div>
              <Select value={config.businessProfile} onValueChange={(value) => applyBusinessProfile(value as BusinessProfileKey)}>
                <SelectTrigger className="h-11 border-green-100 bg-white text-slate-900 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profileOptions.map((profile) => (
                    <SelectItem key={profile.key} value={profile.key}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-xl border border-green-100 bg-green-50 p-3">
                <p className="text-sm font-bold text-green-800">{activeProfile.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{activeProfile.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-green-200 bg-white text-green-700">{activeProfile.productLabel}</Badge>
                  <Badge variant="outline" className="border-green-200 bg-white text-green-700">{activeProfile.stockLabel}</Badge>
                  <Badge variant="outline" className="border-green-200 bg-white text-green-700">{activeProfile.salesLabel}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Default Module After Login</Label>
                <Select
                  value={config.defaultModule}
                  onValueChange={(value: CompanyConfig["defaultModule"]) => updateConfig({ ...config, defaultModule: value })}
                >
                  <SelectTrigger className="border-emerald-100 bg-white text-slate-900">
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
                <Label className="text-slate-700">Access Status</Label>
                <Select
                  value={config.accessStatus}
                  onValueChange={(value: CompanyConfig["accessStatus"]) => updateConfig({ ...config, accessStatus: value })}
                >
                  <SelectTrigger className="border-emerald-100 bg-white text-slate-900">
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
                <Label className="text-slate-700">Max Users</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.maxUsers}
                  onChange={(event) => updateConfig({ ...config, maxUsers: Number(event.target.value || 1) })}
                  className="border-emerald-100 bg-white text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Branch Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.branchLimit}
                  onChange={(event) => updateConfig({ ...config, branchLimit: Number(event.target.value || 1) })}
                  className="border-emerald-100 bg-white text-slate-900"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hidden">
          <CardHeader className="border-b border-green-50 bg-gradient-to-r from-green-50 to-white p-4">
            <CardTitle className="flex items-center gap-2 text-base text-green-950">
              <SlidersHorizontal className="h-5 w-5 text-green-700" />
              Setup Steps
            </CardTitle>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Jump between the main configuration areas.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {configSidebarItems.map((item) => {
              const Icon = item.icon;
              const active = activeConfigTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveConfigTab(item.key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-all",
                    active
                      ? "border-green-200 bg-green-50 text-green-950 shadow-sm"
                      : "border-transparent bg-white text-slate-700 hover:border-green-100 hover:bg-green-50/60"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-sm",
                      active ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm font-black">
                      <span className="truncate">{item.title}</span>
                      <Badge
                        className={cn(
                          "shrink-0 border text-[10px]",
                          active
                            ? "border-green-200 bg-white text-green-700 hover:bg-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {item.count}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-green-100 bg-white text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-green-50 bg-white p-4">
            <CardTitle className="flex items-center gap-2 text-base text-green-950">
              <ShieldCheck className="h-5 w-5 text-green-700" />
              Client Access Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Tabs value={activeConfigTab} onValueChange={(value) => setActiveConfigTab(value as ConfigSectionKey)}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-green-50 p-1 sm:grid-cols-4">
                <TabsTrigger value="modules">Modules</TabsTrigger>
                <TabsTrigger value="roles">Role Access</TabsTrigger>
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="setup">Setup</TabsTrigger>
              </TabsList>
              <TabsContent value="modules" className="mt-4">
                <div className="space-y-5">
                  <div className="grid gap-3 lg:grid-cols-3">
                    {[
                      { label: "Enabled", value: `${enabledCount}/${featureMeta.length}`, text: "Live tools for this client" },
                      { label: "Profile", value: activeProfile.label, text: `${activeProfile.productLabel} setup active` },
                      { label: "Default app", value: config.defaultModule, text: "First screen after login" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-green-100 bg-green-50/50 p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">{item.label}</p>
                        <p className="mt-1 truncate text-lg font-black capitalize text-green-950">{item.value}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                          <ActiveProfileIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-bold text-green-950">{activeProfile.label} module blueprint</p>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                            Enable only the modules required for this business type. Disabled modules stay hidden from the client's sidebar, forms and role permissions.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-green-200 bg-white text-green-800 hover:bg-green-50"
                          onClick={() => {
                            const profileFeatures = profileFeatureDefaults(config.businessProfile);
                            updateConfig({ ...config, features: { ...config.features, ...profileFeatures } });
                          }}
                        >
                          Apply Profile Defaults
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-200 bg-white text-red-700 hover:bg-red-50"
                          onClick={() => updateConfig({ ...config, features: defaultConfig(selectedClient).features })}
                        >
                          Reset Modules
                        </Button>
                      </div>
                    </div>
                  </div>

                  {featureGroups.map(({ group, items }) => (
                    <div key={group} className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">
                      <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white p-3.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-black text-green-950">{groupMeta[group].title}</p>
                              <Badge variant="outline" className="border-green-200 bg-white text-green-700">
                                {items.filter((feature) => config.features[feature.key]).length}/{items.length} active
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{groupMeta[group].description}</p>
                            <p className="mt-1 text-xs font-semibold text-green-700">{groupMeta[group].helper}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-green-200 bg-white text-green-800 hover:bg-green-50"
                              onClick={() => {
                                const nextFeatures = { ...config.features };
                                items.forEach((feature) => { nextFeatures[feature.key] = true; });
                                updateConfig({ ...config, features: nextFeatures });
                              }}
                            >
                              Enable all
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-200 bg-white text-red-700 hover:bg-red-50"
                              onClick={() => {
                                const nextFeatures = { ...config.features };
                                items.forEach((feature) => { nextFeatures[feature.key] = false; });
                                updateConfig({ ...config, features: nextFeatures });
                              }}
                            >
                              Turn off
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2.5 p-3.5 md:grid-cols-2 2xl:grid-cols-3">
                        {items.map((feature) => {
                          const Icon = feature.icon;
                          const enabled = config.features[feature.key];
                          return (
                            <div
                              key={feature.key}
                              className={cn(
                                "group relative overflow-hidden rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md",
                                enabled ? "border-green-200 bg-green-50/40 shadow-sm" : "border-slate-200 bg-slate-50/80"
                              )}
                            >
                              <span className={cn("absolute inset-y-0 left-0 w-1", enabled ? "bg-green-600" : "bg-slate-200")} />
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-3">
                                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm", enabled ? "bg-green-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>
                                    <Icon className="h-5 w-5" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className={cn("font-bold", enabled ? "text-green-950" : "text-slate-600")}>{feature.title}</p>
                                      <Badge variant="outline" className={cn("h-5 px-2 text-[10px]", enabled ? "border-green-200 bg-white text-green-700" : "border-slate-200 bg-white text-slate-500")}>
                                        {enabled ? "On" : "Off"}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">{feature.description}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleFeature(feature.key, !enabled)}
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                    enabled
                                      ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
                                      : "border-slate-300 bg-white text-transparent hover:border-green-300 hover:text-green-700"
                                  )}
                                  aria-label={`${enabled ? "Disable" : "Enable"} ${feature.title}`}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleFeature(feature.key, !enabled)}
                                className={cn(
                                  "mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                                  enabled
                                    ? "border-green-200 bg-white text-green-800 hover:bg-green-50"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-800"
                                  )}
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                    enabled ? "border-green-600 bg-green-600 text-white" : "border-slate-300 bg-white"
                                  )}
                                >
                                  {enabled && <Check className="h-3 w-3" />}
                                </span>
                                {enabled ? "Enabled for client" : "Enable this module"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="roles" className="mt-4 space-y-4">
                {roleMeta.map((role) => (
                  <div key={role.key} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-emerald-950">{role.title}</p>
                        <p className="text-xs text-slate-500">{role.description}</p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-800">{config.roles[role.key]?.length ?? 0} access</Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {featureMeta.map((feature) => {
                        const active = config.roles[role.key]?.includes(feature.key);
                        const disabled = !config.features[feature.key];
                        return (
                          <button
                            key={feature.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleRoleFeature(role.key, feature.key)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                              active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                              )}
                            >
                              {active && <Check className="h-3 w-3" />}
                            </span>
                            <span className="truncate">{feature.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="fields" className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <p className="font-bold text-emerald-950">Product form fields</p>
                  <p className="mt-1 text-xs text-slate-500">Fields shown in product forms for this client's business profile.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {visibleFields.map((field) => (
                      <div key={field} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                        <span>{config.productConfig?.labels?.[field] ?? field}</span>
                        {requiredFields.includes(field) ? <Badge className="bg-green-50 text-green-700">Required</Badge> : <Badge className="bg-slate-50 text-slate-600">Optional</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <p className="font-bold text-emerald-950">Categories</p>
                    <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                      {defaultCategories.map((category) => (
                        <Badge key={category} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">{category}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <p className="font-bold text-emerald-950">Units</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {defaultUnits.map((unit) => (
                        <Badge key={unit} variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">{unit}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="setup" className="mt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <p className="font-bold text-emerald-950">Implementation checklist</p>
                    <div className="mt-3 space-y-2">
                      {(config.setupChecklist ?? []).map((item) => (
                        <div key={item} className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium leading-5 text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
                    <p className="font-bold text-green-900">Finance mapping</p>
                    <div className="mt-3 space-y-2">
                      {(config.financeMapping ?? []).map((item) => (
                        <div key={item} className="rounded-lg border border-green-100 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-100 bg-white text-slate-900 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-emerald-950">
                <ActiveProfileIcon className="h-5 w-5 text-emerald-700" />
                {activeProfile.label} Implementation Blueprint
              </CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                When a company is created, this profile controls its modules, fields, roles, finance mapping and setup checklist.
              </p>
            </div>
            <Badge className="w-fit bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
              {activeProfile.moduleLabel} setup
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Package,
              title: "Product / Stock Fields",
              items: activeProfile.keyFields,
            },
            {
              icon: Store,
              title: "Default Categories",
              items: activeProfile.defaultCategories ?? [activeProfile.productLabel, activeProfile.stockLabel, activeProfile.purchaseLabel, activeProfile.salesLabel],
            },
            {
              icon: Users,
              title: "User & Role Access",
              items: activeProfile.roleAccessGuide ?? [
                "Owner: full access",
                "Manager: operations and reports",
                "Cashier: sales and receipts",
                "Accountant: finance, bank and tax",
              ],
            },
            {
              icon: Landmark,
              title: "Finance Auto Mapping",
              items: activeProfile.financeMapping ?? [
                "Sales -> Sales Revenue",
                "Purchase -> Inventory / COGS",
                "Payment -> Cash / Bank",
                "Refund -> Return ledger",
              ],
            },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-bold text-emerald-950">{section.title}</p>
                </div>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item} className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 lg:col-span-2 xl:col-span-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-green-600 shadow-sm">
                <FileText className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold text-green-900">Setup Flow</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(activeProfile.implementationFlow ?? activeProfile.setupChecklist).map((step, index) => (
                <div key={step} className="flex items-start gap-2 rounded-lg border border-green-100 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { icon: Store, title: "Company-wise Access", text: "Each client can have different Restaurant, Inventory, Finance, QR, Delivery and Branch access." },
          { icon: Landmark, title: "Accountant Permission", text: "Accountant role can be limited to ledger, bank reconciliation, taxes, reports and refunds." },
          { icon: LockKeyhole, title: "Trial and Lock Control", text: "Super admin can block, limit or enable companies based on payment, contract or trial status." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-emerald-100 bg-white text-slate-900 shadow-sm">
              <CardContent className="flex gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-emerald-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}



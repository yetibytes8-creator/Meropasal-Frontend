import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChefHat,
  Eye,
  ImageIcon,
  Printer,
  Receipt,
  ReceiptText,
  Save,
  Shield,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { ROLE_META, type StaffRole } from "@/lib/rbac";
import { branches as branchesApi, setSelectedBranchId, type ApiBranch } from "@/lib/api";

const ROLE_ORDER: StaffRole[] = ["admin", "manager", "cashier", "kitchen", "staff"];

const SettingsPage = () => {
  const { settings, setSettings, saveSettings } = useSettings();
  const location = useLocation();
  const logoRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    manager_name: "",
  });
  const staffPath = location.pathname.startsWith("/restaurant") ? "/restaurant/staff" : "/inventory/staff";
  const invoiceSettings = settings.printSettings.invoice;
  const kotSettings = settings.printSettings.kot;
  const reportSettings = settings.printSettings.report;

  useEffect(() => {
    branchesApi.list().then(setBranches).catch(() => setBranches([]));
  }, []);

  const updateInvoiceSettings = (patch: Partial<typeof invoiceSettings>) => {
    setSettings((s) => ({
      ...s,
      printSettings: {
        ...s.printSettings,
        invoice: { ...s.printSettings.invoice, ...patch },
      },
    }));
  };

  const updateKotSettings = (patch: Partial<typeof kotSettings>) => {
    setSettings((s) => ({
      ...s,
      printSettings: {
        ...s.printSettings,
        kot: { ...s.printSettings.kot, ...patch },
      },
    }));
  };

  const updateReportSettings = (patch: Partial<typeof reportSettings>) => {
    setSettings((s) => ({
      ...s,
      printSettings: {
        ...s.printSettings,
        report: { ...s.printSettings.report, ...patch },
      },
    }));
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setSettings((s) => ({ ...s, logo: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeLogo = () => setSettings((s) => ({ ...s, logo: undefined }));

  const handleQrUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("QR image must be under 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () =>
      setSettings((s) => ({
        ...s,
        paymentQr: { ...s.paymentQr, image: reader.result as string, showOnBill: true },
      }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updatePaymentQr = (patch: Partial<typeof settings.paymentQr>) => {
    setSettings((s) => ({ ...s, paymentQr: { ...s.paymentQr, ...patch } }));
  };

  const handleSave = async () => {
    try {
      await saveSettings(settings);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleAddBranch = async () => {
    if (!branchForm.name.trim()) {
      toast.error("Branch name is required");
      return;
    }

    try {
      const branch = await branchesApi.create({
        ...branchForm,
        name: branchForm.name.trim(),
        code: branchForm.code.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim(),
        manager_name: branchForm.manager_name.trim(),
        is_active: true,
        is_primary: branches.length === 0,
      });
      setBranches((items) => [...items, branch].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name)));
      setBranchForm({ name: "", code: "", address: "", phone: "", manager_name: "" });
      toast.success("Branch added");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const updateBranch = async (branch: ApiBranch, patch: Partial<ApiBranch>) => {
    try {
      const updated = await branchesApi.update(branch.id, patch);
      const next = branches
        .map((item) => {
          if (patch.is_primary) return item.id === updated.id ? updated : { ...item, is_primary: false };
          return item.id === updated.id ? updated : item;
        })
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name));
      setBranches(next);
      if (patch.is_primary) {
        setSelectedBranchId(String(updated.id));
        toast.success(`${updated.name} is now primary`);
      } else {
        toast.success("Branch updated");
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Settings</h1>
        <p className="page-description">Configure your business and system preferences</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="business" className="gap-2 flex-1 sm:flex-none">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 flex-1 sm:flex-none">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 flex-1 sm:flex-none">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2 flex-1 sm:flex-none">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">User Roles</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Information</CardTitle>
              <CardDescription>Update your business profile, logo, and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Business Logo</Label>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {settings.logo ? (
                      <img src={settings.logo} alt="Business logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={handleLogoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => logoRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      {settings.logo ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {settings.logo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={removeLogo}
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PNG, JPG or WebP - max 2 MB</p>
                    <p className="text-xs text-muted-foreground">Shown on invoices, receipts, and the sidebar</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PAN / VAT Number</Label>
                  <Input
                    value={settings.taxNumber}
                    onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                    placeholder="e.g. 123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
                </div>
              </div>

              <Button onClick={handleSave} className="w-full sm:w-auto gap-2">
                <Save className="w-4 h-4 shrink-0" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Branches</CardTitle>
              <CardDescription>Track branch-wise sales, purchases, stock, orders, expenses, income, and finance reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Branch Name</Label>
                  <Input
                    value={branchForm.name}
                    onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. New Baneshwor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={branchForm.code}
                    onChange={(e) => setBranchForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="NB-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="98xxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Manager</Label>
                  <Input
                    value={branchForm.manager_name}
                    onChange={(e) => setBranchForm((f) => ({ ...f, manager_name: e.target.value }))}
                    placeholder="Manager name"
                  />
                </div>
                <div className="space-y-2 md:col-span-4">
                  <Label>Address</Label>
                  <Input
                    value={branchForm.address}
                    onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Branch address"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddBranch} className="w-full gap-2">
                    <Building2 className="w-4 h-4" />
                    Add Branch
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {branches.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                    No branches yet. Add one branch to start branch-wise reporting.
                  </div>
                ) : branches.map((branch) => (
                  <div key={branch.id} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{branch.name}</h3>
                          {branch.is_primary && <Badge className="bg-primary/10 text-primary border-primary/20">Primary</Badge>}
                          {!branch.is_active && <Badge variant="outline">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {[branch.code, branch.address].filter(Boolean).join(" · ") || "No address set"}
                        </p>
                      </div>
                      <Switch
                        checked={branch.is_active}
                        onCheckedChange={(checked) => updateBranch(branch, { is_active: checked })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{branch.phone || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Manager</p>
                        <p className="font-medium">{branch.manager_name || "Not set"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={branch.is_primary ? "secondary" : "outline"}
                        disabled={branch.is_primary || !branch.is_active}
                        onClick={() => updateBranch(branch, { is_primary: true })}
                      >
                        Make Primary
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBranchId(String(branch.id));
                          toast.success(`${branch.name} selected`);
                        }}
                      >
                        Use This Branch
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-4 w-4" />
                    Tax & Currency
                  </CardTitle>
                  <CardDescription>Configure billing values used by invoices and receipts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={settings.taxRate}
                        onChange={(e) =>
                          setSettings({ ...settings, taxRate: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency Code</Label>
                      <Input value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency Symbol</Label>
                      <Input
                        value={settings.currencySymbol}
                        onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Receipt Footer</Label>
                    <Textarea
                      value={settings.receiptFooter}
                      onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ReceiptText className="h-4 w-4" />
                    Payment QR
                  </CardTitle>
                  <CardDescription>Upload bank, eSewa, Fonepay, Khalti, or any payment QR for bills and receipts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border bg-white">
                      {settings.paymentQr.image ? (
                        <img src={settings.paymentQr.image} alt="Payment QR" className="h-full w-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold">Bill payment QR</p>
                      <p className="text-sm text-muted-foreground">Online / QR payment select गर्दा invoice मा यही QR देखिन्छ।</p>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch checked={settings.paymentQr.showOnBill} onCheckedChange={(value) => updatePaymentQr({ showOnBill: value })} />
                        <Label>Show QR on bill</Label>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input ref={qrRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleQrUpload} />
                      <Button type="button" variant="outline" className="gap-2" onClick={() => qrRef.current?.click()}>
                        <Upload className="h-4 w-4" />
                        {settings.paymentQr.image ? "Change QR" : "Upload QR"}
                      </Button>
                      {settings.paymentQr.image && (
                        <Button type="button" variant="ghost" className="gap-2 text-destructive hover:text-destructive" onClick={() => updatePaymentQr({ image: undefined })}>
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Input
                        value={settings.paymentQr.provider}
                        onChange={(e) => updatePaymentQr({ provider: e.target.value.toLowerCase() as typeof settings.paymentQr.provider })}
                        placeholder="esewa / fonepay / khalti / bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account / Wallet Name</Label>
                      <Input value={settings.paymentQr.accountName} onChange={(e) => updatePaymentQr({ accountName: e.target.value })} placeholder="Business or bank account name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile / Account No.</Label>
                      <Input value={settings.paymentQr.accountNumber} onChange={(e) => updatePaymentQr({ accountNumber: e.target.value })} placeholder="Wallet ID / bank account / phone" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Printer className="h-4 w-4" />
                    Report Header & Footer
                  </CardTitle>
                  <CardDescription>Company-wise letterhead and signature footer for finance/accounting reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-white">
                      {settings.logo && reportSettings.showLogo ? (
                        <img src={settings.logo} alt="Report logo" className="h-full w-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{settings.businessName || "Business"}</p>
                      <p className="text-sm text-muted-foreground">This logo and header are saved under this company account.</p>
                    </div>
                    <Button type="button" variant="outline" className="gap-2" onClick={() => logoRef.current?.click()}>
                      <Upload className="h-4 w-4" />
                      {settings.logo ? "Change Logo" : "Upload Logo"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Report Department / Prefix</Label>
                      <Input value={reportSettings.titlePrefix} onChange={(e) => updateReportSettings({ titlePrefix: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Note</Label>
                      <Input value={reportSettings.headerNote} onChange={(e) => updateReportSettings({ headerNote: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Footer Note</Label>
                      <Textarea value={reportSettings.footerNote} onChange={(e) => updateReportSettings({ footerNote: e.target.value })} rows={2} />
                    </div>
                    {[
                      ["createdByLabel", "Created By Label"],
                      ["checkedByLabel", "Checked By Label"],
                      ["printedByLabel", "Printed By Label"],
                      ["authorizedByLabel", "Authorized By Label"],
                    ].map(([key, label]) => (
                      <div key={key} className="space-y-2">
                        <Label>{label}</Label>
                        <Input
                          value={String(reportSettings[key as keyof typeof reportSettings])}
                          onChange={(e) => updateReportSettings({ [key]: e.target.value } as Partial<typeof reportSettings>)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["showLogo", "Logo"],
                      ["showAddress", "Address"],
                      ["showPanVat", "PAN/VAT"],
                      ["showPhoneEmail", "Phone & Email"],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2">
                        <Label className="text-sm">{label}</Label>
                        <Switch
                          checked={Boolean(reportSettings[key as keyof typeof reportSettings])}
                          onCheckedChange={(value) => updateReportSettings({ [key]: value } as Partial<typeof reportSettings>)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ReceiptText className="h-4 w-4" />
                    Invoice Setting
                  </CardTitle>
                  <CardDescription>Choose what appears when a restaurant bill is printed or downloaded</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Title</Label>
                      <Input value={invoiceSettings.title} onChange={(e) => updateInvoiceSettings({ title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Text</Label>
                      <Input value={invoiceSettings.headerText} onChange={(e) => updateInvoiceSettings({ headerText: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Footer Title</Label>
                      <Input value={invoiceSettings.footerTitle} onChange={(e) => updateInvoiceSettings({ footerTitle: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Footer Message</Label>
                      <Input value={invoiceSettings.footerMessage} onChange={(e) => updateInvoiceSettings({ footerMessage: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      ["showLogo", "Logo"],
                      ["showBusinessName", "Business Name"],
                      ["showAddress", "Address"],
                      ["showPhone", "Phone"],
                      ["showEmail", "Email"],
                      ["showInvoiceNo", "Invoice No"],
                      ["showDate", "Date"],
                      ["showOrderType", "Order Type"],
                      ["showTable", "Table"],
                      ["showPaymentMode", "Payment Mode"],
                      ["showQr", "QR Code"],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2">
                        <Label className="text-sm">{label}</Label>
                        <Switch
                          checked={Boolean(invoiceSettings[key as keyof typeof invoiceSettings])}
                          onCheckedChange={(value) => updateInvoiceSettings({ [key]: value } as Partial<typeof invoiceSettings>)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ChefHat className="h-4 w-4" />
                    KOT Setting
                  </CardTitle>
                  <CardDescription>Control kitchen order ticket heading, items, footer, and copies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>KOT Title</Label>
                      <Input value={kotSettings.title} onChange={(e) => updateKotSettings({ title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Text</Label>
                      <Input value={kotSettings.headerText} onChange={(e) => updateKotSettings({ headerText: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Print Count</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={kotSettings.printCount}
                        onChange={(e) => updateKotSettings({ printCount: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>Footer Text</Label>
                      <Textarea value={kotSettings.footerText} onChange={(e) => updateKotSettings({ footerText: e.target.value })} rows={2} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      ["compactView", "Compact View"],
                      ["showLogo", "Logo"],
                      ["showBusinessName", "Business Name"],
                      ["showKotNo", "KOT No"],
                      ["showOrderType", "Order Type"],
                      ["showTable", "Table"],
                      ["showOrderBy", "Order By"],
                      ["showTime", "Time"],
                      ["showItems", "Dishes"],
                      ["showQuantity", "Quantity"],
                      ["showRemarks", "Remarks"],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2">
                        <Label className="text-sm">{label}</Label>
                        <Switch
                          checked={Boolean(kotSettings[key as keyof typeof kotSettings])}
                          onCheckedChange={(value) => updateKotSettings({ [key]: value } as Partial<typeof kotSettings>)}
                        />
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSave} className="w-full sm:w-auto gap-2">
                    <Save className="w-4 h-4 shrink-0" />
                    Save Billing Settings
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-4 w-4" />
                    Invoice Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mx-auto max-w-[290px] rounded-xl border bg-white p-4 text-slate-950 shadow-sm">
                    {settings.logo && invoiceSettings.showLogo && <img src={settings.logo} alt="Logo preview" className="mx-auto mb-2 h-10 max-w-24 object-contain" />}
                    {invoiceSettings.showBusinessName && <p className="text-center text-base font-bold">{settings.businessName}</p>}
                    {invoiceSettings.showAddress && <p className="text-center text-xs text-slate-500">{settings.address || "Business address"}</p>}
                    {(invoiceSettings.showPhone || invoiceSettings.showEmail) && (
                      <p className="text-center text-[11px] text-slate-500">
                        {[invoiceSettings.showPhone ? settings.phone : "", invoiceSettings.showEmail ? settings.email : ""].filter(Boolean).join(" | ")}
                      </p>
                    )}
                    {invoiceSettings.headerText && <p className="mt-1 text-center text-[11px] text-slate-500">{invoiceSettings.headerText}</p>}
                    <div className="my-3 border-t border-dashed border-slate-300" />
                    <p className="text-center text-sm font-bold">{invoiceSettings.title || "INVOICE"}</p>
                    {invoiceSettings.showInvoiceNo && <p className="text-center text-xs text-slate-500">#1024</p>}
                    <div className="my-3 border-t border-dashed border-slate-300" />
                    <div className="space-y-1 text-xs">
                      {invoiceSettings.showDate && <p>Date: Jul 2, 2026 7:45 AM</p>}
                      {invoiceSettings.showOrderType && <p>Type: dine-in{invoiceSettings.showTable ? " (Table 1)" : ""}</p>}
                      {invoiceSettings.showPaymentMode && <p>Payment: split (Cash Rs. 500 + Online Rs. 700)</p>}
                    </div>
                    <div className="my-3 border-t border-dashed border-slate-300" />
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold"><span>Chicken Momo x2</span><span>Rs. 360</span></div>
                      <div className="flex justify-between"><span>Milk Tea x3</span><span>Rs. 180</span></div>
                      <div className="mt-2 flex justify-between border-t pt-2 text-sm font-bold"><span>Total</span><span>Rs. 540</span></div>
                    </div>
                    {invoiceSettings.showQr && <div className="mx-auto my-3 h-16 w-16 rounded-lg border bg-[linear-gradient(45deg,#111_25%,transparent_25%),linear-gradient(-45deg,#111_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#111_75%),linear-gradient(-45deg,transparent_75%,#111_75%)] bg-[length:10px_10px] bg-[position:0_0,0_5px,5px_-5px,-5px_0]" />}
                    {invoiceSettings.footerTitle && <p className="text-center text-xs font-bold">{invoiceSettings.footerTitle}</p>}
                    <p className="text-center text-[11px] text-slate-500">{invoiceSettings.footerMessage || settings.receiptFooter}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Printer className="h-4 w-4" />
                    KOT Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mx-auto max-w-[290px] rounded-xl border bg-white p-4 text-slate-950 shadow-sm">
                    {settings.logo && kotSettings.showLogo && <img src={settings.logo} alt="KOT logo preview" className="mx-auto mb-2 h-9 max-w-20 object-contain" />}
                    {kotSettings.showBusinessName && <p className="text-center text-sm font-bold">{settings.businessName}</p>}
                    {kotSettings.headerText && <p className="text-center text-xs text-slate-500">{kotSettings.headerText}</p>}
                    <div className="my-3 border-t border-dashed border-slate-300" />
                    <p className="text-center text-base font-bold">{kotSettings.title || "KOT"}</p>
                    {kotSettings.showKotNo && <p className="text-center text-xs text-slate-500">#1024</p>}
                    <div className="my-3 border-t border-dashed border-slate-300" />
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {kotSettings.showOrderType && <p>Type: Dine In</p>}
                      {kotSettings.showTable && <p>Table: 1</p>}
                      {kotSettings.showOrderBy && <p>By: Counter</p>}
                      {kotSettings.showTime && <p>7:45 AM</p>}
                    </div>
                    {kotSettings.showItems && (
                      <>
                        <div className="my-3 border-t border-dashed border-slate-300" />
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span>1. Chicken Momo</span>{kotSettings.showQuantity && <span>2</span>}</div>
                          <div className="flex justify-between"><span>2. Milk Tea</span>{kotSettings.showQuantity && <span>3</span>}</div>
                        </div>
                      </>
                    )}
                    {kotSettings.showRemarks && <p className="mt-3 text-xs text-slate-500">Remarks: No extra spicy.</p>}
                    {kotSettings.footerText && <p className="mt-3 text-center text-[11px] text-slate-600">{kotSettings.footerText}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose which alerts you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "lowStock" as const, label: "Low Stock Alerts", desc: "Get notified when products fall below minimum stock level" },
                { key: "newOrders" as const, label: "New Order Alerts", desc: "Get notified when new orders are placed" },
                { key: "dailyReport" as const, label: "Daily Summary Report", desc: "Receive a daily summary of sales and activity" },
                { key: "expenseApproval" as const, label: "Expense Approvals", desc: "Get notified when expenses need approval" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings.notifications[item.key]}
                    onCheckedChange={(v) =>
                      setSettings({ ...settings, notifications: { ...settings.notifications, [item.key]: v } })
                    }
                  />
                </div>
              ))}
              <Button onClick={handleSave} className="w-full sm:w-auto gap-2">
                <Save className="w-4 h-4 shrink-0" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  User Roles
                </CardTitle>
                <CardDescription>Review built-in staff roles and their module access</CardDescription>
              </div>
              <Button asChild variant="outline" className="h-10 rounded-xl gap-2">
                <Link to={staffPath}>
                  Manage Users & Roles
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {ROLE_ORDER.map((role) => {
                  const meta = ROLE_META[role];

                  return (
                    <div key={role} className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge variant="outline" className={meta.color}>
                          {meta.label}
                        </Badge>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-sm text-foreground">{meta.description}</p>
                      <div className="mt-4 rounded-lg border bg-background/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access</p>
                        <p className="mt-1 text-sm leading-relaxed">{meta.pages}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 rounded-xl border border-dashed bg-muted/20 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Assign roles from Staff Management</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    User access is enforced by these role definitions. Add or edit team members from the staff page, then choose the right role for each user.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Building2, CheckCircle2, CreditCard, ImageUp, ListChecks,
  Printer, QrCode, ShieldAlert, Sparkles, ToggleLeft, Trash2,
} from "lucide-react";
import { toast } from "sonner";

type CafeConfig = {
  branchName: string;
  orderType: "table" | "token" | "customer";
  loyaltySpend: string;
  loyaltyPoints: string;
  redeemablePoint: string;
  loyaltyDiscount: string;
  autoStock: boolean;
  autoPrinter: boolean;
  autoPrintQr: boolean;
  paymentQr: { id: string; name: string; image: string }[];
  note: string;
};

const STORAGE_KEY = "mero-pasal-cafe-settings";

const defaultConfig: CafeConfig = {
  branchName: "Primary Branch",
  orderType: "table",
  loyaltySpend: "1000",
  loyaltyPoints: "10",
  redeemablePoint: "100",
  loyaltyDiscount: "5",
  autoStock: true,
  autoPrinter: false,
  autoPrintQr: false,
  paymentQr: [],
  note: "Please verify pending orders before changing order type.",
};

function readConfig(): CafeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
}

const unitGroups = [
  { title: "Weight Units", rows: [["mg", "Milligram"], ["gram", "Gram"], ["kg", "Kilogram"], ["ton", "Ton (Metric)"]] },
  { title: "Volume Units", rows: [["ml", "Milliliter"], ["litre", "Litre"], ["bottle", "Bottled items"], ["cup", "Cup"]] },
  { title: "Countable Units", rows: [["piece", "Single item"], ["packet", "Small packs"], ["dozen", "12 items"], ["set", "Grouped set"], ["carton", "Larger packaging"]] },
  { title: "Restaurant Units", rows: [["plate", "Dish serving"], ["portion", "Food portion"], ["glass", "Drink serving"], ["combo", "Grouped offer"]] },
];

export default function CafeSettingsPage() {
  const { settings, saveSettings } = useSettings();
  const [config, setConfig] = useState<CafeConfig>(readConfig);
  const [saving, setSaving] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    businessName: settings.businessName,
    taxNumber: settings.taxNumber,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    receiptFooter: settings.receiptFooter,
    logo: settings.logo || "",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    setBusinessForm({
      businessName: settings.businessName,
      taxNumber: settings.taxNumber,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      receiptFooter: settings.receiptFooter,
      logo: settings.logo || "",
    });
  }, [settings]);

  const orderTypeLabel = useMemo(() => ({
    table: "Table Based",
    token: "Token Based",
    customer: "Customer Name Based",
  }[config.orderType]), [config.orderType]);

  const update = <K extends keyof CafeConfig>(key: K, value: CafeConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const uploadQr = (id: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setConfig((prev) => ({
        ...prev,
        paymentQr: prev.paymentQr.map((qr) => qr.id === id ? { ...qr, image: String(reader.result) } : qr),
      }));
    };
    reader.readAsDataURL(file);
  };

  const addQr = () => {
    if (config.paymentQr.length >= 3) {
      toast.error("Maximum 3 payment QR codes can be added");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      paymentQr: [...prev.paymentQr, { id: String(Date.now()), name: `QR ${prev.paymentQr.length + 1}`, image: "" }],
    }));
  };

  const updateBusiness = (patch: Partial<typeof businessForm>) => {
    setBusinessForm((prev) => ({ ...prev, ...patch }));
  };

  const uploadBusinessLogo = (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateBusiness({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const saveBusinessProfile = async () => {
    const name = businessForm.businessName.trim();
    if (!name) {
      toast.error("Business name is required");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        ...settings,
        businessName: name,
        taxNumber: businessForm.taxNumber.trim(),
        phone: businessForm.phone.trim(),
        email: businessForm.email.trim(),
        address: businessForm.address.trim(),
        receiptFooter: businessForm.receiptFooter.trim(),
        logo: businessForm.logo || undefined,
      });
      toast.success("Cafe profile saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    await saveBusinessProfile();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cafe Settings</h1>
          <p className="text-muted-foreground">Branch, loyalty, payment QR, order type, printer, and cafe controls</p>
        </div>
        <Button onClick={save} disabled={saving}><CheckCircle2 className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Settings"}</Button>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="flex h-auto w-full justify-start overflow-x-auto rounded-lg bg-muted/70 p-1">
          {[
            ["account", Building2, "Cafe Account"],
            ["loyalty", Sparkles, "Loyalty"],
            ["payment", QrCode, "Payment QR"],
            ["order", ListChecks, "Order Type"],
            ["automation", ToggleLeft, "Additional"],
            ["units", Printer, "Unit Details"],
            ["danger", ShieldAlert, "Delete Cafe"],
          ].map(([value, Icon, label]) => (
            <TabsTrigger key={String(value)} value={String(value)} className="whitespace-nowrap gap-2">
              <Icon className="h-4 w-4" />{String(label)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Cafe Account</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 md:col-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {businessForm.logo ? <img src={businessForm.logo} className="h-20 w-20 rounded-lg border object-contain" /> : <div className="grid h-20 w-20 place-items-center rounded-lg border bg-muted text-xs text-muted-foreground">Logo</div>}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{businessForm.businessName || "My Business"}</h2>
                    <p className="text-sm text-muted-foreground">{businessForm.address || "Address not set"}</p>
                    <p className="text-sm text-muted-foreground">PAN/VAT: {businessForm.taxNumber || "Not set"} | Phone: {businessForm.phone || "Not set"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent">
                        <ImageUp className="mr-2 h-4 w-4" />Upload Logo
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadBusinessLogo(e.target.files?.[0])} />
                      </label>
                      {businessForm.logo && (
                        <Button type="button" variant="ghost" className="text-destructive" onClick={() => updateBusiness({ logo: "" })}>
                          <Trash2 className="mr-2 h-4 w-4" />Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Business / Cafe Name</Label>
                <Input value={businessForm.businessName} maxLength={200} onChange={(e) => updateBusiness({ businessName: e.target.value })} placeholder="e.g. Chiya Xpress" />
              </div>
              <div className="space-y-2">
                <Label>PAN / VAT Number</Label>
                <Input value={businessForm.taxNumber} maxLength={100} onChange={(e) => updateBusiness({ taxNumber: e.target.value })} placeholder="e.g. 2345677898" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={businessForm.phone} maxLength={50} onChange={(e) => updateBusiness({ phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={businessForm.email} onChange={(e) => updateBusiness({ email: e.target.value })} placeholder="Email address" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Business Address</Label>
                <Textarea value={businessForm.address} onChange={(e) => updateBusiness({ address: e.target.value })} placeholder="Full business address" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Bill / Receipt Footer</Label>
                <Input value={businessForm.receiptFooter} onChange={(e) => updateBusiness({ receiptFooter: e.target.value })} placeholder="Thank you message shown on bills" />
              </div>
              <div className="space-y-2">
                <Label>Branch Name</Label>
                <Input value={config.branchName} onChange={(e) => update("branchName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Operating Mode</Label>
                <Select value={config.orderType} onValueChange={(value: CafeConfig["orderType"]) => update("orderType", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table Based</SelectItem>
                    <SelectItem value="token">Token Based</SelectItem>
                    <SelectItem value="customer">Customer Name Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Internal Note</Label>
                <Textarea value={config.note} onChange={(e) => update("note", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={saveBusinessProfile} disabled={saving}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Cafe Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader><CardTitle>Loyalty Setting</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="On every X amount" value={config.loyaltySpend} onChange={(v) => update("loyaltySpend", v)} />
              <Field label="Points earned" value={config.loyaltyPoints} onChange={(v) => update("loyaltyPoints", v)} />
              <Field label="Redeemable point" value={config.redeemablePoint} onChange={(v) => update("redeemablePoint", v)} />
              <Field label="Discount percent" value={config.loyaltyDiscount} onChange={(v) => update("loyaltyDiscount", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Payment QR Setup</CardTitle>
              <Button variant="outline" onClick={addQr}><QrCode className="mr-2 h-4 w-4" />Add QR</Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {config.paymentQr.length === 0 && <EmptyCard text="Add up to 3 QR codes for counter, eSewa, Khalti, or bank payment." />}
              {config.paymentQr.map((qr) => (
                <div key={qr.id} className="space-y-3 rounded-lg border p-4">
                  <Input value={qr.name} onChange={(e) => setConfig((prev) => ({ ...prev, paymentQr: prev.paymentQr.map((item) => item.id === qr.id ? { ...item, name: e.target.value } : item) }))} />
                  <label className="flex h-36 cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/40">
                    {qr.image ? <img src={qr.image} className="h-full w-full rounded-lg object-contain" /> : <span className="flex items-center gap-2 text-sm text-muted-foreground"><ImageUp className="h-4 w-4" />Upload Image</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadQr(qr.id, e.target.files?.[0])} />
                  </label>
                  <Button variant="ghost" className="w-full text-destructive" onClick={() => setConfig((prev) => ({ ...prev, paymentQr: prev.paymentQr.filter((item) => item.id !== qr.id) }))}>
                    <Trash2 className="mr-2 h-4 w-4" />Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order">
          <Card>
            <CardHeader><CardTitle>Order Type</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current</p>
                  <h2 className="text-2xl font-semibold text-primary">{orderTypeLabel}</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">Choose how orders are tracked: table number for dine-in, token for counter service, or customer name for personalized order handling.</p>
                </div>
                <Select value={config.orderType} onValueChange={(value: CafeConfig["orderType"]) => update("orderType", value)}>
                  <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table Based</SelectItem>
                    <SelectItem value="token">Token Based</SelectItem>
                    <SelectItem value="customer">Customer Name Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
                <div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Important Notice</div>
                <p className="text-sm">Close pending orders before changing the order system. Inform cashier, kitchen, and billing users after the change.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader><CardTitle>Additional Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow title="Auto - Stock Update" description="Automatically updates ingredients and inventory after order completion." checked={config.autoStock} onCheckedChange={(v) => update("autoStock", v)} />
              <ToggleRow title="Auto - Printer Automation" description="Automatically prints KOT/BOT and receipt on order confirmation/completion." checked={config.autoPrinter} onCheckedChange={(v) => update("autoPrinter", v)} />
              <ToggleRow title="Auto - Print QR in Bill" description="Print payment QR on the customer bill." checked={config.autoPrintQr} onCheckedChange={(v) => update("autoPrintQr", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units">
          <div className="grid gap-4 md:grid-cols-2">
            {unitGroups.map((group) => (
              <Card key={group.title}>
                <CardHeader><CardTitle>{group.title}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {group.rows.map(([unit, detail]) => (
                    <div key={unit} className="grid grid-cols-[90px_1fr] rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <span className="font-semibold">{unit}</span><span className="text-muted-foreground">- {detail}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="text-destructive">Delete Cafe</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
                <h3 className="font-semibold">Warning: Permanent Action</h3>
                <p className="mt-1 text-sm">Deleting a cafe removes branches, users, menu items, order history, and sales records. Export reports before proceeding.</p>
              </div>
              <Button variant="destructive" disabled><Trash2 className="mr-2 h-4 w-4" />Delete Cafe disabled for demo</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ToggleRow({ title, description, checked, onCheckedChange }: { title: string; description: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-3")}>
      <Badge variant="secondary" className="mb-3">Empty</Badge>
      <p>{text}</p>
    </div>
  );
}

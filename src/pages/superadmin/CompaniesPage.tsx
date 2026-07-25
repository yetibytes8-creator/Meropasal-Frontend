import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Company, CompanyPlan, CompanyStatus, BusinessType } from "./types";
import { BUSINESS_TYPE_LABELS } from "./types";
import { ApiRequestError, superAdmin, plans as plansApi, type ApiStaff } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Search, Building2, Phone, Mail, MapPin, Users, Calendar,
  Pencil, Trash2, Eye, Ban, CheckCircle2, X, Upload, ImageIcon,
  Banknote, Package, Coffee, LayoutGrid, Copy, KeyRound,
  ShieldAlert, Loader2, RefreshCw, CreditCard, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildBusinessSystemConfig,
  getBusinessProfile,
  profileModuleAccess,
  resolveBusinessProfile,
} from "@/lib/businessProfiles";

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusColor: Record<CompanyStatus, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial:     "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

const planLabel: Record<CompanyPlan, string> = {
  cafe: "Restaurant / Cafe",
  inventory: "Shop Inventory",
  combo: "Both Modules",
};

const planIcon: Record<CompanyPlan, React.ElementType> = {
  cafe: Coffee,
  inventory: Package,
  combo: LayoutGrid,
};

const planColor: Record<CompanyPlan, string> = {
  cafe: "text-red-700 bg-red-50 border border-red-100",
  inventory: "text-emerald-700 bg-emerald-50 border border-emerald-100",
  combo: "text-teal-700 bg-teal-50 border border-teal-100",
};

const PLAN_OPTIONS = [
  { value: "cafe",      label: "Restaurant / Cafe",  moduleAccess: "cafe" },
  { value: "inventory", label: "Shop Inventory",      moduleAccess: "inventory" },
  { value: "combo",     label: "Both Modules (Combo)", moduleAccess: "combo" },
];

const emptyForm = {
  name: "", businessType: "general_inventory" as BusinessType | "",
  contactPerson: "", email: "", phone: "",
  address: "", city: "", country: "Nepal",
  plan: "inventory" as CompanyPlan,
  planId: "",
  status: "trial" as CompanyStatus,
  maxUsers: "5", expiresAt: "", notes: "", logo: "",
};

const demoPlanOptions = [
  { id: 101, name: "Restaurant Starter", module_access: "cafe" },
  { id: 102, name: "Inventory Pro", module_access: "inventory" },
  { id: 103, name: "Combo Business Suite", module_access: "combo" },
];

const demoCompanies: Company[] = [
  {
    id: "demo-clothes",
    userId: 9901,
    name: "Himalayan Clothing Store",
    businessType: "clothing",
    contactPerson: "Preview Owner",
    email: "clothes@preview.local",
    phone: "9800000001",
    address: "New Road",
    city: "Kathmandu",
    country: "Nepal",
    plan: "inventory",
    planId: 102,
    planName: "Inventory Pro",
    subscriptionId: 9001,
    status: "active",
    createdAt: "2026-07-17",
    expiresAt: "2027-07-17",
    maxUsers: 8,
    activeUsers: 4,
    monthlyRevenue: 2500,
    notes: "Preview: size, color, SKU, branch stock and finance mapping enabled.",
  },
  {
    id: "demo-pharmacy",
    userId: 9902,
    name: "City Pharmacy",
    businessType: "pharmacy",
    contactPerson: "Preview Pharmacist",
    email: "pharmacy@preview.local",
    phone: "9800000002",
    address: "Lakeside",
    city: "Pokhara",
    country: "Nepal",
    plan: "inventory",
    planId: 102,
    planName: "Inventory Pro",
    subscriptionId: 9002,
    status: "trial",
    createdAt: "2026-07-18",
    expiresAt: "2026-08-18",
    maxUsers: 5,
    activeUsers: 2,
    monthlyRevenue: 1800,
    notes: "Preview: batch, expiry, supplier, tax and low-stock warnings enabled.",
  },
  {
    id: "demo-restaurant",
    userId: 9903,
    name: "Chiya Xpress",
    businessType: "restaurant",
    contactPerson: "Cafe Owner",
    email: "restaurant@test.com",
    phone: "9867077179",
    address: "Setopool",
    city: "Kathmandu",
    country: "Nepal",
    plan: "combo",
    planId: 103,
    planName: "Combo Business Suite",
    subscriptionId: 9003,
    status: "active",
    createdAt: "2026-07-01",
    expiresAt: "2027-07-01",
    maxUsers: 10,
    activeUsers: 6,
    monthlyRevenue: 3500,
    notes: "Preview: QR menu, kitchen, billing, purchase and finance enabled.",
  },
];

function generatePreviewPassword() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `Mero@${suffix}123`;
}

// Map frontend Company from API response
import type { SuperAdminClient } from "@/lib/api";

function apiClientToCompany(c: SuperAdminClient): Company {
  return {
    id: String(c.id),
    userId: c.user_id,
    name: c.business_name,
    businessType: (c.business_type as BusinessType) || "",
    contactPerson: c.contact_person,
    email: c.email,
    phone: c.phone || "",
    address: c.address || "",
    city: c.city || "",
    country: c.country || "Nepal",
    plan: (c.plan_module as CompanyPlan) || "cafe",
    planId: c.plan_id ?? undefined,
    planName: c.plan_name ?? undefined,
    subscriptionId: c.subscription_id ?? undefined,
    status: c.status,
    createdAt: c.created_at?.split("T")[0] ?? "",
    expiresAt: c.expires_at ?? "",
    maxUsers: c.max_users,
    activeUsers: c.active_users,
    monthlyRevenue: c.monthly_revenue,
    notes: c.internal_notes || "",
  };
}

// ── Credential Dialog ──────────────────────────────────────────────────────────

function CredentialsDialog({
  open, onClose, email, password, name,
}: { open: boolean; onClose: () => void; email: string; password: string; name: string }) {
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full border-emerald-100 bg-white text-slate-900 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-950">
            <KeyRound className="w-5 h-5 text-emerald-700" />
            Client Credentials Created
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                <strong>{name}</strong> has been created. Share these credentials with the client.
                The password won't be shown again — save it now.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs">Email / Login ID</Label>
              <div className="flex items-center gap-2">
                <Input value={email} readOnly className="border-slate-200 bg-slate-50 text-slate-900 font-mono text-sm" />
                <Button variant="outline" size="icon" className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => copy(email, "Email")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs">Password</Label>
              <div className="flex items-center gap-2">
                <Input value={password} readOnly className="border-slate-200 bg-slate-50 text-slate-900 font-mono text-sm tracking-widest" />
                <Button variant="outline" size="icon" className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => copy(password, "Password")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Copy both at once */}
          <Button
            variant="outline"
            className="w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-2"
            onClick={() => copy(`Email: ${email}\nPassword: ${password}`, "ID & Password")}
          >
            <Copy className="w-4 h-4" />
            Copy ID &amp; Password Together
          </Button>

          <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>
            Done — I've saved the credentials
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Record Payment Dialog ──────────────────────────────────────────────────────

function RecordPaymentDialog({
  open, onClose, company, onSaved,
}: { open: boolean; onClose: () => void; company: Company | null; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("cash");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!company?.userId || !amount) { toast.error("Amount is required"); return; }
    setSaving(true);
    try {
      await superAdmin.recordPayment(company.userId, {
        amount: parseFloat(amount),
        provider,
        currency: "NPR",
      });
      toast.success("Payment recorded — subscription activated");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full border-emerald-100 bg-white text-slate-900 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-950">
            <CreditCard className="w-5 h-5 text-emerald-700" />
            Record Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Recording payment for <span className="font-medium text-slate-950">{company?.name}</span></p>
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-xs">Amount (NPR)</Label>
            <Input type="number" placeholder="e.g. 4999" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-xs">Payment Method</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="border-slate-200 bg-white text-slate-900"><SelectValue /></SelectTrigger>
              <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="esewa">eSewa</SelectItem>
                <SelectItem value="khalti">Khalti</SelectItem>
                <SelectItem value="fonepay">FonePay</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Client Staff Tab ─────────────────────────────────────────────────────────────

type StaffFormState = {
  name: string; email: string; phone: string;
  role: ApiStaff["role"]; department: ApiStaff["department"];
  salary: string; status: ApiStaff["status"]; password: string;
};

const emptyStaffForm: StaffFormState = {
  name: "", email: "", phone: "",
  role: "staff", department: "both",
  salary: "", status: "active", password: "",
};

function ClientStaffTab({ clientId }: { clientId: number }) {
  const [staff, setStaff] = useState<ApiStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffFormState>(emptyStaffForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStaff(await superAdmin.listClientStaff(clientId));
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(emptyStaffForm); setDialogOpen(true); };
  const openEdit = (s: ApiStaff) => {
    setEditingId(s.id);
    setForm({ name: s.name, email: s.email, phone: s.phone, role: s.role, department: s.department, salary: String(s.salary), status: s.status, password: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.salary) { toast.error("Name, email, and salary are required"); return; }
    if (!editingId && !form.password) { toast.error("Password is required for new staff"); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        role: form.role, department: form.department,
        salary: parseFloat(form.salary), status: form.status,
        join_date: new Date().toISOString().split("T")[0],
        avatar: null as string | null,
        ...(form.password ? { password: form.password } : {}),
      };
      if (editingId) {
        const updated = await superAdmin.updateClientStaff(clientId, editingId, payload);
        setStaff((prev) => prev.map((s) => s.id === editingId ? updated : s));
        toast.success("Staff member updated");
      } else {
        const created = await superAdmin.createClientStaff(clientId, payload as Omit<ApiStaff, "id" | "created_at" | "has_login"> & { password?: string });
        setStaff((prev) => [created, ...prev]);
        toast.success("Staff member added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await superAdmin.deleteClientStaff(clientId, deleteId);
      setStaff((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success("Staff member removed");
    } catch {
      toast.error("Failed to remove staff member");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{staff.length} staff member{staff.length !== 1 ? "s" : ""}</p>
        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-8" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" />Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading staff…</span>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No staff added for this client yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-950 truncate">{s.name}</p>
                <p className="text-xs text-slate-500 truncate">{s.email} · {s.role} · {s.department}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => openEdit(s)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setDeleteId(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full border-emerald-100 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-950">{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs">Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as ApiStaff["role"] })}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="staff">Inventory Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v as ApiStaff["department"] })}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Salary (Rs.)</Label>
                <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ApiStaff["status"] })}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs">{editingId ? "New Password (leave blank to keep existing)" : "Password"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? "" : "Min. 6 characters"}
                className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Save Changes" : "Add Staff"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="border-emerald-100 bg-white text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-950">Remove staff member?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-700 hover:bg-slate-50 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-0">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [viewCompany, setViewCompany] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Credentials dialog after creation
  const [credsOpen, setCredsOpen] = useState(false);
  const [credsData, setCredsData] = useState<{ email: string; password: string; name: string } | null>(null);

  // Payment dialogs
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCompany, setPaymentCompany] = useState<Company | null>(null);
  const [viewPayments, setViewPayments] = useState<{ id: number; provider: string; amount: number; currency: string; status: string; paid_at: string | null; created_at: string }[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [planOptions, setPlanOptions] = useState<{ id: number; name: string; module_access: string }[]>([]);

  const logoRef = useRef<HTMLInputElement>(null);

  // ── Load from API ────────────────────────────────────────────────────────────

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const [clients, plansRes] = await Promise.all([
        superAdmin.listClients(),
        plansApi.adminList(),
      ]);
      setCompanies(clients.map(apiClientToCompany));
      setPlanOptions(plansRes.map(p => ({ id: p.id, name: p.name, module_access: p.module_access })));
      setApiAvailable(true);
    } catch (err) {
      if (err instanceof ApiRequestError && !err.isBackendUnavailable) {
        setApiAvailable(false);
        setCompanies([]);
        setPlanOptions([]);
        toast.error(err.status === 403 ? "Super admin access required for companies." : err.message);
        return;
      }
      setApiAvailable(false);
      setCompanies(demoCompanies);
      setPlanOptions(demoPlanOptions);
      toast.info("Preview mode enabled. Demo companies are shown until the backend/API is connected.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  // ── Derived state ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return companies.filter((c) => {
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || c.status === filterStatus;
      const matchPlan = filterPlan === "all" || c.plan === filterPlan;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [companies, search, filterStatus, filterPlan]);

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.status === "active").length,
    trial: companies.filter((c) => c.status === "trial").length,
    mrr: companies.filter((c) => c.status === "active").reduce((s, c) => s + c.monthlyRevenue, 0),
  };

  // Expiring within 14 days
  const expiringWarnings = companies.filter((c) => {
    const days = Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 14 && (c.status === "trial" || c.status === "active");
  });

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const findPlanIdForModule = (moduleAccess: CompanyPlan) => {
    const match = planOptions.find((plan) => plan.module_access === moduleAccess);
    return match ? String(match.id) : "";
  };

  const selectedBusinessProfile = getBusinessProfile(resolveBusinessProfile(form.businessType || "general_inventory"));

  const applyBusinessType = (businessType: BusinessType) => {
    const moduleAccess = profileModuleAccess(businessType);
    setForm((current) => ({
      ...current,
      businessType,
      plan: moduleAccess,
      planId: findPlanIdForModule(moduleAccess),
    }));
  };

  const openAdd = () => {
    setEditCompany(null);
    const moduleAccess = profileModuleAccess(emptyForm.businessType);
    setForm({
      ...emptyForm,
      plan: moduleAccess,
      planId: findPlanIdForModule(moduleAccess),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    });
    setAddOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditCompany(c);
    setForm({
      name: c.name, businessType: c.businessType,
      contactPerson: c.contactPerson, email: c.email, phone: c.phone,
      address: c.address, city: c.city, country: c.country,
      plan: c.plan, planId: String(c.planId ?? ""),
      status: c.status,
      maxUsers: String(c.maxUsers), expiresAt: c.expiresAt,
      notes: c.notes, logo: "",
    });
    setAddOpen(true);
    setViewCompany(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    if (!form.email.trim()) { toast.error("Contact email is required"); return; }
    if (!form.contactPerson.trim()) { toast.error("Contact person is required"); return; }
    if (!form.expiresAt) { toast.error("Expiry date is required"); return; }

    setSaving(true);

    if (apiAvailable) {
      try {
        const businessType = form.businessType || "general_inventory";
        const systemConfig = buildBusinessSystemConfig(businessType);

        // Determine plan_id: prefer selected planId, else find from module_access
        let planId = parseInt(form.planId);
        if (!planId) {
          const match = planOptions.find(p => p.module_access === form.plan);
          planId = match?.id ?? 0;
        }

        if (editCompany?.userId) {
          // Update
          const updated = await superAdmin.updateClient(editCompany.userId, {
            business_name: form.name,
            business_type: businessType,
            contact_person: form.contactPerson,
            phone: form.phone,
            address: form.address,
            city: form.city,
            country: form.country,
            plan_id: planId || undefined,
            status: form.status,
            max_users: parseInt(form.maxUsers) || 5,
            expires_at: form.expiresAt,
            internal_notes: form.notes,
            finance_enabled: systemConfig.features.finance !== false,
            system_config: systemConfig,
          });
          setCompanies((prev) => prev.map((c) => c.userId === editCompany.userId ? apiClientToCompany(updated) : c));
          toast.success(`${form.name} updated`);
        } else {
          // Create
          const result = await superAdmin.createClient({
            business_name: form.name,
            business_type: businessType,
            contact_person: form.contactPerson,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            country: form.country,
            plan_id: planId,
            status: form.status,
            max_users: parseInt(form.maxUsers) || 5,
            expires_at: form.expiresAt,
            internal_notes: form.notes,
            finance_enabled: systemConfig.features.finance !== false,
            system_config: systemConfig,
          });
          setCompanies((prev) => [apiClientToCompany(result.client), ...prev]);
          setCredsData({ email: result.client.email, password: result.generated_password, name: form.name });
          setCredsOpen(true);
          toast.success(`${form.name} added`);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
        setSaving(false);
        return;
      }
    } else {
      const businessType = form.businessType || "general_inventory";
      const localPlanId = parseInt(form.planId) || demoPlanOptions.find((plan) => plan.module_access === form.plan)?.id;
      const localCompany: Company = {
        id: editCompany?.id ?? `local-${Date.now()}`,
        userId: editCompany?.userId ?? Date.now(),
        name: form.name,
        businessType,
        contactPerson: form.contactPerson,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        plan: form.plan,
        planId: localPlanId,
        planName: demoPlanOptions.find((plan) => plan.id === localPlanId)?.name ?? planLabel[form.plan],
        subscriptionId: editCompany?.subscriptionId,
        status: form.status,
        createdAt: editCompany?.createdAt ?? new Date().toISOString().split("T")[0],
        expiresAt: form.expiresAt,
        maxUsers: parseInt(form.maxUsers) || 5,
        activeUsers: editCompany?.activeUsers ?? 1,
        monthlyRevenue: form.status === "active" ? (form.plan === "combo" ? 3500 : form.plan === "inventory" ? 2500 : 1800) : 0,
        notes: form.notes || `${BUSINESS_TYPE_LABELS[businessType]} preview setup with role access and system config.`,
      };
      setCompanies((prev) =>
        editCompany
          ? prev.map((company) => (company.id === editCompany.id ? localCompany : company))
          : [localCompany, ...prev]
      );
      if (!editCompany) {
        setCredsData({ email: form.email, password: generatePreviewPassword(), name: form.name });
        setCredsOpen(true);
      }
      toast.success(`${form.name} ${editCompany ? "updated" : "added"} in preview mode`);
    }

    setSaving(false);
    setAddOpen(false);
    setEditCompany(null);
  };

  const toggleStatus = async (id: string, newStatus: CompanyStatus) => {
    const c = companies.find((x) => x.id === id)!;
    if (!apiAvailable || !c.userId) {
      setCompanies((prev) => prev.map((x) => x.id === id ? { ...x, status: newStatus } : x));
      toast.success(`${c.name} is now ${newStatus} in preview mode`);
      if (viewCompany?.id === id) setViewCompany((v) => v ? { ...v, status: newStatus } : v);
      return;
    }
    try {
      const updated = await superAdmin.updateClient(c.userId, { status: newStatus });
      setCompanies((prev) => prev.map((x) => x.id === id ? apiClientToCompany(updated) : x));
    } catch {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`${c.name} is now ${newStatus}`);
    if (viewCompany?.id === id) setViewCompany((v) => v ? { ...v, status: newStatus } : v);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const c = companies.find((x) => x.id === deleteId)!;
    if (!apiAvailable || !c.userId) {
      setCompanies((prev) => prev.filter((x) => x.id !== deleteId));
      toast.success(`${c.name} removed from preview mode`);
      setDeleteId(null);
      if (viewCompany?.id === deleteId) setViewCompany(null);
      return;
    }
    try {
      await superAdmin.deleteClient(c.userId);
    } catch {
      toast.error("Failed to delete client");
      setDeleteId(null);
      return;
    }
    setCompanies((prev) => prev.filter((x) => x.id !== deleteId));
    toast.success(`${c.name} removed`);
    setDeleteId(null);
    if (viewCompany?.id === deleteId) setViewCompany(null);
  };

  const openPaymentHistory = async (c: Company) => {
    setPaymentCompany(c);
    setViewPayments([]);
    if (c.userId) {
      setLoadingPayments(true);
      try {
        const payments = await superAdmin.getClientPayments(c.userId);
        setViewPayments(payments as typeof viewPayments);
      } catch {
        // ignore
      } finally {
        setLoadingPayments(false);
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-950">Companies</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Manage all organisations using Mero Pasal
            {apiAvailable && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Live</span>}
            {!apiAvailable && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">Preview mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-9 w-9"
            onClick={loadClients} title="Refresh">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={openAdd} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 shrink-0 shadow-sm" size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Company</span>
          </Button>
        </div>
      </div>

      {/* Expiry warning banner */}
      {expiringWarnings.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-300">
                {expiringWarnings.length} client{expiringWarnings.length > 1 ? "s" : ""} expiring within 14 days
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {expiringWarnings.map((c) => {
                  const days = Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000);
                  return (
                    <button key={c.id} onClick={() => setViewCompany(c)}
                      className="text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 hover:bg-red-500/20 transition-colors">
                      {c.name} — {days}d left
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-emerald-950" },
          { label: "Active", value: stats.active, color: "text-emerald-700" },
          { label: "Trial", value: stats.trial, color: "text-green-700" },
          { label: "MRR", value: `Rs. ${stats.mrr.toLocaleString()}`, color: "text-red-700" },
        ].map((s) => (
          <Card key={s.label} className="border-emerald-100 bg-white shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className={`text-lg sm:text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by name, email, city…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-emerald-100 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600" />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 sm:w-36 sm:flex-none border-emerald-100 bg-white text-slate-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="flex-1 sm:w-36 sm:flex-none border-emerald-100 bg-white text-slate-800">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="cafe">Cafe</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="combo">Combo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading clients…</span>
        </div>
      )}

      {/* Mobile cards */}
      {!loading && (
        <div className="md:hidden space-y-3">
          {filtered.map((c) => {
            const PlanIcon = planIcon[c.plan];
            const btLabel = c.businessType ? BUSINESS_TYPE_LABELS[c.businessType as BusinessType] : null;
            return (
              <Card key={c.id} className="border-emerald-100 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {c.contactPerson}{btLabel ? ` · ${btLabel}` : ""} · {c.city}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 border capitalize ${statusColor[c.status]}`}>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${planColor[c.plan]}`}>
                          <PlanIcon className="w-3 h-3" />{c.plan}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />{c.activeUsers}/{c.maxUsers}
                        </span>
                        <span className="text-xs text-slate-500">Exp: {c.expiresAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setViewCompany(c)}>
                      <Eye className="w-3.5 h-3.5" />View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />Edit
                    </Button>
                    {c.status === "active" && (
                      <Button size="sm" variant="outline" className="h-8 text-xs border-red-800/50 text-red-400 hover:bg-red-500/10" onClick={() => toggleStatus(c.id, "suspended")}>
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {c.status === "suspended" && (
                      <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-800/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => toggleStatus(c.id, "active")}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 text-xs border-red-900/50 text-red-400 hover:bg-red-500/10" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-16 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No companies found</p>
            </div>
          )}
        </div>
      )}

      {/* Desktop table */}
      {!loading && (
        <div className="hidden md:block rounded-xl border border-emerald-100 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-emerald-100 hover:bg-transparent">
                <TableHead className="text-slate-600">Company</TableHead>
                <TableHead className="text-slate-600">Type</TableHead>
                <TableHead className="text-slate-600">Contact</TableHead>
                <TableHead className="text-slate-600">Plan</TableHead>
                <TableHead className="text-slate-600">Status</TableHead>
                <TableHead className="text-slate-600 text-right">Users</TableHead>
                <TableHead className="text-slate-600 text-right">MRR</TableHead>
                <TableHead className="text-slate-600">Expires</TableHead>
                <TableHead className="text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500 py-12">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No companies found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const PlanIcon = planIcon[c.plan];
                  const btLabel = c.businessType ? BUSINESS_TYPE_LABELS[c.businessType as BusinessType] : "—";
                  const daysLeft = c.expiresAt
                    ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000)
                    : null;
                  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
                  return (
                    <TableRow key={c.id} className="border-slate-100 hover:bg-emerald-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-950 text-sm truncate max-w-[150px]">{c.name}</p>
                            <p className="text-xs text-slate-500 truncate">{c.city}, {c.country}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Store className="w-3 h-3" />{btLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-800">{c.contactPerson}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">{c.email}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md w-fit ${planColor[c.plan]}`}>
                          <PlanIcon className="w-3 h-3" />{c.plan}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize border ${statusColor[c.status]}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-700">
                        {c.activeUsers}<span className="text-slate-600">/{c.maxUsers}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-700">
                        {c.monthlyRevenue > 0 ? `Rs. ${c.monthlyRevenue.toLocaleString()}` : <span className="text-slate-600">—</span>}
                      </TableCell>
                      <TableCell className={cn("text-sm", expiringSoon ? "text-red-400 font-medium" : "text-slate-400")}>
                        {c.expiresAt || "—"}
                        {expiringSoon && <span className="ml-1 text-xs">({daysLeft}d)</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => setViewCompany(c)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {c.status === "active" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Suspend" onClick={() => toggleStatus(c.id, "suspended")}>
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {c.status === "suspended" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" title="Reactivate" onClick={() => toggleStatus(c.id, "active")}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10" title="Record Payment" onClick={() => { setPaymentCompany(c); setPaymentOpen(true); }}>
                            <Banknote className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditCompany(null); } }}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden border-emerald-100 bg-white p-0 text-slate-900 shadow-2xl sm:w-full">
          <DialogHeader className="sticky top-0 z-10 border-b border-emerald-100 bg-white/95 px-5 py-4 backdrop-blur">
            <DialogTitle className="flex items-center gap-2 text-emerald-950">
              <Building2 className="w-5 h-5 text-emerald-700" />
              {editCompany ? "Edit Company" : "Add New Company"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 overflow-y-auto px-5 py-4 pb-28">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-slate-700 text-sm">Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo ? <img src={form.logo} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-emerald-700/50" />}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={logoRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
                  <Button type="button" variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2" onClick={() => logoRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" />Upload Logo
                  </Button>
                  {form.logo && (
                    <Button type="button" variant="ghost" size="sm" className="text-slate-500 hover:bg-red-50 hover:text-red-700 gap-1.5 h-7" onClick={() => setForm((f) => ({ ...f, logo: "" }))}>
                      <X className="w-3 h-3" />Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            {/* Company name */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-400" />Company Name <span className="text-red-600">*</span>
              </Label>
              <Input placeholder="e.g. Himalayan Cafe Pvt. Ltd." value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600" />
            </div>

            {/* Business Type */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                <Store className="w-3 h-3 text-slate-400" />Business Type
              </Label>
              <Select value={form.businessType || "general_inventory"} onValueChange={(v) => applyBusinessType(v as BusinessType)}>
                <SelectTrigger className="border-slate-200 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto border-emerald-100 bg-white text-slate-900 shadow-xl">
                  {Object.entries(BUSINESS_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-emerald-200 bg-white text-emerald-700">
                    {selectedBusinessProfile.moduleLabel}
                  </Badge>
                  <Badge className="border-red-200 bg-white text-red-700">
                    {selectedBusinessProfile.salesLabel}
                  </Badge>
                  <Badge className="border-green-200 bg-white text-green-700">
                    {selectedBusinessProfile.purchaseLabel}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{selectedBusinessProfile.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedBusinessProfile.keyFields.slice(0, 6).map((field) => (
                    <span key={field} className="rounded-full border border-emerald-100 bg-white px-2 py-0.5 text-[11px] text-slate-700">
                      {field}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-emerald-100 bg-white p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Setup</p>
                    <p className="mt-1 text-xs text-slate-600">{selectedBusinessProfile.setupChecklist[0] || "Module setup"}</p>
                  </div>
                  <div className="rounded-md border border-green-100 bg-white p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">Categories</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {(selectedBusinessProfile.defaultCategories || [selectedBusinessProfile.productLabel]).slice(0, 3).join(", ")}
                    </p>
                  </div>
                  <div className="rounded-md border border-red-100 bg-white p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Finance</p>
                    <p className="mt-1 text-xs text-slate-600">{selectedBusinessProfile.financeMapping?.[0] || "Sales / purchase auto mapping"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact + email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-slate-400" />Contact Person <span className="text-red-600">*</span>
                </Label>
                <Input placeholder="Full name" value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400" />Login Email <span className="text-red-600">*</span>
                </Label>
                <Input type="email" placeholder="client@business.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!!editCompany}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600 disabled:opacity-60" />
              </div>
            </div>

            {/* Phone + city */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" />Phone
                </Label>
                <Input placeholder="+977-98XXXXXXXX" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400" />City
                </Label>
                <Input placeholder="Kathmandu" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600" />
              </div>
            </div>

            {/* Address + country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400" />Address
                </Label>
                <Input placeholder="Street, Area" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">Country</Label>
                <Input placeholder="Nepal" value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600" />
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            {/* Plan + Status + Users + Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-slate-400" />Module Plan <span className="text-red-600">*</span>
                </Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as CompanyPlan })}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
                    <SelectItem value="cafe">Restaurant / Cafe</SelectItem>
                    <SelectItem value="inventory">Shop Inventory</SelectItem>
                    <SelectItem value="combo">Both Modules (Combo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CompanyStatus })}>
                  <SelectTrigger className="border-slate-200 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-emerald-100 bg-white text-slate-900 shadow-xl">
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-slate-400" />Max Users
                </Label>
                <Input type="number" inputMode="numeric" min={1} max={500} value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />Subscription Expires <span className="text-red-600">*</span>
                </Label>
                <Input type="date" value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="border-slate-200 bg-white text-slate-900 focus-visible:ring-emerald-600" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs font-medium">Internal Notes</Label>
              <Textarea placeholder="Any internal notes about this company…" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2} className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600 resize-none" />
            </div>

            {/* Submit */}
            <div className="-mx-5 flex flex-col-reverse gap-3 border-t border-emerald-100 bg-white px-5 py-4 sm:flex-row">
              <Button variant="outline" onClick={() => { setAddOpen(false); setEditCompany(null); }}
                className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 gap-2">
                <X className="w-4 h-4" />Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}
                className="w-full sm:flex-1 bg-emerald-700 hover:bg-emerald-800 text-white gap-2 shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editCompany ? "Save Changes" : "Add Company"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Company Detail Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!viewCompany} onOpenChange={(o) => !o && setViewCompany(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full max-h-[90vh] overflow-y-auto border-emerald-100 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-950">Company Details</DialogTitle>
          </DialogHeader>
          {viewCompany && (
            <Tabs defaultValue="info">
              <TabsList className="w-full bg-emerald-50 mb-4">
                <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-emerald-700 data-[state=active]:text-white">Info</TabsTrigger>
                <TabsTrigger value="payments" className="flex-1 data-[state=active]:bg-emerald-700 data-[state=active]:text-white" onClick={() => openPaymentHistory(viewCompany)}>Payments</TabsTrigger>
                <TabsTrigger value="staff" className="flex-1 data-[state=active]:bg-emerald-700 data-[state=active]:text-white">Staff</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-950">{viewCompany.name}</h3>
                    {viewCompany.businessType && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        {BUSINESS_TYPE_LABELS[viewCompany.businessType as BusinessType]}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <Badge variant="outline" className={`text-xs capitalize border ${statusColor[viewCompany.status]}`}>
                        {viewCompany.status}
                      </Badge>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${planColor[viewCompany.plan]}`}>
                        {(() => { const PlanIcon = planIcon[viewCompany.plan]; return <PlanIcon className="w-3 h-3" />; })()}
                        {planLabel[viewCompany.plan]}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-emerald-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {[
                    { icon: Users, label: "Contact", value: viewCompany.contactPerson },
                    { icon: Mail, label: "Email", value: viewCompany.email, breakAll: true },
                    { icon: Phone, label: "Phone", value: viewCompany.phone || "—" },
                    { icon: MapPin, label: "Location", value: `${viewCompany.city}, ${viewCompany.country}` },
                    { icon: Calendar, label: "Created", value: viewCompany.createdAt },
                    { icon: Calendar, label: "Expires", value: viewCompany.expiresAt || "—" },
                  ].map(({ icon: Icon, label, value, breakAll }) => (
                    <div key={label}>
                      <p className="text-slate-500 text-xs flex items-center gap-1.5 mb-0.5">
                        <Icon className="w-3 h-3" />{label}
                      </p>
                      <p className={`font-medium text-slate-950 ${breakAll ? "break-all" : "truncate"}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <Separator className="bg-emerald-100" />

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-xs text-slate-500">Users</p>
                    <p className="text-lg font-bold text-slate-950 mt-0.5">{viewCompany.activeUsers}<span className="text-slate-500 text-sm">/{viewCompany.maxUsers}</span></p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-white p-3 text-center shadow-sm">
                    <p className="text-xs text-slate-500">MRR</p>
                    <p className="text-sm font-bold text-green-400 mt-0.5">{viewCompany.monthlyRevenue > 0 ? `Rs. ${viewCompany.monthlyRevenue.toLocaleString()}` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                    <p className="text-xs text-slate-500">Days Left</p>
                    <p className="text-lg font-bold text-slate-950 mt-0.5">
                      {viewCompany.expiresAt ? Math.max(0, Math.ceil((new Date(viewCompany.expiresAt).getTime() - Date.now()) / 86400000)) : "—"}
                    </p>
                  </div>
                </div>

                {viewCompany.notes && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs text-slate-500 mb-1">Internal Notes</p>
                    <p className="text-sm text-slate-700">{viewCompany.notes}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 gap-2" onClick={() => openEdit(viewCompany)}>
                    <Pencil className="w-4 h-4" />Edit
                  </Button>
                  <Button variant="outline" className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2"
                    onClick={() => { setPaymentCompany(viewCompany); setPaymentOpen(true); }}>
                    <Banknote className="w-4 h-4" />Record Payment
                  </Button>
                  {viewCompany.status === "active" && (
                    <Button variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50 gap-2" onClick={() => toggleStatus(viewCompany.id, "suspended")}>
                      <Ban className="w-4 h-4" />Suspend
                    </Button>
                  )}
                  {viewCompany.status === "suspended" && (
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white gap-2" onClick={() => toggleStatus(viewCompany.id, "active")}>
                      <CheckCircle2 className="w-4 h-4" />Reactivate
                    </Button>
                  )}
                  {viewCompany.status === "trial" && (
                    <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white gap-2" onClick={() => toggleStatus(viewCompany.id, "active")}>
                      <CheckCircle2 className="w-4 h-4" />Activate
                    </Button>
                  )}
                  <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 gap-2 sm:w-auto"
                    onClick={() => { setDeleteId(viewCompany.id); setViewCompany(null); }}>
                    <Trash2 className="w-4 h-4" />
                    <span className="sm:hidden">Delete</span>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-3">
                {loadingPayments ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading payments…</span>
                  </div>
                ) : viewPayments.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No payment records found</p>
                    <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-500 text-white gap-2"
                      onClick={() => { setPaymentCompany(viewCompany); setPaymentOpen(true); }}>
                      <Banknote className="w-3.5 h-3.5" />Record First Payment
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {viewPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
                          <div>
                            <p className="text-sm font-medium text-slate-950 capitalize">{p.provider}</p>
                            <p className="text-xs text-slate-500">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-400">Rs. {Number(p.amount).toLocaleString()}</p>
                            <Badge variant="outline" className={`text-[10px] border ${p.status === "paid" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                              {p.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-500 text-white gap-2"
                      onClick={() => { setPaymentCompany(viewCompany); setPaymentOpen(true); }}>
                      <Banknote className="w-3.5 h-3.5" />Record New Payment
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="staff">
                {viewCompany.userId && <ClientStaffTab clientId={viewCompany.userId} />}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md border-emerald-100 bg-white text-slate-900 sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-950">Remove company?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This will permanently delete <strong className="text-slate-950">{companies.find((c) => c.id === deleteId)?.name}</strong> and all their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white border-0">
              Delete Company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Credentials Dialog ──────────────────────────────────────────────── */}
      {credsData && (
        <CredentialsDialog
          open={credsOpen}
          onClose={() => { setCredsOpen(false); setCredsData(null); }}
          email={credsData.email}
          password={credsData.password}
          name={credsData.name}
        />
      )}

      {/* ── Record Payment Dialog ─────────────────────────────────────────── */}
      <RecordPaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        company={paymentCompany}
        onSaved={loadClients}
      />
    </div>
  );
}


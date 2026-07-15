import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { superAdmin, plans as plansApi, type ApiPlan } from "@/lib/api";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, User,
  KeyRound, Copy, ShieldAlert, CheckCircle2, RefreshCw,
} from "lucide-react";

function CredentialsDialog({ open, onClose, email, password, name }: {
  open: boolean; onClose: () => void; email: string; password: string; name: string;
}) {
  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <KeyRound className="w-5 h-5 text-emerald-400" />Client Credentials Created
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-300 leading-relaxed">
                <strong>{name}</strong> has been created. Share these credentials with the client.
                The password will not be shown again.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Email / Login ID</Label>
              <div className="flex items-center gap-2">
                <Input value={email} readOnly className="bg-slate-800 border-slate-700 text-white font-mono text-sm" />
                <Button variant="outline" size="icon" className="shrink-0 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => copy(email, "Email")}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Password</Label>
              <div className="flex items-center gap-2">
                <Input value={password} readOnly className="bg-slate-800 border-slate-700 text-white font-mono text-sm tracking-widest" />
                <Button variant="outline" size="icon" className="shrink-0 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => copy(password, "Password")}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white gap-2" onClick={() => copy(`Email: ${email}\nPassword: ${password}`, "ID & Password")}>
            <Copy className="w-4 h-4" />Copy ID &amp; Password Together
          </Button>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>Done — I've saved the credentials</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SuperAdminAddUser() {
  const navigate = useNavigate();
  const [availablePlans, setAvailablePlans] = useState<ApiPlan[]>([]);
  const [form, setForm] = useState({
    business_name: "", contact_person: "", email: "", phone: "",
    address: "", city: "", country: "Nepal",
    business_type: "", plan_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; name: string } | null>(null);

  useEffect(() => {
    plansApi.adminList()
      .then((ps) => setAvailablePlans(ps.filter((p) => p.type === "paid")))
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name.trim()) { toast.error("Business name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (!form.plan_id) { toast.error("Please select a plan"); return; }
    setSaving(true);
    try {
      const { client, generated_password } = await superAdmin.createClient({
        business_name: form.business_name.trim(),
        contact_person: form.contact_person.trim() || undefined,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country,
        business_type: form.business_type || undefined,
        plan_id: Number(form.plan_id),
        status: "trial",
      });
      setCreds({ email: client.email, password: generated_password, name: client.business_name });
    } catch (err) {
      toast.error((err as Error).message || "Failed to create client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin/users")} className="text-slate-400 hover:text-white hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Client Account</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create a new client company on Mero Pasal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Business Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="e.g. Himalaya Cafe" className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Contact Person</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} placeholder="Owner name" className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Email (Login ID) *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="owner@business.com" className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+977-98XXXXXXXX" className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Kathmandu" className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Business Type</Label>
                <Select value={form.business_type} onValueChange={(v) => set("business_type", v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white focus:ring-indigo-500">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {["cafe", "restaurant", "bakery", "bar", "retail", "grocery", "pharmacy", "electronics", "clothing", "other"].map((t) => (
                      <SelectItem key={t} value={t} className="text-slate-300 capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />Subscription Plan *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={form.plan_id} onValueChange={(v) => set("plan_id", v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white focus:ring-indigo-500">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {availablePlans.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-slate-300">
                    {p.name} — Rs. {Number(p.price).toLocaleString()}/{p.billing_cycle ?? "mo"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-2">A temporary password will be shown after creation.</p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/super-admin/users")} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Create Client &amp; Prepare Credentials
          </Button>
        </div>
      </form>

      {creds && (
        <CredentialsDialog
          open={true}
          onClose={() => { setCreds(null); navigate("/super-admin/users"); }}
          email={creds.email}
          password={creds.password}
          name={creds.name}
        />
      )}
    </div>
  );
}

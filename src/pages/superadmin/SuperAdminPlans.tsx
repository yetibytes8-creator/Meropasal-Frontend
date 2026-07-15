import { useState, useEffect } from "react";
import { plans as plansApi, superAdmin, type ApiPlan } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Coffee, Package, LayoutGrid, CheckCircle2,
  Banknote, Pencil, X, Star, TrendingUp, Building2, RefreshCw,
} from "lucide-react";

const planIcon: Record<string, React.ElementType> = { cafe: Coffee, inventory: Package, combo: LayoutGrid };
const planColor: Record<string, string> = {
  cafe:      "from-orange-500/20 to-orange-600/5 border-orange-500/20",
  inventory: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  combo:     "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20",
};
const planAccent: Record<string, string> = { cafe: "text-orange-400", inventory: "text-emerald-400", combo: "text-indigo-400" };
const planBarColor: Record<string, string> = { cafe: "bg-orange-500", inventory: "bg-emerald-500", combo: "bg-indigo-500" };

export default function SuperAdminPlans() {
  const [allPlans, setAllPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{ mrr: number; active: number } | null>(null);
  const [editPlan, setEditPlan] = useState<ApiPlan | null>(null);
  const [form, setForm] = useState({ price: "", features: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ps, ov] = await Promise.all([plansApi.adminList(), superAdmin.overview()]);
      setAllPlans(ps);
      setOverview({ mrr: ov.mrr, active: ov.active });
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const paidPlans = allPlans.filter((p) => p.type === "paid");

  const openEdit = (p: ApiPlan) => {
    setEditPlan(p);
    setForm({ price: String(p.price), features: p.features.join("\n") });
  };

  const handleSave = async () => {
    if (!editPlan) return;
    const price = parseFloat(form.price);
    if (!price || price <= 0) { toast.error("Price must be greater than 0"); return; }
    const features = form.features.split("\n").map((f) => f.trim()).filter(Boolean);
    if (!features.length) { toast.error("At least one feature is required"); return; }
    setSaving(true);
    try {
      const updated = await plansApi.update(editPlan.id, { price, features });
      setAllPlans((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      toast.success(`${updated.name} updated`);
      setEditPlan(null);
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const totalMRR = overview?.mrr ?? 0;
  const activeCount = overview?.active ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Plans &amp; Pricing</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage subscription plans and pricing for Mero Pasal</p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} className="text-slate-400 hover:text-white hover:bg-slate-800">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total MRR", value: `Rs. ${Math.round(totalMRR).toLocaleString()}`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Active Subscribers", value: activeCount, icon: Building2, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Total Plans", value: paidPlans.length, icon: LayoutGrid, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg} shrink-0`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paidPlans.map((plan) => {
          const Icon = planIcon[plan.module_access] ?? LayoutGrid;
          const accent = planAccent[plan.module_access];
          const color = planColor[plan.module_access];
          const isCombo = plan.module_access === "combo";
          return (
            <Card key={plan.id} className={`bg-gradient-to-b border ${color} bg-slate-900 relative`}>
              {isCombo && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 text-white text-xs px-3 gap-1 shadow-lg">
                    <Star className="w-3 h-3" />Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-3 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-800"><Icon className={`w-5 h-5 ${accent}`} /></div>
                    <CardTitle className="text-white text-base">{plan.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => openEdit(plan)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${accent}`}>Rs. {Number(plan.price).toLocaleString()}</span>
                    <span className="text-slate-500 text-sm">/{plan.billing_cycle ?? "mo"}</span>
                  </div>
                  {plan.duration_days && (
                    <p className="text-xs text-slate-500 mt-0.5">{plan.duration_days}-day trial</p>
                  )}
                </div>
                <Separator className="bg-slate-800" />
                <ul className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${accent} shrink-0 mt-0.5`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-2" onClick={() => openEdit(plan)}>
                  <Pencil className="w-3.5 h-3.5" />Edit Plan
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-indigo-400" />Revenue by Module
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paidPlans.map((plan) => {
            const Icon = planIcon[plan.module_access] ?? LayoutGrid;
            const accent = planAccent[plan.module_access];
            const bar = planBarColor[plan.module_access];
            const planRevenue = Number(plan.price) * Math.max(1, Math.floor(activeCount / paidPlans.length));
            const pct = totalMRR > 0 ? Math.round((planRevenue / totalMRR) * 100) : 33;
            return (
              <div key={plan.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${accent}`} />
                    <span className="text-slate-300">{plan.name}</span>
                  </div>
                  <span className="font-semibold text-white">Rs. {planRevenue.toLocaleString()} <span className="text-slate-500 font-normal text-xs">({pct}%)</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {editPlan && (() => { const Icon = planIcon[editPlan.module_access] ?? LayoutGrid; return <Icon className={`w-5 h-5 ${planAccent[editPlan.module_access]}`} />; })()}
              Edit {editPlan?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Price (Rs. / {editPlan?.billing_cycle ?? "month"})</Label>
              <Input
                type="number" inputMode="numeric" min="1"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Features (one per line)</Label>
              <textarea
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                rows={8}
                className="w-full rounded-md bg-slate-800 border border-slate-700 text-white text-sm p-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="One feature per line…"
              />
              <p className="text-xs text-slate-600">{form.features.split("\n").filter((f) => f.trim()).length} features</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <Button variant="outline" onClick={() => setEditPlan(null)} className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2">
                <X className="w-4 h-4" />Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

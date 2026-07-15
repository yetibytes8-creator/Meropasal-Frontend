import { useEffect, useState } from "react";
import { plans as plansApi, type ApiPlan } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, CheckCircle } from "lucide-react";

const emptyForm = {
  name: "", type: "paid", module_access: "cafe" as ApiPlan["module_access"],
  price: 0, billing_cycle: "monthly", duration_days: "", features: "",
};

export default function AdminPlans() {
  const [planList, setPlanList] = useState<ApiPlan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () =>
    plansApi.adminList().then(setPlanList).catch(() => toast.error("Failed to load plans"));

  useEffect(() => { load(); }, []);

  const toggleActive = async (p: ApiPlan) => {
    try {
      await plansApi.update(p.id, { is_active: !p.is_active });
      toast.success("Plan updated");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const createPlan = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    const features = form.features.split("\n").map((f) => f.trim()).filter(Boolean);
    try {
      await plansApi.create({
        name: form.name.trim(),
        type: form.type as ApiPlan["type"],
        module_access: form.module_access,
        price: Number(form.price),
        billing_cycle: form.type === "paid" ? form.billing_cycle : null,
        duration_days: form.duration_days ? Number(form.duration_days) : null,
        features,
        is_active: true,
      });
      toast.success("Plan created");
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Plans</h1>
          <p className="text-muted-foreground">Manage subscription plans</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1.5">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Plan</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
            <DialogHeader><DialogTitle>Create Plan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Module</Label>
                  <Select value={form.module_access} onValueChange={(v) => setForm({ ...form, module_access: v as ApiPlan["module_access"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cafe">Cafe</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="combo">Combo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (Rs.)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div><Label>Trial days</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <textarea className="w-full border rounded-md p-2 text-sm bg-background" rows={4} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createPlan} className="w-full sm:w-auto gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />Create Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {planList.map((p) => (
          <Card key={p.id} className={p.is_active ? "" : "opacity-60"}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{p.module_access}</Badge>
                    <Badge variant={p.type === "trial" ? "secondary" : "default"}>{p.type}</Badge>
                  </div>
                </div>
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">Rs. {Number(p.price).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/{p.billing_cycle || "trial"}</span></div>
              {p.duration_days && <p className="text-xs text-muted-foreground">{p.duration_days} day trial</p>}
              <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                {p.features.map((f, i) => <li key={i}>• {f}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { ElementType } from "react";
import StatCard from "@/components/StatCard";
import { restaurantServices as servicesApi, type ApiRestaurantService } from "@/lib/api";
import { useList } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Bike,
  CalendarCheck,
  ChefHat,
  Gift,
  Plus,
  Save,
  Search,
  Store,
  Trash2,
  Truck,
  Utensils,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

type ServiceType = ApiRestaurantService["service_type"];
type ServiceMeta = { label: string; icon: ElementType; tone: string };

const serviceMeta: Record<ServiceType, ServiceMeta> = {
  dine_in: { label: "Dine In", icon: Utensils, tone: "bg-primary/10 text-primary border-primary/20" },
  delivery: { label: "Delivery", icon: Bike, tone: "bg-info/10 text-info border-info/20" },
  takeaway: { label: "Takeaway", icon: Store, tone: "bg-success/10 text-success border-success/20" },
  reservation: { label: "Reservation", icon: CalendarCheck, tone: "bg-warning/10 text-warning border-warning/20" },
  catering: { label: "Catering", icon: ChefHat, tone: "bg-restaurant/10 text-restaurant border-restaurant/20" },
  stamp_program: { label: "Stamp Program", icon: Gift, tone: "bg-pink-50 text-pink-700 border-pink-200" },
  online_order: { label: "Online Order / SNS", icon: Wifi, tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  other: { label: "Other Service", icon: Truck, tone: "bg-muted text-foreground border-border" },
};

const getServiceMeta = (type: ApiRestaurantService["service_type"] | string): ServiceMeta => {
  return serviceMeta[type as ServiceType] ?? serviceMeta.other;
};

const getServicePrice = (price: ApiRestaurantService["price"]): number => {
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) ? numericPrice : 0;
};

const defaultServices: Omit<ApiRestaurantService, "id" | "created_at">[] = [
  { name: "Dine In", service_type: "dine_in", description: "Table service for walk-in guests.", price: 0, enabled: true, schedule: "Open hours" },
  { name: "Delivery", service_type: "delivery", description: "Local delivery with delivery charge control.", price: 0, enabled: true, schedule: "Open hours" },
  { name: "Takeaway", service_type: "takeaway", description: "Packed orders for pickup customers.", price: 0, enabled: true, schedule: "Open hours" },
  { name: "Stamp Loyalty Program", service_type: "stamp_program", description: "Reward repeat customers after set visits or orders.", price: 0, enabled: true, schedule: "Always" },
  { name: "Online Order / SNS", service_type: "online_order", description: "Orders through social network, phone, or chat channel.", price: 0, enabled: true, schedule: "Open hours" },
];

export default function ServicesPage() {
  const [services, setServices] = useList(() => servicesApi.list());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRestaurantService | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ServiceType | "all">("all");
  const [form, setForm] = useState<Omit<ApiRestaurantService, "id" | "created_at">>({
    name: "",
    service_type: "dine_in",
    description: "",
    price: 0,
    enabled: true,
    schedule: "",
  });

  const openAdd = (type: ServiceType = "dine_in") => {
    setEditing(null);
    setForm({ name: getServiceMeta(type).label, service_type: type, description: "", price: 0, enabled: true, schedule: "Open hours" });
    setDialogOpen(true);
  };

  const openEdit = (service: ApiRestaurantService) => {
    setEditing(service);
    setForm({
      name: service.name,
      service_type: service.service_type,
      description: service.description,
      price: getServicePrice(service.price),
      enabled: service.enabled,
      schedule: service.schedule,
    });
    setDialogOpen(true);
  };

  const saveService = async () => {
    if (!form.name.trim()) { toast.error("Service name is required"); return; }
    try {
      if (editing) {
        const updated = await servicesApi.update(editing.id, form);
        setServices((prev) => prev.map((service) => service.id === editing.id ? updated : service));
        toast.success("Service updated");
      } else {
        const created = await servicesApi.create(form);
        setServices((prev) => [...prev, created]);
        toast.success("Service added");
      }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  const toggleService = (service: ApiRestaurantService) => {
    servicesApi.update(service.id, { enabled: !service.enabled }).catch(() => {});
    setServices((prev) => prev.map((item) => item.id === service.id ? { ...item, enabled: !item.enabled } : item));
  };

  const deleteService = async (id: number) => {
    try { await servicesApi.delete(id); } catch { /* ignore */ }
    setServices((prev) => prev.filter((service) => service.id !== id));
    toast.success("Service deleted");
  };

  const seedDefaults = async () => {
    try {
      const existingTypes = new Set(services.map((service) => service.service_type));
      const missing = defaultServices.filter((service) => !existingTypes.has(service.service_type));
      const created = await Promise.all(missing.map((service) => servicesApi.create(service)));
      setServices((prev) => [...prev, ...created]);
      toast.success(created.length ? "Default services added" : "Default services already exist");
    } catch (err) { toast.error((err as Error).message); }
  };

  const filtered = services.filter((service) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q
      || service.name.toLowerCase().includes(q)
      || service.description.toLowerCase().includes(q)
      || getServiceMeta(service.service_type).label.toLowerCase().includes(q);
    const matchesType = filter === "all" || service.service_type === filter;
    return matchesQuery && matchesType;
  });

  const enabledCount = services.filter((service) => service.enabled).length;
  const deliveryCount = services.filter((service) => service.service_type === "delivery" || service.service_type === "online_order").length;
  const loyaltyCount = services.filter((service) => service.service_type === "stamp_program").length;

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Services</h1>
          <p className="page-description">Manage dine-in, delivery, online/SNS ordering, loyalty stamp, and other restaurant services.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={seedDefaults}>Add Defaults</Button>
          <Button onClick={() => openAdd()}><Plus className="w-4 h-4" /> Add Service</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Services" value={services.length} icon={<Store className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard title="Enabled" value={enabledCount} icon={<Utensils className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="Delivery / SNS" value={deliveryCount} icon={<Bike className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard title="Stamp Programs" value={loyaltyCount} icon={<Gift className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">Service Setup</CardTitle>
          <div className="grid gap-2 sm:grid-cols-[1fr_200px] lg:w-[560px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services..." className="pl-9" />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as ServiceType | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {(Object.keys(serviceMeta) as ServiceType[]).map((type) => <SelectItem key={type} value={type}>{serviceMeta[type].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((service) => {
              const meta = getServiceMeta(service.service_type);
              const Icon = meta.icon;
              return (
                <div key={service.id} className={`rounded-xl border bg-card p-4 shadow-sm ${service.enabled ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <Badge variant="outline" className={meta.tone}>{meta.label}</Badge>
                        <h2 className="mt-2 truncate font-semibold">{service.name}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{service.description || "No description added."}</p>
                      </div>
                    </div>
                    <Switch checked={service.enabled} onCheckedChange={() => toggleService(service)} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">Charge</p>
                      <p className="font-semibold">Rs. {getServicePrice(service.price).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">Schedule</p>
                      <p className="truncate font-semibold">{service.schedule || "Open hours"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>Edit</Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => deleteService(service.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No services found. Add defaults to start quickly.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Service</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={form.service_type} onValueChange={(value) => setForm({ ...form, service_type: value as ServiceType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(serviceMeta) as ServiceType[]).map((type) => <SelectItem key={type} value={type}>{serviceMeta[type].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Charge</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Schedule</Label><Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Open hours" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">Available for operations and customer-facing service list</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />
            </div>
            <Button onClick={saveService} className="w-full gap-2"><Save className="w-4 h-4" /> Save Service</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

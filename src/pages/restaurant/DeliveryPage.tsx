import { useEffect, useMemo, useState } from "react";
import { orders as ordersApi } from "@/lib/api";
import { useOrders } from "@/contexts/OrdersContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Bike, CheckCircle2, Clock, CreditCard, MapPin, PackageCheck, PackagePlus,
  Phone, Printer, RotateCcw, Search, Truck, UserRound, Wallet, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

type DeliveryStatus = "new" | "packed" | "dispatched" | "delivered" | "returned" | "cancelled";
type PaymentStatus = "unpaid" | "collected" | "online_paid" | "credit";

type DeliveryRecord = {
  id: string;
  source: "order" | "manual";
  orderId?: string;
  customer: string;
  phone: string;
  address: string;
  area: string;
  rider: string;
  paymentMethod: "cash" | "online" | "card" | "credit";
  paymentStatus: PaymentStatus;
  deliveryCharge: number;
  collectedAmount: number;
  status: DeliveryStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
};

const STORAGE_KEY = "mp_delivery_flow_v2";

const statusMeta: Record<DeliveryStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-warning/10 text-warning border-warning/20" },
  packed: { label: "Packed", className: "bg-info/10 text-info border-info/20" },
  dispatched: { label: "Dispatched", className: "bg-primary/10 text-primary border-primary/20" },
  delivered: { label: "Delivered", className: "bg-success/10 text-success border-success/20" },
  returned: { label: "Returned", className: "bg-orange-100 text-orange-700 border-orange-200" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const paymentMeta: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "Collect", className: "bg-warning/10 text-warning border-warning/20" },
  collected: { label: "Collected", className: "bg-success/10 text-success border-success/20" },
  online_paid: { label: "Online Paid", className: "bg-info/10 text-info border-info/20" },
  credit: { label: "Credit", className: "bg-muted text-muted-foreground border-border" },
};

const riders = ["Counter Staff", "Rider 1", "Rider 2", "Pathao / Courier", "Customer Pickup"];

function readRecords(): DeliveryRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as DeliveryRecord[];
  } catch {
    return [];
  }
}

function writeRecords(records: DeliveryRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function nowStamp() {
  return new Date().toLocaleString();
}

function orderToDelivery(order: Order): DeliveryRecord {
  const paymentStatus: PaymentStatus =
    order.paymentMethod === "mobile" || order.paymentMethod === "card" ? "online_paid" :
    order.paymentMethod ? "collected" : "unpaid";
  return {
    id: `DEL-${order.id}`,
    source: "order",
    orderId: order.id,
    customer: order.customerName || "Walk-in Customer",
    phone: "",
    address: "",
    area: "",
    rider: "",
    paymentMethod: order.paymentMethod === "mobile" ? "online" : order.paymentMethod === "card" ? "card" : "cash",
    paymentStatus,
    deliveryCharge: 0,
    collectedAmount: paymentStatus === "collected" || paymentStatus === "online_paid" ? order.total : 0,
    status: order.status === "completed" ? "delivered" : order.status === "cancelled" ? "cancelled" : "new",
    notes: "",
    createdAt: new Date(order.createdAt).toLocaleString(),
    updatedAt: nowStamp(),
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
    total: order.total,
  };
}

function money(symbol: string, value: number) {
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}

function nextStatus(status: DeliveryStatus): DeliveryStatus | null {
  if (status === "new") return "packed";
  if (status === "packed") return "dispatched";
  if (status === "dispatched") return "delivered";
  return null;
}

export default function DeliveryPage() {
  const { settings } = useSettings();
  const { allOrders, setAllOrders } = useOrders();
  const [records, setRecords] = useState<DeliveryRecord[]>(readRecords);
  const [status, setStatus] = useState<DeliveryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DeliveryRecord | null>(null);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    address: "",
    area: "",
    item: "",
    amount: "",
    deliveryCharge: "0",
    method: "cash",
    notes: "",
  });

  const deliveryOrders = useMemo(() => allOrders.filter((order) => order.type === "delivery"), [allOrders]);

  useEffect(() => {
    setRecords((prev) => {
      const existingByOrder = new Set(prev.map((record) => record.orderId).filter(Boolean));
      const incoming = deliveryOrders
        .filter((order) => !existingByOrder.has(order.id))
        .map(orderToDelivery);
      if (incoming.length === 0) return prev;
      const next = [...incoming, ...prev];
      writeRecords(next);
      return next;
    });
  }, [deliveryOrders]);

  useEffect(() => writeRecords(records), [records]);

  const filtered = useMemo(() => records.filter((record) => {
    const matchesStatus = status === "all" || record.status === status;
    const haystack = `${record.id} ${record.customer} ${record.phone} ${record.address} ${record.area} ${record.rider} ${record.items.map((item) => item.name).join(" ")}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  }), [records, search, status]);

  const summary = useMemo(() => {
    const active = records.filter((record) => ["new", "packed", "dispatched"].includes(record.status)).length;
    const dispatched = records.filter((record) => record.status === "dispatched").length;
    const delivered = records.filter((record) => record.status === "delivered").length;
    const collectable = records
      .filter((record) => record.paymentStatus === "unpaid" && !["cancelled", "returned"].includes(record.status))
      .reduce((sum, record) => sum + record.total + record.deliveryCharge, 0);
    return { active, dispatched, delivered, collectable };
  }, [records]);

  const persist = (next: DeliveryRecord[]) => {
    setRecords(next);
    writeRecords(next);
  };

  const createManualDelivery = () => {
    const amount = Number(form.amount);
    const deliveryCharge = Number(form.deliveryCharge);
    if (!form.customer.trim() || !form.phone.trim() || !form.address.trim() || !form.item.trim() || !amount) {
      toast.error("Customer, phone, address, item and amount are required");
      return;
    }
    const record: DeliveryRecord = {
      id: `DEL-${Date.now()}`,
      source: "manual",
      customer: form.customer.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      area: form.area.trim(),
      rider: "",
      paymentMethod: form.method as DeliveryRecord["paymentMethod"],
      paymentStatus: form.method === "credit" ? "credit" : "unpaid",
      deliveryCharge: Number.isFinite(deliveryCharge) ? deliveryCharge : 0,
      collectedAmount: 0,
      status: "new",
      notes: form.notes.trim(),
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
      items: [{ name: form.item.trim(), quantity: 1, price: amount }],
      total: amount,
    };
    persist([record, ...records]);
    setForm({ customer: "", phone: "", address: "", area: "", item: "", amount: "", deliveryCharge: "0", method: "cash", notes: "" });
    toast.success("Delivery request created");
  };

  const patchRecord = async (id: string, patch: Partial<DeliveryRecord>) => {
    const target = records.find((record) => record.id === id);
    const nextRecord = target ? { ...target, ...patch, updatedAt: nowStamp() } : null;
    persist(records.map((record) => record.id === id && nextRecord ? nextRecord : record));
    if (nextRecord) setSelected(nextRecord);

    if (target?.orderId && patch.status === "delivered") {
      const numericOrderId = Number(target.orderId);
      if (Number.isFinite(numericOrderId)) {
        try {
          const paymentMethod = target.paymentMethod === "online" ? "mobile" : target.paymentMethod === "credit" ? "cash" : target.paymentMethod;
          await ordersApi.update(numericOrderId, {
            status: "completed",
            payment_method: paymentMethod as Order["paymentMethod"],
          });
          setAllOrders((prev) => prev.map((order) => order.id === target.orderId ? { ...order, status: "completed", paymentMethod: paymentMethod as Order["paymentMethod"] } : order));
        } catch (error) {
          toast.error((error as Error).message);
        }
      }
    }
  };

  const advance = (record: DeliveryRecord) => {
    const next = nextStatus(record.status);
    if (!next) return;
    patchRecord(record.id, { status: next });
    toast.success(`Delivery moved to ${statusMeta[next].label}`);
  };

  const markCollected = (record: DeliveryRecord) => {
    patchRecord(record.id, {
      paymentStatus: record.paymentMethod === "online" || record.paymentMethod === "card" ? "online_paid" : "collected",
      collectedAmount: record.total + record.deliveryCharge,
    });
  };

  const printRunSheet = () => {
    const active = filtered.filter((record) => ["new", "packed", "dispatched"].includes(record.status));
    const rows = active.map((record, index) => `<tr><td>${index + 1}</td><td>${record.id}<br>${record.customer}<br>${record.phone}</td><td>${record.address}<br>${record.area || ""}</td><td>${record.rider || "-"}</td><td>${money(settings.currencySymbol, record.total + record.deliveryCharge)}</td><td>${paymentMeta[record.paymentStatus].label}</td></tr>`).join("");
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Delivery Run Sheet</title><style>
      body { font-family: Arial, sans-serif; color: #111827; }
      h1 { margin-bottom: 0; } p { margin-top: 4px; color: #6b7280; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #111827; color: white; padding: 8px; text-align: left; }
      td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
    </style></head><body><h1>${settings.businessName || "Mero Pasal"} Delivery Run Sheet</h1><p>${new Date().toLocaleString()}</p><table><thead><tr><th>Sr.</th><th>Order</th><th>Address</th><th>Rider</th><th>Amount</th><th>Payment</th></tr></thead><tbody>${rows || "<tr><td colspan='6'>No active deliveries</td></tr>"}</tbody></table><script>window.print(); window.close();</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-header">Delivery Hub</h1>
          <p className="page-description">Delivery request, packing, dispatch, rider assignment, cash collection, and closing flow</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={printRunSheet}>
          <Printer className="h-4 w-4" /> Print Run Sheet
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric title="Active Delivery" value={summary.active} icon={<Bike className="h-5 w-5 text-primary" />} />
        <Metric title="On The Way" value={summary.dispatched} icon={<Truck className="h-5 w-5 text-info" />} />
        <Metric title="Delivered" value={summary.delivered} icon={<PackageCheck className="h-5 w-5 text-success" />} />
        <Metric title="Cash To Collect" value={money(settings.currencySymbol, summary.collectable)} icon={<Wallet className="h-5 w-5 text-warning" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackagePlus className="h-5 w-5 text-primary" /> Manual Delivery Request</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Customer" value={form.customer} onChange={(customer) => setForm({ ...form, customer })} />
              <Field label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House, landmark, street..." />
            </div>
            <Field label="Area / Route" value={form.area} onChange={(area) => setForm({ ...form, area })} />
            <Field label="Item / Parcel" value={form.item} onChange={(item) => setForm({ ...form, item })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} type="number" />
              <Field label="Delivery Charge" value={form.deliveryCharge} onChange={(deliveryCharge) => setForm({ ...form, deliveryCharge })} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select value={form.method} onValueChange={(method) => setForm({ ...form, method })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash on delivery</SelectItem>
                  <SelectItem value="online">Online / QR</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
            <Button className="w-full" onClick={createManualDelivery}>Create Delivery</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Bike className="h-5 w-5 text-primary" /> Delivery Board</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search delivery..." className="pl-9" />
                </div>
                <Select value={status} onValueChange={(value) => setStatus(value as DeliveryStatus | "all")}>
                  <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No delivery records found</div>}
            {filtered.map((record) => (
              <DeliveryCard
                key={record.id}
                record={record}
                currencySymbol={settings.currencySymbol}
                onOpen={() => setSelected(record)}
                onAdvance={() => advance(record)}
                onCollect={() => markCollected(record)}
                onPatch={(patch) => patchRecord(record.id, patch)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="text-base">Delivery Detail - {selected.id}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Info icon={<UserRound className="h-4 w-4" />} label="Customer" value={selected.customer} />
              <Info icon={<Phone className="h-4 w-4" />} label="Phone" value={selected.phone || "-"} />
              <Info icon={<MapPin className="h-4 w-4" />} label="Route" value={selected.area || "-"} />
              <Info icon={<CreditCard className="h-4 w-4" />} label="Payment" value={paymentMeta[selected.paymentStatus].label} />
            </div>
            <Separator />
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
              <div className="space-y-2">
                <Label>Full Address</Label>
                <Textarea value={selected.address} onChange={(e) => patchRecord(selected.id, { address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rider</Label>
                <Select value={selected.rider || "unassigned"} onValueChange={(rider) => patchRecord(selected.id, { rider: rider === "unassigned" ? "" : rider })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {riders.map((rider) => <SelectItem key={rider} value={rider}>{rider}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selected.status} onValueChange={(value) => patchRecord(selected.id, { status: value as DeliveryStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusMeta).map(([key, meta]) => <SelectItem key={key} value={key}>{meta.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeliveryCard({
  record,
  currencySymbol,
  onOpen,
  onAdvance,
  onCollect,
  onPatch,
}: {
  record: DeliveryRecord;
  currencySymbol: string;
  onOpen: () => void;
  onAdvance: () => void;
  onCollect: () => void;
  onPatch: (patch: Partial<DeliveryRecord>) => void;
}) {
  const total = record.total + record.deliveryCharge;
  const next = nextStatus(record.status);
  return (
    <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{record.id}</p>
            <Badge variant="outline" className={statusMeta[record.status].className}>{statusMeta[record.status].label}</Badge>
            <Badge variant="outline" className={paymentMeta[record.paymentStatus].className}>{paymentMeta[record.paymentStatus].label}</Badge>
          </div>
          <p className="mt-1 text-sm font-medium">{record.customer}</p>
          <p className="text-sm text-muted-foreground">{record.phone || "No phone"} | {record.area || "No route"}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{record.address || "Address pending"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{record.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</span>
            <span>| Rider: {record.rider || "Unassigned"}</span>
          </div>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-lg font-bold">{money(currencySymbol, total)}</p>
          <p className="text-xs text-muted-foreground">Updated {record.updatedAt}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onOpen}>Details</Button>
        {next && <Button size="sm" onClick={onAdvance}>{next === "delivered" ? <CheckCircle2 className="mr-1 h-4 w-4" /> : <Truck className="mr-1 h-4 w-4" />}{statusMeta[next].label}</Button>}
        {record.paymentStatus === "unpaid" && <Button size="sm" variant="outline" onClick={onCollect}><Wallet className="mr-1 h-4 w-4" />Collect Cash</Button>}
        {!record.rider && record.status !== "delivered" && <Button size="sm" variant="outline" onClick={() => onPatch({ rider: "Rider 1" })}><Bike className="mr-1 h-4 w-4" />Assign</Button>}
        {record.status !== "returned" && record.status !== "cancelled" && record.status !== "delivered" && (
          <Button size="sm" variant="outline" className="text-orange-700" onClick={() => onPatch({ status: "returned" })}><RotateCcw className="mr-1 h-4 w-4" />Return</Button>
        )}
        {record.status !== "cancelled" && record.status !== "delivered" && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => onPatch({ status: "cancelled" })}><XCircle className="mr-1 h-4 w-4" />Cancel</Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">{icon}</div>
      </CardContent>
    </Card>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className={cn("mt-1 font-semibold", !value && "text-muted-foreground")}>{value || "-"}</p>
    </div>
  );
}

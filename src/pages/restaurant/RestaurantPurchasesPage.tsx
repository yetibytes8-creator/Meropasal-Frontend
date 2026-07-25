import { useMemo, useState } from "react";
import { ingredients as ingredientsApi } from "@/lib/api";
import { fromApiIngredient } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle, Clock, PackagePlus, Plus, Printer, Search, Trash2, Truck, XCircle } from "lucide-react";
import type { Ingredient } from "@/types";

type RestaurantPoStatus = "pending" | "received" | "cancelled";

interface RestaurantPoItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  cost: number;
}

interface RestaurantPo {
  id: string;
  supplierName: string;
  supplierPhone: string;
  billNo: string;
  notes: string;
  date: string;
  status: RestaurantPoStatus;
  items: RestaurantPoItem[];
}

const STORAGE_KEY = "mp_restaurant_purchase_orders";

const statusClass: Record<RestaurantPoStatus, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  received: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcon: Record<RestaurantPoStatus, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  received: <CheckCircle className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
};

const money = (symbol: string, value: number) => `${symbol}${Number(value || 0).toFixed(2)}`;

const today = () => new Date().toISOString().slice(0, 10);

function loadOrders(): RestaurantPo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) as RestaurantPo[] : [];
  } catch {
    return [];
  }
}

function saveOrders(rows: RestaurantPo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function printPo(po: RestaurantPo, businessName: string, currencySymbol: string) {
  const total = po.items.reduce((sum, item) => sum + item.quantity * item.cost, 0);
  const rows = po.items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${item.ingredientName}</strong><br><span>${item.unit}</span></td>
      <td class="right">${item.quantity}</td>
      <td class="right">${money(currencySymbol, item.cost)}</td>
      <td class="right">${money(currencySymbol, item.quantity * item.cost)}</td>
    </tr>
  `).join("");
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><link rel="icon" type="image/png" href="/logo.png?v=mero-pasal-print" /><title>${po.id}</title><style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    .sheet { padding: 20px; }
    .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 12px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 24px; text-transform: uppercase; }
    h2 { font-size: 18px; }
    .muted { color: #6b7280; font-size: 12px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
    .box { border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; }
    .label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #111827; color: white; padding: 8px; text-align: left; }
    td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
    .right { text-align: right; }
    .total { width: 260px; margin-left: auto; margin-top: 12px; border: 1px solid #111827; padding: 10px; display: flex; justify-content: space-between; font-weight: 800; }
    .sign { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; text-align: center; font-size: 12px; }
    .line { border-top: 1px solid #111827; padding-top: 8px; }
  </style></head><body><main class="sheet">
    <section class="head">
      <div><h1>${businessName || "Mero Pasal"}</h1><p class="muted">Restaurant ingredient purchase order</p></div>
      <div style="text-align:right"><h2>PURCHASE ORDER</h2><p class="muted">${po.id}<br>${po.date}<br>${po.status.toUpperCase()}</p></div>
    </section>
    <section class="grid">
      <div class="box"><p class="label">Supplier</p><p><strong>${po.supplierName}</strong></p><p class="muted">${po.supplierPhone || "Phone not set"}</p></div>
      <div class="box"><p class="label">Bill / Reference</p><p>${po.billNo || "-"}</p><p class="muted">${po.notes || "No notes"}</p></div>
    </section>
    <table><thead><tr><th>Sr.</th><th>Ingredient</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total"><span>Total</span><span>${money(currencySymbol, total)}</span></div>
    <section class="sign"><div class="line">Prepared By</div><div class="line">Authorized Signature</div></section>
  </main><script>window.print(); window.close();</script></body></html>`);
  win.document.close();
}

export default function RestaurantPurchasesPage() {
  const { settings } = useSettings();
  const [ingredients, setIngredients] = useList(() => ingredientsApi.list().then((rows) => rows.map(fromApiIngredient)));
  const [orders, setOrders] = useState<RestaurantPo[]>(loadOrders);
  const [open, setOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQuery, setReceiveQuery] = useState("");
  const [receivePoId, setReceivePoId] = useState("");
  const [receiveBillNo, setReceiveBillNo] = useState("");
  const [receiveNote, setReceiveNote] = useState("");
  const [search, setSearch] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [billNo, setBillNo] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientCategory, setIngredientCategory] = useState("all");
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [items, setItems] = useState<RestaurantPoItem[]>([]);

  const totals = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pending").length;
    const received = orders.filter((order) => order.status === "received").length;
    const spend = orders.filter((order) => order.status === "received").reduce((sum, order) => (
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity * item.cost, 0)
    ), 0);
    return { pending, received, spend };
  }, [orders]);

  const filteredOrders = orders.filter((order) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return order.id.toLowerCase().includes(q) || order.supplierName.toLowerCase().includes(q) || order.items.some((item) => item.ingredientName.toLowerCase().includes(q));
  });

  const receiveCandidates = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pending");
    const q = receiveQuery.trim().toLowerCase();
    if (!q) return pending.slice(0, 8);
    return pending.filter((order) => (
      order.id.toLowerCase().includes(q) ||
      order.supplierName.toLowerCase().includes(q) ||
      order.billNo.toLowerCase().includes(q) ||
      order.items.some((item) => item.ingredientName.toLowerCase().includes(q))
    )).slice(0, 12);
  }, [orders, receiveQuery]);

  const selectedReceivePo = orders.find((order) => order.id === receivePoId) ?? receiveCandidates[0] ?? null;

  const selectedIngredient = ingredients.find((item) => item.id === selectedIngredientId);

  const ingredientCategories = useMemo(() => {
    const counts = ingredients.reduce<Record<string, number>>((acc, ingredient) => {
      const category = ingredient.category || "Ingredient";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    return ingredients
      .filter((ingredient) => {
        const category = ingredient.category || "Ingredient";
        if (ingredientCategory !== "all" && category !== ingredientCategory) return false;
        if (!q) return true;
        return (
          ingredient.name.toLowerCase().includes(q) ||
          category.toLowerCase().includes(q) ||
          ingredient.unit.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 80);
  }, [ingredients, ingredientSearch, ingredientCategory]);

  const resetForm = () => {
    setSupplierName("");
    setSupplierPhone("");
    setBillNo("");
    setNotes("");
    setSelectedIngredientId("");
    setIngredientSearch("");
    setIngredientCategory("all");
    setQuantity("1");
    setCost("");
    setItems([]);
  };

  const persist = (rows: RestaurantPo[]) => {
    setOrders(rows);
    saveOrders(rows);
  };

  const addLine = () => {
    const ingredient = ingredients.find((item) => item.id === selectedIngredientId);
    const qty = Number(quantity);
    const rate = Number(cost);
    if (!ingredient) { toast.error("Select ingredient"); return; }
    if (!qty || qty <= 0) { toast.error("Enter valid quantity"); return; }
    if (rate < 0 || cost === "") { toast.error("Enter valid cost"); return; }
    setItems((prev) => {
      const existing = prev.find((line) => line.ingredientId === ingredient.id);
      if (existing) {
        return prev.map((line) => line.ingredientId === ingredient.id ? { ...line, quantity: line.quantity + qty, cost: rate } : line);
      }
      return [...prev, { ingredientId: ingredient.id, ingredientName: ingredient.name, unit: ingredient.unit, quantity: qty, cost: rate }];
    });
    setSelectedIngredientId("");
    setIngredientSearch("");
    setIngredientCategory("all");
    setQuantity("1");
    setCost("");
  };

  const createPo = () => {
    if (!supplierName.trim()) { toast.error("Supplier name is required"); return; }
    if (items.length === 0) { toast.error("Add at least one ingredient"); return; }
    const po: RestaurantPo = {
      id: `RPO-${Date.now()}`,
      supplierName: supplierName.trim().slice(0, 120),
      supplierPhone: supplierPhone.trim().slice(0, 60),
      billNo: billNo.trim().slice(0, 80),
      notes: notes.trim().slice(0, 200),
      date: today(),
      status: "pending",
      items,
    };
    persist([po, ...orders]);
    resetForm();
    setOpen(false);
    toast.success("Restaurant purchase order saved");
  };

  const updateStatus = (poId: string, status: RestaurantPoStatus) => {
    persist(orders.map((order) => order.id === poId ? { ...order, status } : order));
  };

  const receivePo = async (po: RestaurantPo) => {
    try {
      const updatedIngredients: Ingredient[] = [];
      for (const line of po.items) {
        const ingredient = ingredients.find((item) => item.id === line.ingredientId);
        if (!ingredient) continue;
        const updated = await ingredientsApi.update(Number(ingredient.id), { stock: ingredient.stock + line.quantity });
        updatedIngredients.push(fromApiIngredient(updated));
      }
      setIngredients((prev) => prev.map((ingredient) => updatedIngredients.find((item) => item.id === ingredient.id) ?? ingredient));
      persist(orders.map((order) => order.id === po.id ? { ...order, billNo: po.billNo, notes: po.notes, status: "received" } : order));
      toast.success("PO received and restaurant stock updated");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const openReceiveByPo = () => {
    setReceiveQuery("");
    setReceivePoId("");
    setReceiveBillNo("");
    setReceiveNote("");
    setReceiveOpen(true);
  };

  const receiveSelectedPo = async () => {
    if (!selectedReceivePo) { toast.error("Enter or select pending PO number"); return; }
    if (selectedReceivePo.status !== "pending") { toast.error("Only pending PO can be received"); return; }
    await receivePo({ ...selectedReceivePo, billNo: receiveBillNo.trim() || selectedReceivePo.billNo, notes: receiveNote.trim() || selectedReceivePo.notes });
    setReceiveOpen(false);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.cost, 0);

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Restaurant Purchases</h1>
          <p className="page-description">Create ingredient purchase orders and receive stock into restaurant inventory</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={openReceiveByPo} className="gap-2">
            <PackagePlus className="h-4 w-4" /> Receive by PO No.
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Purchase Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">Pending PO</p><p className="text-2xl font-bold">{totals.pending}</p></div><Clock className="h-5 w-5 text-warning" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">Received PO</p><p className="text-2xl font-bold">{totals.received}</p></div><PackagePlus className="h-5 w-5 text-success" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">Received Value</p><p className="text-2xl font-bold">{money(settings.currencySymbol, totals.spend)}</p></div><Truck className="h-5 w-5 text-primary" /></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search PO, supplier, ingredient..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No restaurant purchase orders yet</TableCell></TableRow>
                ) : filteredOrders.map((order) => {
                  const total = order.items.reduce((sum, item) => sum + item.quantity * item.cost, 0);
                  return (
                    <TableRow key={order.id}>
                      <TableCell><p className="font-medium">{order.id}</p><p className="text-xs text-muted-foreground">{order.date}</p></TableCell>
                      <TableCell><p className="font-medium">{order.supplierName}</p><p className="text-xs text-muted-foreground">{order.billNo || "No bill ref"}</p></TableCell>
                      <TableCell>{order.items.map((item) => `${item.quantity} ${item.unit} ${item.ingredientName}`).join(", ")}</TableCell>
                      <TableCell><Badge variant="outline" className={statusClass[order.status]}>{statusIcon[order.status]}<span className="ml-1 capitalize">{order.status}</span></Badge></TableCell>
                      <TableCell className="text-right font-semibold">{money(settings.currencySymbol, total)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => printPo(order, settings.businessName, settings.currencySymbol)}><Printer className="mr-1 h-4 w-4" />Print</Button>
                        {order.status === "pending" && <Button size="sm" onClick={() => receivePo(order)}><CheckCircle className="mr-1 h-4 w-4" />Receive</Button>}
                        {order.status === "pending" && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updateStatus(order.id, "cancelled")}>Cancel</Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 p-3 md:hidden">
            {filteredOrders.map((order) => {
              const total = order.items.reduce((sum, item) => sum + item.quantity * item.cost, 0);
              return (
                <div key={order.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{order.id}</p><p className="text-xs text-muted-foreground">{order.supplierName} | {order.date}</p></div>
                    <Badge variant="outline" className={statusClass[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{order.items.map((item) => `${item.quantity} ${item.unit} ${item.ingredientName}`).join(", ")}</p>
                  <p className="mt-2 font-bold">{money(settings.currencySymbol, total)}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => printPo(order, settings.businessName, settings.currencySymbol)}>Print</Button>
                    {order.status === "pending" && <Button size="sm" className="flex-1" onClick={() => receivePo(order)}>Receive</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Receive Purchase by PO Number</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="space-y-1.5">
                <Label>PO Number / Supplier / Ingredient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="e.g. RPO-178..., dairy supplier, milk..."
                    value={receiveQuery}
                    onChange={(event) => {
                      setReceiveQuery(event.target.value);
                      setReceivePoId("");
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier Bill No.</Label>
                <Input value={receiveBillNo} onChange={(event) => setReceiveBillNo(event.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-xl border">
                <div className="border-b px-3 py-2 text-sm font-semibold">Pending PO</div>
                <div className="max-h-64 overflow-y-auto">
                  {receiveCandidates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No pending restaurant PO found</div>
                  ) : receiveCandidates.map((po) => {
                    const total = po.items.reduce((sum, item) => sum + item.quantity * item.cost, 0);
                    return (
                      <button
                        key={po.id}
                        type="button"
                        onClick={() => setReceivePoId(po.id)}
                        className={`flex w-full items-start justify-between gap-3 border-b p-3 text-left text-sm last:border-b-0 hover:bg-muted ${
                          selectedReceivePo?.id === po.id ? "bg-primary/10 text-primary" : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold">{po.id}</span>
                          <span className="block truncate text-xs text-muted-foreground">{po.supplierName}</span>
                        </span>
                        <span className="shrink-0 text-xs font-bold">{money(settings.currencySymbol, total)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                {selectedReceivePo ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-primary">{selectedReceivePo.id}</p>
                        <p className="text-sm font-semibold">{selectedReceivePo.supplierName}</p>
                        <p className="text-xs text-muted-foreground">PO Date: {selectedReceivePo.date}</p>
                      </div>
                      <Badge variant="outline" className={statusClass[selectedReceivePo.status]}>{selectedReceivePo.status}</Badge>
                    </div>
                    <div className="rounded-lg bg-muted/40">
                      {selectedReceivePo.items.map((item) => (
                        <div key={item.ingredientId} className="flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.ingredientName}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold">{money(settings.currencySymbol, item.quantity * item.cost)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground">Receive Total</span>
                      <span className="text-lg font-bold">
                        {money(settings.currencySymbol, selectedReceivePo.items.reduce((sum, item) => sum + item.quantity * item.cost, 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-48 place-items-center text-center text-sm text-muted-foreground">
                    Select a pending PO to receive restaurant stock.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Receive Remarks</Label>
              <Input value={receiveNote} onChange={(event) => setReceiveNote(event.target.value)} placeholder="Delivery note, payment note..." />
            </div>
            <Button className="w-full" disabled={!selectedReceivePo} onClick={receiveSelectedPo}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Receive Stock from Selected PO
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>New Restaurant Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2"><Label>Supplier Name</Label><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. Dairy supplier" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} placeholder="Optional" /></div>
              <div className="space-y-1.5"><Label>Bill / Ref No.</Label><Input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Optional" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery, cheque, payment note..." /></div>
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-[1fr_110px_130px_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label>Ingredient</Label>
                <Popover open={ingredientPickerOpen} onOpenChange={setIngredientPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-between rounded-xl px-3 font-normal"
                    >
                      <span className={selectedIngredient ? "truncate text-foreground" : "truncate text-muted-foreground"}>
                        {selectedIngredient ? `${selectedIngredient.name} (${selectedIngredient.unit})` : "Search / choose stock item"}
                      </span>
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[min(92vw,420px)] p-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        className="h-10 pl-9"
                        placeholder="Search ingredient, category, unit..."
                        value={ingredientSearch}
                        onChange={(e) => setIngredientSearch(e.target.value)}
                      />
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Catalog</span>
                        <span className="text-[11px] text-muted-foreground">{filteredIngredients.length} shown</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIngredientCategory("all")}
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            ingredientCategory === "all"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          All ({ingredients.length})
                        </button>
                        {ingredientCategories.map((category) => (
                          <button
                            key={category.name}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setIngredientCategory(category.name)}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                              ingredientCategory === category.name
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                            }`}
                          >
                            {category.name} ({category.count})
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border">
                      {filteredIngredients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No stock item found in this catalog</div>
                      ) : filteredIngredients.map((ingredient) => (
                        <button
                          key={ingredient.id}
                          type="button"
                        className={`flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted ${
                          selectedIngredientId === ingredient.id ? "bg-primary/10 text-primary" : ""
                        }`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSelectedIngredientId(ingredient.id);
                            setIngredientSearch("");
                            setIngredientPickerOpen(false);
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{ingredient.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {ingredient.category || "Ingredient"} | Stock: {ingredient.stock} {ingredient.unit}
                            </span>
                          </span>
                          <Badge variant="outline" className="shrink-0">{ingredient.unit}</Badge>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5"><Label>Qty</Label><Input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Rate</Label><Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
              <Button type="button" variant="outline" onClick={addLine}>Add Line</Button>
            </div>
            {items.length > 0 && (
              <div className="rounded-lg border">
                {items.map((item) => (
                  <div key={item.ingredientId} className="flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
                    <div><p className="font-medium">{item.ingredientName}</p><p className="text-xs text-muted-foreground">{item.quantity} {item.unit} x {money(settings.currencySymbol, item.cost)}</p></div>
                    <div className="flex items-center gap-2"><p className="font-semibold">{money(settings.currencySymbol, item.quantity * item.cost)}</p><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItems((prev) => prev.filter((line) => line.ingredientId !== item.ingredientId))}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">PO Total</span>
              <span className="text-xl font-bold">{money(settings.currencySymbol, totalAmount)}</span>
            </div>
            <Button className="w-full" onClick={createPo}>Save Purchase Order</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

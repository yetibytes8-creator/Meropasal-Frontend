import { useState, useMemo } from "react";
import { purchases as purchasesApi, suppliers as suppliersApi, products as productsApi } from "@/lib/api";
import { fromApiPurchase, fromApiProduct, fromApiSupplier } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import { postInventoryPurchaseToAccounts } from "@/lib/accountingAutoPost";
import { useSettings } from "@/contexts/SettingsContext";
import { esc } from "@/lib/html-escape";
import {
  Plus, Trash2, PackageCheck, Clock, XCircle, Banknote,
  TruckIcon, Search, Eye, CheckCircle, Ban, ChevronDown, ChevronUp, Package,
  Phone, Mail, MapPin, X, Building2, LayoutList, LayoutGrid, Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Purchase, Product, Supplier } from "@/types";

interface PurchaseItemForm {
  productId: string;       // "custom-xxx" for one-off items not in catalog
  productName: string;
  quantity: number;
  unitCost: number;
  isCustom?: boolean;
}

const statusBadgeClass: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  received: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  received: <PackageCheck className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

const emptyNewSupplier = { name: "", phone: "", email: "", address: "" };

const formatPoNumber = (id: string) => `PO-${String(id).replace(/\D/g, "").padStart(5, "0")}`;
const cleanMax = (value: string, max = 200) => value.trim().slice(0, max);

const generatePurchaseOrderHTML = (
  po: Purchase,
  supplier: Supplier | undefined,
  settings: ReturnType<typeof useSettings>["settings"],
) => {
  const contact = [settings.phone, settings.email].filter(Boolean).join(" | ");
  const supplierContact = [supplier?.phone, supplier?.email].filter(Boolean).join(" | ");
  const rows = po.items.map((item, index) => {
    const unitCost = item.quantity ? item.cost / item.quantity : item.cost;
    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td>
          <strong>${esc(item.productName)}</strong>
          ${item.productId.startsWith("custom-") ? `<div class="muted">Custom / one-off item</div>` : ""}
        </td>
        <td class="center">${esc(item.quantity)}</td>
        <td class="right">${esc(settings.currencySymbol)}${unitCost.toFixed(2)}</td>
        <td class="right">${esc(settings.currencySymbol)}${item.cost.toFixed(2)}</td>
      </tr>`;
  }).join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${esc(formatPoNumber(po.id))}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, sans-serif; }
        .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 14mm; }
        .top { display: grid; grid-template-columns: 1fr 96px; gap: 16px; align-items: start; border-bottom: 2px solid #111827; padding-bottom: 12px; }
        .brand { display: flex; gap: 12px; align-items: center; }
        .logo, .logo-box { width: 58px; height: 58px; object-fit: contain; border: 1px solid #d1d5db; border-radius: 8px; padding: 4px; }
        .logo-box { display: grid; place-items: center; font-weight: 800; color: #6b7280; }
        h1, h2, h3, p { margin: 0; }
        .business { font-size: 22px; font-weight: 900; text-transform: uppercase; }
        .muted { color: #6b7280; font-size: 11px; line-height: 1.5; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 20px; letter-spacing: .08em; }
        .status { display: inline-block; margin-top: 6px; border: 1px solid #111827; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; min-height: 92px; }
        .label { font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
        .value { font-size: 13px; line-height: 1.55; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
        th { background: #111827; color: #fff; text-align: left; padding: 8px; border: 1px solid #111827; }
        td { padding: 8px; border: 1px solid #d1d5db; vertical-align: top; }
        .center { text-align: center; }
        .right { text-align: right; }
        .summary { margin-left: auto; margin-top: 12px; width: 260px; border: 1px solid #111827; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #d1d5db; font-size: 13px; }
        .summary-row:last-child { border-bottom: 0; font-size: 16px; font-weight: 900; }
        .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
        .terms { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.6; }
        .sign { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; min-height: 118px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
        .line { border-top: 1px solid #111827; padding-top: 6px; font-size: 11px; font-weight: 700; }
        .print-note { margin-top: 12px; text-align: center; color: #6b7280; font-size: 10px; }
        @media print { body { background: #fff; } .sheet { width: auto; min-height: auto; margin: 0; padding: 0; } }
      </style>
    </head>
    <body>
      <main class="sheet">
        <section class="top">
          <div class="brand">
            ${settings.logo ? `<img class="logo" src="${esc(settings.logo)}" alt="logo" />` : `<div class="logo-box">LOGO</div>`}
            <div>
              <p class="business">${esc(settings.businessName || "My Business")}</p>
              <p class="muted">${esc(settings.address || "Business address")}</p>
              <p class="muted">${esc(contact || "Phone / Email")}</p>
              <p class="muted">PAN/VAT: ${esc(settings.taxNumber || "Not set")}</p>
            </div>
          </div>
          <div class="doc-title">
            <h1>PURCHASE ORDER</h1>
            <p class="muted">${esc(formatPoNumber(po.id))}</p>
            <span class="status">${esc(po.status)}</span>
          </div>
        </section>

        <section class="grid">
          <div class="box">
            <p class="label">Supplier</p>
            <p class="value"><strong>${esc(po.supplierName)}</strong></p>
            <p class="muted">${esc(supplier?.address || "Address not set")}</p>
            <p class="muted">${esc(supplierContact || "Phone / Email not set")}</p>
          </div>
          <div class="box">
            <p class="label">Order Detail</p>
            <p class="value"><strong>PO No:</strong> ${esc(formatPoNumber(po.id))}</p>
            <p class="value"><strong>PO Date:</strong> ${esc(po.date)}</p>
            <p class="value"><strong>Status:</strong> ${esc(po.status)}</p>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th style="width:44px">Sr.</th>
              <th>Product / Item</th>
              <th style="width:72px" class="center">Qty</th>
              <th style="width:110px" class="right">Unit Cost</th>
              <th style="width:120px" class="right">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <section class="summary">
          <div class="summary-row"><span>Subtotal</span><span>${esc(settings.currencySymbol)}${po.total.toFixed(2)}</span></div>
          <div class="summary-row"><span>Total</span><span>${esc(settings.currencySymbol)}${po.total.toFixed(2)}</span></div>
        </section>

        <section class="footer">
          <div class="terms">
            <p class="label">Terms and Conditions</p>
            <p>1. Please supply the goods listed above as per agreed quality and rate.</p>
            <p>2. Invoice / bill and delivery challan should reference this PO number.</p>
            <p>3. Stock will be updated only after goods are received and verified.</p>
          </div>
          <div class="sign">
            <p class="label">For ${esc(settings.businessName || "Business")}</p>
            <div class="line">Authorized Signature</div>
          </div>
        </section>
        <p class="print-note">Computer generated purchase order from Mero Pasal.</p>
      </main>
    </body>
  </html>`;
};


const PurchasesPage = () => {
  const { settings } = useSettings();
  const [allPurchases, setAllPurchases] = useList(() =>
    purchasesApi.list().then((r) => r.map(fromApiPurchase))
  );
  const [products, setProducts] = useList(() =>
    productsApi.list().then((r) => r.map(fromApiProduct))
  );
  const [allSuppliers, setAllSuppliers] = useList(() =>
    suppliersApi.list().then((r) => r.map(fromApiSupplier))
  );

  // ── PO list state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Create PO dialog state ─────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemForm[]>([]);
  const [poCounter, setPoCounter] = useState(100);

  // New supplier inline form
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState(emptyNewSupplier);

  // Product picker state
  const [productSearch, setProductSearch] = useState("");
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Custom one-off item entry
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customCost, setCustomCost] = useState("");

  // ── Detail dialog ──────────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPO, setDetailPO] = useState<Purchase | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalSpent = allPurchases.filter((p) => p.status === "received").reduce((s, p) => s + p.total, 0);
  const pendingCount = allPurchases.filter((p) => p.status === "pending").length;
  const receivedCount = allPurchases.filter((p) => p.status === "received").length;

  const filteredPOs = useMemo(() => {
    if (!search.trim()) return allPurchases;
    const q = search.toLowerCase();
    return allPurchases.filter(
      (p) =>
        p.supplierName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.items.some((i) => i.productName.toLowerCase().includes(q))
    );
  }, [allPurchases, search]);

  const selectedSupplier = allSuppliers.find((s) => s.id === selectedSupplierId);

  // Products shown in the picker — all products or only supplier-linked ones
  const pickerProducts = useMemo(() => {
    const base = showAllProducts
      ? products
      : selectedSupplier
        ? products.filter((p) => p.supplierId === selectedSupplier.id)
        : [];
    if (!productSearch.trim()) return base;
    const q = productSearch.toLowerCase();
    return base.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, showAllProducts, productSearch, selectedSupplier]);

  const newPOTotal = purchaseItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addProductToOrder = (product: Product) => {
    const existing = purchaseItems.find((i) => i.productId === product.id);
    if (existing) {
      setPurchaseItems(purchaseItems.map((i) =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setPurchaseItems([...purchaseItems, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitCost: product.costPrice,
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const addCustomItem = () => {
    if (!customName.trim()) { toast.error("Enter an item name"); return; }
    const qty = parseInt(customQty) || 1;
    const cost = parseFloat(customCost) || 0;
    const id = `custom-${Date.now()}`;
    setPurchaseItems((prev) => [...prev, {
      productId: id,
      productName: customName.trim(),
      quantity: qty,
      unitCost: cost,
      isCustom: true,
    }]);
    setCustomName("");
    setCustomQty("1");
    setCustomCost("");
    toast.success(`Custom item "${customName.trim()}" added`);
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setPurchaseItems(purchaseItems.filter((i) => i.productId !== productId));
    } else {
      setPurchaseItems(purchaseItems.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
    }
  };

  const updateItemCost = (productId: string, cost: number) => {
    setPurchaseItems(purchaseItems.map((i) => (i.productId === productId ? { ...i, unitCost: cost } : i)));
  };

  const removeItem = (productId: string) => {
    setPurchaseItems(purchaseItems.filter((i) => i.productId !== productId));
  };

  // ── Add new supplier ───────────────────────────────────────────────────────
  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) { toast.error("Supplier name is required"); return; }
    try {
      const created = await suppliersApi.create({
        name: newSupplier.name.trim(), phone: newSupplier.phone.trim(),
        email: newSupplier.email.trim(), address: newSupplier.address.trim(),
      });
      const sup = fromApiSupplier(created);
      setAllSuppliers((prev) => [...prev, sup]);
      setSelectedSupplierId(String(created.id));
      setShowNewSupplier(false);
      setNewSupplier(emptyNewSupplier);
      setShowAllProducts(true);
      toast.success(`Supplier "${created.name}" added`);
    } catch (err) { toast.error((err as Error).message); }
  };

  // ── Create PO ─────────────────────────────────────────────────────────────
  const handleCreatePO = async () => {
    if (!selectedSupplierId) { toast.error("Please select or add a supplier"); return; }
    if (purchaseItems.length === 0) { toast.error("Add at least one item"); return; }
    const supplier = allSuppliers.find((s) => s.id === selectedSupplierId)!;
    const invalidItem = purchaseItems.find((item) => !item.productName.trim() || item.productName.trim().length > 200 || item.quantity <= 0 || item.unitCost < 0);
    if (supplier.name.trim().length > 200) { toast.error("Supplier name must be 200 characters or less"); return; }
    if (invalidItem) {
      toast.error("Item name must be 1-200 characters and quantity/cost must be valid");
      return;
    }
    try {
      const created = await purchasesApi.create({
        supplier_id: isNaN(Number(selectedSupplierId)) ? null : Number(selectedSupplierId),
        supplier_name: cleanMax(supplier.name),
        total: newPOTotal,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        items: purchaseItems.map((i) => ({
          product_id: i.isCustom || isNaN(Number(i.productId)) ? null : Number(i.productId),
          product_name: cleanMax(i.productName),
          quantity: Math.max(1, Math.trunc(i.quantity)),
          cost: Number((Math.max(1, Math.trunc(i.quantity)) * Math.max(0, i.unitCost)).toFixed(2)),
        })),
      });
      setAllPurchases([fromApiPurchase(created), ...allPurchases]);
      setPoCounter((c) => c + 1);
      resetCreateForm();
      toast.success(`Purchase Order #${created.id} created!`);
    } catch (err) { toast.error((err as Error).message); }
  };

  const resetCreateForm = () => {
    setCreateOpen(false);
    setPurchaseItems([]);
    setSelectedSupplierId("");
    setShowNewSupplier(false);
    setNewSupplier(emptyNewSupplier);
    setProductSearch("");
    setShowAllProducts(false);
    setCustomName("");
    setCustomQty("1");
    setCustomCost("");
  };

  // ── Receive PO ────────────────────────────────────────────────────────────
  const handleReceive = async (po: Purchase) => {
    try {
      const updated = await purchasesApi.receive(Number(po.id));
      setAllPurchases((prev) => prev.map((p) => p.id === po.id ? fromApiPurchase(updated) : p));
      // Refresh products to show updated stock
      productsApi.list().then((list) => setProducts(list.map(fromApiProduct))).catch(() => {});
      postInventoryPurchaseToAccounts(updated).catch(() => toast.warning("Purchase received, finance auto-entry pending"));
      const customCount = po.items.filter((i) => i.productId.startsWith("custom-")).length;
      toast.success(customCount > 0 ? `PO received! Stock updated for catalog items. ${customCount} custom item(s) noted.` : "PO received! Stock updated.");
    } catch (err) { toast.error((err as Error).message); }
    setDetailOpen(false);
  };

  const handleCancel = async (poId: string) => {
    try {
      const updated = await purchasesApi.cancel(Number(poId));
      setAllPurchases((prev) => prev.map((p) => p.id === poId ? fromApiPurchase(updated) : p));
      toast.info(`PO #${poId} cancelled.`);
    } catch (err) { toast.error((err as Error).message); }
    setDetailOpen(false);
  };

  const openDetail = (po: Purchase) => { setDetailPO(po); setDetailOpen(true); };
  const openCreate = () => { resetCreateForm(); setCreateOpen(true); };
  const handlePrintPO = (po: Purchase) => {
    const supplier = allSuppliers.find((entry) => entry.id === po.supplierId || entry.name === po.supplierName);
    const w = window.open("", "_blank", "width=900,height=900");
    if (!w) return;
    w.document.write(generatePurchaseOrderHTML(po, supplier, settings));
    w.document.close();
    w.setTimeout(() => w.print(), 300);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Purchases</h1>
          <p className="page-description">Create purchase orders and receive stock from suppliers</p>
        </div>
        <Button onClick={openCreate} className="h-11 shrink-0 rounded-xl px-4 font-semibold shadow-sm sm:px-5">
          <Plus className="w-4 h-4" />
          <span>New Purchase</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Spent" value={`Rs. ${totalSpent.toFixed(2)}`} icon={<Banknote className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard title="Pending Orders" value={pendingCount} icon={<Clock className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Received Orders" value={receivedCount} icon={<PackageCheck className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by supplier, PO #, or product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* PO List */}
      <Card>
        <CardHeader><CardTitle className="text-base">Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">

          {/* Mobile card view */}
          <div className="sm:hidden divide-y">
            {filteredPOs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No purchase orders found</p>
            ) : filteredPOs.map((po) => (
              <div key={po.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-primary text-sm">#{po.id.slice(2)}</span>
                  <Badge variant="outline" className={cn("text-xs flex items-center gap-1", statusBadgeClass[po.status])}>
                    {statusIcon[po.status]}{po.status}
                  </Badge>
                </div>
                <p className="font-medium text-sm">{po.supplierName}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {po.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{po.date}</span>
                  <span className="font-bold text-sm">Rs. {po.total.toFixed(2)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2 text-sm" onClick={() => openDetail(po)}>
                    <Eye className="w-3.5 h-3.5" />View
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl gap-2 px-3 text-sm" onClick={() => handlePrintPO(po)}>
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                  {po.status === "pending" && (
                    <>
                      <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2 text-sm text-success border-success/30" onClick={() => handleReceive(po)}>
                        <CheckCircle className="w-3.5 h-3.5" />Receive
                      </Button>
                      <Button variant="outline" className="h-10 rounded-xl gap-2 px-3 text-sm text-destructive border-destructive/30" onClick={() => handleCancel(po.id)}>
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto p-6 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No purchase orders found</TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm">#{po.id.slice(2)}</TableCell>
                    <TableCell className="font-medium text-sm">{po.supplierName}</TableCell>
                    <TableCell className="text-sm max-w-[160px] sm:max-w-xs truncate">
                      {po.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-sm">{po.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs flex items-center gap-1 w-fit", statusBadgeClass[po.status])}>
                        {statusIcon[po.status]}{po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">Rs. {po.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openDetail(po)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handlePrintPO(po)} title="Print PO">
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      {po.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-success" onClick={() => handleReceive(po)} title="Mark Received">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => handleCancel(po.id)} title="Cancel">
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create PO Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetCreateForm(); else setCreateOpen(true); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5" /> New Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">

            {/* ══ SUPPLIER SECTION ══════════════════════════════════════════ */}
            <div className="space-y-3">

              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Supplier</span>
                </div>

                {!showNewSupplier && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewSupplier(true);
                      setShowAllProducts(true);
                      setSelectedSupplierId("");
                    }}
                    className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Supplier
                  </Button>
                )}
              </div>

              {/* Existing supplier select */}
              {!showNewSupplier && (
                <div className="space-y-2">
                  <Select
                    value={selectedSupplierId}
                    onValueChange={(v) => {
                      setSelectedSupplierId(v);
                      setShowAllProducts(false);
                      setProductSearch("");
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select an existing supplier…" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="font-medium">{s.name}</span>
                          {s.phone && (
                            <span className="ml-2 text-xs text-muted-foreground">{s.phone}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected supplier info card */}
                  {selectedSupplier && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <TruckIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold leading-tight">{selectedSupplier.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {selectedSupplier.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3 shrink-0" />
                              {selectedSupplier.phone}
                            </span>
                          )}
                          {selectedSupplier.email && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3 shrink-0" />
                              {selectedSupplier.email}
                            </span>
                          )}
                          {selectedSupplier.address && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {selectedSupplier.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Add new supplier form ── */}
              {showNewSupplier && (
                <div className="rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-4">
                  {/* Form header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">New Supplier</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowNewSupplier(false); setNewSupplier(emptyNewSupplier); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-muted"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>

                  {/* Fields */}
                  <div className="space-y-3">
                    {/* Business name — full width */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        Business Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. ABC Traders"
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                        className="h-9 bg-background"
                        onKeyDown={(e) => e.key === "Enter" && handleAddSupplier()}
                      />
                    </div>

                    {/* Phone + Email side by side on sm+ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-muted-foreground" /> Phone
                        </Label>
                        <Input
                          placeholder="+977-98XXXXXXXX"
                          value={newSupplier.phone}
                          onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                          className="h-9 bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-muted-foreground" /> Email
                        </Label>
                        <Input
                          placeholder="supplier@email.com"
                          value={newSupplier.email}
                          onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                          className="h-9 bg-background"
                        />
                      </div>
                    </div>

                    {/* Address — full width */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" /> Address
                      </Label>
                      <Input
                        placeholder="City, Street…"
                        value={newSupplier.address}
                        onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                        className="h-9 bg-background"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <Button onClick={handleAddSupplier} className="w-full gap-2 h-10">
                    <CheckCircle className="w-4 h-4" />
                    Add Supplier &amp; Continue
                  </Button>
                </div>
              )}
            </div>

            {/* ══ PRODUCT PICKER ════════════════════════════════════════════ */}
            {selectedSupplierId && !showNewSupplier && (
              <div className="space-y-3">
                {/* Header with toggle pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-inventory/10 flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-inventory" />
                    </div>
                    <span className="text-sm font-semibold">Add Products</span>
                  </div>

                  {/* Toggle pill */}
                  <button
                    type="button"
                    onClick={() => { setShowAllProducts((v) => !v); setProductSearch(""); }}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors",
                      showAllProducts
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    {showAllProducts ? <LayoutGrid className="w-3 h-3" /> : <LayoutList className="w-3 h-3" />}
                    {showAllProducts ? "All products" : "Supplier only"}
                  </button>
                </div>

                {/* Product search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                  {pickerProducts.map((product) => {
                    const inOrder = purchaseItems.some((i) => i.productId === product.id);
                    const isLinked = selectedSupplier ? product.supplierId === selectedSupplier.id : false;
                    return (
                      <button
                        key={product.id}
                        onClick={() => addProductToOrder(product)}
                        className={cn(
                          "flex flex-col items-start p-2.5 rounded-lg border text-left transition-all hover:shadow-md bg-card min-w-0 w-full",
                          inOrder ? "border-primary/60 bg-primary/5" : "hover:border-primary/40"
                        )}
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-10 object-cover rounded mb-1.5" />
                        ) : (
                          <div className="w-full h-10 rounded mb-1.5 bg-muted flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex items-start justify-between w-full gap-1">
                          <span className="text-xs font-medium line-clamp-2 flex-1">{product.name}</span>
                          {!isLinked && showAllProducts && (
                            <Badge variant="secondary" className="text-[9px] shrink-0 px-1">other</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">Rs. {product.costPrice.toFixed(2)}</span>
                        {inOrder && <span className="text-[10px] text-primary font-medium mt-0.5">✓ added</span>}
                      </button>
                    );
                  })}
                  {pickerProducts.length === 0 && (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-6">
                      {productSearch
                        ? "No products match your search."
                        : "No products linked to this supplier — toggle \"Show all\" or add a custom item below."}
                    </div>
                  )}
                </div>

                {/* ── Custom / one-off item ── */}
                <div className="rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Custom / one-off item</p>
                  </div>

                  <div className="px-3 pb-3 space-y-2">
                    {/* Item name — full width on all sizes */}
                    <Input
                      placeholder="Item name (e.g. Office Supplies)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="h-9 text-sm w-full"
                      onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
                    />

                    {/* Qty + Cost always side by side */}
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-muted-foreground font-medium block">Quantity</label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="1"
                          value={customQty}
                          onChange={(e) => setCustomQty(e.target.value)}
                          className="h-9 text-sm w-full"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-muted-foreground font-medium block">Unit Cost (Rs. )</label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={customCost}
                          onChange={(e) => setCustomCost(e.target.value)}
                          className="h-9 text-sm w-full"
                          onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
                        />
                      </div>
                    </div>

                    {/* Full-width Add button */}
                    <Button
                      variant="outline"
                      onClick={addCustomItem}
                      className="w-full h-11 rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      Add Custom Item
                    </Button>

                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Custom items are recorded in the PO but won't update catalog stock on receipt.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Order items list ── */}
            {purchaseItems.length > 0 && (
              <div className="space-y-2">
                <Label>Order Items ({purchaseItems.length})</Label>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {purchaseItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        {item.isCustom && <span className="text-[10px] text-muted-foreground">custom item</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-muted-foreground block">Qty</label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItemQty(item.productId, parseInt(e.target.value) || 0)}
                            className="h-10 w-16 rounded-lg text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-muted-foreground block">Unit Rs. </label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitCost}
                            onChange={(e) => updateItemCost(item.productId, parseFloat(e.target.value) || 0)}
                            className="h-10 w-24 rounded-lg text-sm"
                          />
                        </div>
                        <div className="text-right min-w-[58px]">
                          <p className="text-[10px] text-muted-foreground">Subtotal</p>
                          <p className="text-sm font-semibold">Rs. {(item.quantity * item.unitCost).toFixed(2)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => removeItem(item.productId)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">Rs. {newPOTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full h-11 rounded-xl"
              onClick={handleCreatePO}
              disabled={purchaseItems.length === 0 || !selectedSupplierId}
            >
              <TruckIcon className="w-4 h-4 mr-2" />
              Create Purchase Order — Rs. {newPOTotal.toFixed(2)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5" /> Purchase Order #{detailPO?.id.slice(2)}
            </DialogTitle>
          </DialogHeader>
          {detailPO && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{detailPO.supplierName}</p>
                  <p className="text-xs text-muted-foreground">{detailPO.date}</p>
                </div>
                <Badge variant="outline" className={cn("flex items-center gap-1", statusBadgeClass[detailPO.status])}>
                  {statusIcon[detailPO.status]}{detailPO.status}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2">
                {detailPO.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <span>{item.quantity}× {item.productName}</span>
                      {item.productId.startsWith("custom-") && (
                        <span className="ml-2 text-[10px] text-muted-foreground bg-muted rounded px-1">custom</span>
                      )}
                    </div>
                    <span className="font-medium">Rs. {item.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rs. {detailPO.total.toFixed(2)}</span>
              </div>
              <Button variant="outline" className="h-11 w-full rounded-xl gap-2" onClick={() => handlePrintPO(detailPO)}>
                <Printer className="w-4 h-4" /> Print Purchase Order
              </Button>
              {detailPO.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="h-11 flex-1 rounded-xl" onClick={() => handleReceive(detailPO)}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Receive & Update Stock
                  </Button>
                  <Button variant="destructive" className="h-11 flex-1 rounded-xl" onClick={() => handleCancel(detailPO.id)}>
                    <Ban className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchasesPage;

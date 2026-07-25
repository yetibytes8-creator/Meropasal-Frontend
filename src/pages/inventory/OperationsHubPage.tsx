import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import {
  alertsApi,
  branches as branchesApi,
  customers as customersApi,
  getSelectedBranchId,
  products as productsApi,
  purchases as purchasesApi,
  saleReturns as saleReturnsApi,
  sales as salesApi,
  setSelectedBranchId,
  staff as staffApi,
  stockAdjustments as stockAdjustmentsApi,
  type ApiSaleReturn,
  type ApiStockAdjustment,
} from "@/lib/api";
import { fromApiAlert, fromApiCustomer, fromApiProduct, fromApiPurchase, fromApiSale, fromApiStaff } from "@/lib/transforms";
import type { Alert, Customer, Product, Purchase, Sale, Staff } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  CalendarCheck,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Truck,
  Wrench,
} from "lucide-react";

type ProductRow = Product & {
  branchId?: string;
  branchName?: string;
};

type BranchLite = {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  active: boolean;
};

type ServiceRow = {
  ticket: string;
  customerId?: string;
  customer: string;
  device: string;
  issue: string;
  assigned: string;
  charge?: number;
  paidAmount?: number;
  paymentStatus?: "paid" | "credit";
  status: "received" | "diagnosis" | "ready";
  createdAt: string;
};

const SERVICE_KEY = "mp_inventory_service_tickets";

const statusTone: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  received: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-success/10 text-success border-success/20",
  refunded: "bg-destructive/10 text-destructive border-destructive/20",
  increase: "bg-success/10 text-success border-success/20",
  decrease: "bg-info/10 text-info border-info/20",
  damage: "bg-destructive/10 text-destructive border-destructive/20",
  return: "bg-success/10 text-success border-success/20",
  correction: "bg-muted text-muted-foreground border-border",
  in_stock: "bg-success/10 text-success border-success/20",
  low_stock: "bg-warning/10 text-warning border-warning/20",
  out_of_stock: "bg-destructive/10 text-destructive border-destructive/20",
  received_service: "bg-info/10 text-info border-info/20",
  diagnosis: "bg-warning/10 text-warning border-warning/20",
  ready: "bg-success/10 text-success border-success/20",
};

function formatMoney(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function daysUntil(value?: string) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(value);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

function expiryState(days: number | null) {
  if (days === null) return { label: "No expiry", className: "bg-muted text-muted-foreground border-border" };
  if (days < 0) return { label: `Expired ${Math.abs(days)}d`, className: "bg-red-50 text-red-700 border-red-200" };
  if (days === 0) return { label: "Expires today", className: "bg-red-50 text-red-700 border-red-200" };
  if (days <= 30) return { label: `${days}d left`, className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: `${days}d left`, className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

function makeBranchName(branches: BranchLite[], branchId?: string | null, fallback?: string | null) {
  if (fallback) return fallback;
  if (!branchId || branchId === "all") return "Primary Branch";
  return branches.find((branch) => branch.id === branchId)?.name || "Branch";
}

function readServiceRows(): ServiceRow[] {
  try {
    const stored = localStorage.getItem(SERVICE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function OperationsHubPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [adjustments, setAdjustments] = useState<ApiStockAdjustment[]>([]);
  const [returns, setReturns] = useState<ApiSaleReturn[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>(readServiceRows);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [serialSearch, setSerialSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({
    productId: "",
    fromBranch: "",
    toBranch: "",
    quantity: "1",
    note: "",
  });
  const [serviceForm, setServiceForm] = useState({
    customerId: "walk-in",
    customer: "",
    device: "",
    issue: "",
    assigned: "",
    charge: "",
    paymentStatus: "credit",
    paidAmount: "",
  });

  const loadHubData = async () => {
    setLoading(true);
    const previousBranch = getSelectedBranchId();
    setSelectedBranchId("all");
    try {
      const [
        productRows,
        staffRows,
        branchRows,
        purchaseRows,
        saleRows,
        customerRows,
        adjustmentRows,
        returnRows,
        alertRows,
      ] = await Promise.allSettled([
        productsApi.list(),
        staffApi.list(),
        branchesApi.list(),
        purchasesApi.list(),
        salesApi.list(),
        customersApi.list(),
        stockAdjustmentsApi.list(),
        saleReturnsApi.list(),
        alertsApi.list(),
      ]);

      let nextBranches: BranchLite[] = [];
      if (branchRows.status === "fulfilled") {
        nextBranches = branchRows.value.map((branch) => ({
          id: String(branch.id),
          name: branch.name,
          code: branch.code,
          address: branch.address,
          manager: branch.manager_name || "Not assigned",
          active: branch.is_active,
        }));
        setBranches(nextBranches);
      }

      if (productRows.status === "fulfilled") {
        setProducts(productRows.value.map((product) => ({
          ...fromApiProduct(product),
          branchId: product.branch_id ? String(product.branch_id) : "all",
          branchName: makeBranchName(nextBranches, product.branch_id ? String(product.branch_id) : "all", product.branch_name),
        })));
      }
      if (staffRows.status === "fulfilled") setStaff(staffRows.value.map(fromApiStaff));
      if (purchaseRows.status === "fulfilled") setPurchases(purchaseRows.value.map(fromApiPurchase));
      if (saleRows.status === "fulfilled") setSales(saleRows.value.map(fromApiSale));
      if (customerRows.status === "fulfilled") setCustomers(customerRows.value.map(fromApiCustomer));
      if (adjustmentRows.status === "fulfilled") setAdjustments(adjustmentRows.value);
      if (returnRows.status === "fulfilled") setReturns(returnRows.value);
      if (alertRows.status === "fulfilled") setAlerts(alertRows.value.map(fromApiAlert));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation Hub data load failed");
    } finally {
      setSelectedBranchId(previousBranch);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHubData();
  }, []);

  useEffect(() => {
    localStorage.setItem(SERVICE_KEY, JSON.stringify(serviceRows));
  }, [serviceRows]);

  useEffect(() => {
    if (!transferForm.productId && products[0]) {
      setTransferForm((current) => ({ ...current, productId: products[0].id }));
    }
    if (!transferForm.fromBranch && branches[0]) {
      setTransferForm((current) => ({ ...current, fromBranch: branches[0].id }));
    }
    if (!transferForm.toBranch && branches[1]) {
      setTransferForm((current) => ({ ...current, toBranch: branches[1].id }));
    }
  }, [products, branches, transferForm.productId, transferForm.fromBranch, transferForm.toBranch]);

  const visibleProducts = useMemo(() => {
    if (selectedBranch === "all") return products;
    return products.filter((product) => product.branchId === selectedBranch);
  }, [products, selectedBranch]);

  const stockValue = visibleProducts.reduce((sum, product) => sum + product.stock * product.costPrice, 0);
  const lowStock = visibleProducts.filter((product) => product.stock > 0 && product.stock <= product.minStock).length;
  const outStock = visibleProducts.filter((product) => product.stock <= 0).length;
  const activeStaff = staff.filter((member) => member.status === "active").length;
  const pendingPurchases = purchases.filter((purchase) => purchase.status === "pending").length;
  const unreadAlerts = alerts.filter((alert) => !alert.read).length;
  const expiryRisk = visibleProducts.filter((product) => {
    const days = daysUntil(product.expiryDate);
    return days !== null && days <= 30;
  }).length;
  const activeBranches = branches.filter((branch) => branch.active);
  const branchCount = activeBranches.length || (products.length ? 1 : 0);

  const branchRows = useMemo(() => {
    if (!branches.length) {
      return [{
        id: "all",
        name: "Primary Branch",
        code: "MAIN",
        address: "Default stock pool",
        manager: "Owner",
        active: true,
        products: products.length,
        qty: products.reduce((sum, product) => sum + product.stock, 0),
        value: products.reduce((sum, product) => sum + product.stock * product.costPrice, 0),
        alerts: products.filter((product) => product.stock <= product.minStock).length,
      }];
    }

    return branches.map((branch) => {
      const branchProducts = products.filter((product) => product.branchId === branch.id);
      return {
        ...branch,
        products: branchProducts.length,
        qty: branchProducts.reduce((sum, product) => sum + product.stock, 0),
        value: branchProducts.reduce((sum, product) => sum + product.stock * product.costPrice, 0),
        alerts: branchProducts.filter((product) => product.stock <= product.minStock).length,
      };
    });
  }, [branches, products]);

  const transferRows = adjustments
    .filter((adjustment) => adjustment.reference?.startsWith("TRF-"))
    .slice(0, 20);

  const serialRows = useMemo(() => {
    const q = serialSearch.trim().toLowerCase();
    return visibleProducts
      .filter((product) => !q || [product.name, product.sku, product.category, product.branchName].some((value) => (value || "").toLowerCase().includes(q)))
      .slice(0, 40);
  }, [visibleProducts, serialSearch]);

  const recentMovements = adjustments.slice(0, 8);
  const recentSales = sales.slice(0, 6);
  const recentReturns = returns.slice(0, 8);
  const serviceCreditDue = serviceRows.reduce((sum, row) => {
    const charge = row.charge || 0;
    const paid = row.paidAmount || 0;
    return row.paymentStatus === "credit" ? sum + Math.max(charge - paid, 0) : sum;
  }, 0);
  const expiryRows = useMemo(() => {
    return visibleProducts
      .filter((product) => product.expiryDate)
      .map((product) => ({ ...product, daysLeft: daysUntil(product.expiryDate) }))
      .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));
  }, [visibleProducts]);

  const updateTransferForm = (field: keyof typeof transferForm, value: string) => {
    setTransferForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateTransfer = async () => {
    const product = products.find((item) => item.id === transferForm.productId);
    const quantity = Number(transferForm.quantity);
    if (!product) {
      toast.error("Please select product");
      return;
    }
    if (!transferForm.fromBranch || !transferForm.toBranch) {
      toast.error("Please select source and destination branch");
      return;
    }
    if (transferForm.fromBranch === transferForm.toBranch) {
      toast.error("Source and destination branch must be different");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    if (product.stock < quantity) {
      toast.error(`${product.name} has only ${product.stock} in stock`);
      return;
    }

    const previousBranch = getSelectedBranchId();
    const reference = `TRF-${Date.now()}`;
    const fromName = makeBranchName(branches, transferForm.fromBranch);
    const toName = makeBranchName(branches, transferForm.toBranch);
    const note = transferForm.note.trim();
    setSavingTransfer(true);
    try {
      setSelectedBranchId(transferForm.fromBranch);
      await stockAdjustmentsApi.create({
        product_id: Number(product.id),
        adjustment_type: "decrease",
        quantity,
        reference,
        reason: `Transfer out: ${fromName} to ${toName}${note ? ` - ${note}` : ""}`,
      });
      setSelectedBranchId(transferForm.toBranch);
      await stockAdjustmentsApi.create({
        product_id: Number(product.id),
        adjustment_type: "increase",
        quantity,
        reference,
        reason: `Transfer in: ${fromName} to ${toName}${note ? ` - ${note}` : ""}`,
      });
      toast.success(`${product.name} transfer recorded`);
      setTransferForm((current) => ({ ...current, quantity: "1", note: "" }));
      await loadHubData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setSelectedBranchId(previousBranch);
      setSavingTransfer(false);
    }
  };

  const handleAddServiceTicket = () => {
    if (!serviceForm.customer.trim() || !serviceForm.device.trim() || !serviceForm.issue.trim()) {
      toast.error("Customer, device, and issue are required");
      return;
    }
    const charge = Number(serviceForm.charge || 0);
    const paidAmount = serviceForm.paymentStatus === "paid" ? charge : Number(serviceForm.paidAmount || 0);
    if (!Number.isFinite(charge) || charge < 0) {
      toast.error("Service charge cannot be negative");
      return;
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      toast.error("Paid amount cannot be negative");
      return;
    }
    if (paidAmount > charge) {
      toast.error("Paid amount cannot be higher than service charge");
      return;
    }
    const ticket: ServiceRow = {
      ticket: `SRV-${Date.now().toString().slice(-6)}`,
      customerId: serviceForm.customerId,
      customer: serviceForm.customer.trim(),
      device: serviceForm.device.trim(),
      issue: serviceForm.issue.trim(),
      assigned: serviceForm.assigned.trim() || "Unassigned",
      charge,
      paidAmount,
      paymentStatus: serviceForm.paymentStatus as ServiceRow["paymentStatus"],
      status: "received",
      createdAt: new Date().toISOString(),
    };
    setServiceRows((rows) => [ticket, ...rows]);
    setServiceForm({ customerId: "walk-in", customer: "", device: "", issue: "", assigned: "", charge: "", paymentStatus: "credit", paidAmount: "" });
    toast.success("Service ticket added");
  };

  const handleSelectServiceCustomer = (value: string) => {
    if (value === "walk-in") {
      setServiceForm((current) => ({ ...current, customerId: value, customer: "" }));
      return;
    }
    const selected = customers.find((customer) => customer.id === value);
    setServiceForm((current) => ({
      ...current,
      customerId: value,
      customer: selected ? selected.name : current.customer,
    }));
  };

  const changeServiceStatus = (ticket: string, status: ServiceRow["status"]) => {
    setServiceRows((rows) => rows.map((row) => row.ticket === ticket ? { ...row, status } : row));
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 text-[13px] md:pb-0">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-6 border-white/20 bg-white/15 px-2 text-[12px] text-white shadow-none">Operations</Badge>
              <Badge className="h-6 border-white/20 bg-white/10 px-2 text-[12px] text-white shadow-none">{selectedBranch === "all" ? "All branches" : makeBranchName(branches, selectedBranch)}</Badge>
            </div>
            <div>
              <h1 className="text-[22px] font-black tracking-tight">Inventory Operations Hub</h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-5 text-white/75">
                Branch stock, transfer, purchase follow-up, sales return, warranty and service workflow ekai thau bata control garne.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                <p className="text-[12px] uppercase text-white/65">Stock value</p>
                <p className="mt-1 text-[15px] font-black">{formatMoney(stockValue)}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                <p className="text-[12px] uppercase text-white/65">Active branches</p>
                <p className="mt-1 text-[15px] font-black">{branchCount}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                <p className="text-[12px] uppercase text-white/65">Staff online</p>
                <p className="mt-1 text-[15px] font-black">{activeStaff}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/95 p-3 text-foreground shadow-lg">
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label className="text-[13px]">Branch view</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {activeBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={loadHubData} disabled={loading} className="h-10 text-[13px]">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button asChild className="h-10 text-[13px]">
                  <Link to="/inventory/branches">
                    <GitBranch className="h-4 w-4" />
                    Branches
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                  <AlertTriangle className="mx-auto h-4 w-4" />
                  <p className="mt-1 text-[15px] font-black">{lowStock}</p>
                  <p className="text-[12px]">Low</p>
                </div>
                <div className="rounded-xl bg-red-50 p-2 text-red-700">
                  <PackageCheck className="mx-auto h-4 w-4" />
                  <p className="mt-1 text-[15px] font-black">{outStock}</p>
                  <p className="text-[12px]">Out</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <CalendarCheck className="mx-auto h-4 w-4" />
                  <p className="mt-1 text-[15px] font-black">{expiryRisk}</p>
                  <p className="text-[12px]">Expiry</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6 [&_.text-2xl]:text-[15px]">
        <StatCard title="Branches" value={branchCount} icon={<GitBranch className="h-5 w-5" />} iconClassName="bg-emerald-50 text-emerald-700" />
        <StatCard title="Stock Value" value={formatMoney(stockValue)} icon={<Boxes className="h-5 w-5" />} iconClassName="bg-emerald-50 text-emerald-700" />
        <StatCard title="Low Stock" value={lowStock} icon={<AlertTriangle className="h-5 w-5" />} iconClassName="bg-amber-50 text-amber-700" />
        <StatCard title="Out Stock" value={outStock} icon={<PackageCheck className="h-5 w-5" />} iconClassName="bg-red-50 text-red-700" />
        <StatCard title="Pending PO" value={pendingPurchases} icon={<Truck className="h-5 w-5" />} iconClassName="bg-emerald-50 text-emerald-700" />
        <StatCard title="Service Credit" value={formatMoney(serviceCreditDue)} icon={<ShieldCheck className="h-5 w-5" />} iconClassName="bg-red-50 text-red-700" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden rounded-2xl border-emerald-100 shadow-sm">
          <CardHeader className="gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700"><GitBranch className="h-4 w-4" /></span>
                Branch Stock Position
              </CardTitle>
              <CardDescription className="text-[13px]">Live stock by branch, value, and low-stock risk</CardDescription>
            </div>
            <Button variant="outline" asChild className="h-9 text-[13px]">
              <Link to="/inventory/stock-control">
                <FileSearch className="h-4 w-4" />
                Stock Ledger
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="min-w-[220px]">Branch</TableHead>
                    <TableHead className="min-w-[150px]">Manager</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Alerts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchRows.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <div className="font-semibold">{branch.name}</div>
                        <div className="text-[13px] text-muted-foreground">{branch.code} - {branch.address || "Address not set"}</div>
                      </TableCell>
                      <TableCell>{branch.manager}</TableCell>
                      <TableCell>{branch.products}</TableCell>
                      <TableCell>{branch.qty}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{formatMoney(branch.value)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={branch.alerts ? statusTone.low_stock : statusTone.in_stock}>
                          {branch.alerts}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-emerald-100 shadow-sm">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <span className="rounded-lg bg-red-50 p-1.5 text-red-700"><ClipboardCheck className="h-4 w-4" /></span>
              Operation Shortcuts
            </CardTitle>
            <CardDescription className="text-[13px]">Daily retail workflow ekai thau bata</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0">
            {[
              { title: "Products", detail: "Add item, SKU, barcode, image", url: "/inventory/products", icon: Boxes },
              { title: "Purchase Order", detail: "Supplier bill, PO receive, stock add", url: "/inventory/purchases", icon: Truck },
              { title: "Sales POS", detail: "Billing, discount, payment, refund", url: "/inventory/pos", icon: ShoppingCart },
              { title: "Customers", detail: "Customer sale history and dues", url: "/inventory/customers", icon: Smartphone },
              { title: "Alerts", detail: "Low stock and system warnings", url: "/inventory/alerts", icon: AlertTriangle },
            ].map((item) => (
              <Button key={item.title} variant="outline" asChild className="h-auto justify-start rounded-xl p-2.5 text-left hover:border-emerald-200 hover:bg-emerald-50">
                <Link to={item.url}>
                  <item.icon className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    <span className="block text-[13px] font-normal text-muted-foreground">{item.detail}</span>
                  </span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfer" className="space-y-3">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-4 lg:w-auto lg:grid-cols-7">
          <TabsTrigger value="transfer" className="h-8 text-[13px]">Transfers</TabsTrigger>
          <TabsTrigger value="stock" className="h-8 text-[13px]">Movements</TabsTrigger>
          <TabsTrigger value="expiry" className="h-8 text-[13px]">Expiry</TabsTrigger>
          <TabsTrigger value="serial" className="h-8 text-[13px]">Serials</TabsTrigger>
          <TabsTrigger value="service" className="h-8 text-[13px]">Service</TabsTrigger>
          <TabsTrigger value="returns" className="h-8 text-[13px]">Returns</TabsTrigger>
          <TabsTrigger value="approvals" className="h-8 text-[13px]">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer">
          <div className="grid gap-3 xl:grid-cols-[0.9fr_1.4fr]">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">New Branch Transfer</CardTitle>
                <CardDescription className="text-[13px]">Source branch bata destination branch ma item movement record garne</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={transferForm.productId} onValueChange={(value) => updateTransferForm("productId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {product.stock} qty
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>From Branch</Label>
                    <Select value={transferForm.fromBranch} onValueChange={(value) => updateTransferForm("fromBranch", value)}>
                      <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>
                        {activeBranches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To Branch</Label>
                    <Select value={transferForm.toBranch} onValueChange={(value) => updateTransferForm("toBranch", value)}>
                      <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                      <SelectContent>
                        {activeBranches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                  <div className="space-y-2">
                    <Label>Qty</Label>
                    <Input type="number" min="1" value={transferForm.quantity} onChange={(event) => updateTransferForm("quantity", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Input value={transferForm.note} onChange={(event) => updateTransferForm("note", event.target.value)} placeholder="Counter refill, service desk, customer demand..." />
                  </div>
                </div>
                <Button className="h-10 w-full text-[13px]" onClick={handleCreateTransfer} disabled={savingTransfer || !products.length || activeBranches.length < 2}>
                  <Plus className="h-4 w-4" />
                  {savingTransfer ? "Saving Transfer..." : "Record Transfer"}
                </Button>
                {activeBranches.length < 2 && (
                  <p className="text-[13px] text-muted-foreground">Transfer chalna kam se kam 2 active branch chahincha.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">Transfer Ledger</CardTitle>
                <CardDescription className="text-[13px]">All transfer out/in entries with branch and reference</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.reference}</TableCell>
                        <TableCell>{row.product_name}</TableCell>
                        <TableCell>{row.branch_name || "Primary Branch"}</TableCell>
                        <TableCell><Badge variant="outline" className={statusTone[row.adjustment_type]}>{statusLabel(row.adjustment_type)}</Badge></TableCell>
                        <TableCell>{Number(row.quantity)}</TableCell>
                        <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {!transferRows.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No transfer records yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">Recent Stock Movements</CardTitle>
                <CardDescription className="text-[13px]">POS sale, purchase receive, return, correction, damage and transfer entries</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Before/After</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMovements.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.product_name}</TableCell>
                        <TableCell><Badge variant="outline" className={statusTone[row.adjustment_type]}>{statusLabel(row.adjustment_type)}</Badge></TableCell>
                        <TableCell>{Number(row.quantity)}</TableCell>
                        <TableCell>{Number(row.stock_before)} &rarr; {Number(row.stock_after)}</TableCell>
                        <TableCell className="text-[13px]">{row.reference || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!recentMovements.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No stock movement yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">Low Stock Action Queue</CardTitle>
                <CardDescription className="text-[13px]">Reorder or adjust stock before sales stop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {visibleProducts
                  .filter((product) => product.stock <= product.minStock)
                  .slice(0, 8)
                  .map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-[13px] text-muted-foreground">SKU {product.sku || "-"} - Min {product.minStock}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={product.stock <= 0 ? statusTone.out_of_stock : statusTone.low_stock}>{product.stock} left</Badge>
                        <Button size="sm" variant="outline" asChild><Link to="/inventory/purchases">PO</Link></Button>
                      </div>
                    </div>
                  ))}
                {!visibleProducts.some((product) => product.stock <= product.minStock) && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-[13px] text-muted-foreground">No low stock item right now.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expiry">
          <div className="grid gap-3 xl:grid-cols-[1.25fr_0.8fr]">
            <Card className="overflow-hidden rounded-2xl border-amber-100 shadow-sm">
              <CardHeader className="gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-[15px]">
                    <span className="rounded-xl bg-amber-50 p-2 text-amber-700"><CalendarCheck className="h-4 w-4" /></span>
                    Expiry Stock Register
                  </CardTitle>
                  <CardDescription className="text-[13px]">Batch/expiry भएको saman first-expiry-first-out हिसाबले track garne</CardDescription>
                </div>
                <Button variant="outline" className="h-9 text-[13px]" asChild>
                  <Link to="/inventory/products">
                    <Plus className="h-4 w-4" />
                    Add batch item
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border bg-red-50 p-3 text-red-700">
                    <p className="text-[13px] uppercase">Expired</p>
                    <p className="text-[15px] font-black">{expiryRows.filter((row) => (row.daysLeft ?? 1) < 0).length}</p>
                  </div>
                  <div className="rounded-xl border bg-amber-50 p-3 text-amber-700">
                    <p className="text-[13px] uppercase">Within 30 days</p>
                    <p className="text-[15px] font-black">{expiryRows.filter((row) => (row.daysLeft ?? 999) >= 0 && (row.daysLeft ?? 999) <= 30).length}</p>
                  </div>
                  <div className="rounded-xl border bg-emerald-50 p-3 text-emerald-700">
                    <p className="text-[13px] uppercase">Tracked batches</p>
                    <p className="text-[15px] font-black">{expiryRows.length}</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="min-w-[220px]">Item</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiryRows.map((product) => {
                        const state = expiryState(product.daysLeft);
                        const action = product.daysLeft !== null && product.daysLeft < 0
                          ? "Block sale / supplier return"
                          : product.daysLeft !== null && product.daysLeft <= 30
                            ? "Discount / return soon"
                            : "FEFO sell";
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="font-semibold">{product.name}</div>
                              <div className="text-[13px] text-muted-foreground">SKU {product.sku || "-"} - {product.category || "No category"}</div>
                            </TableCell>
                            <TableCell>{product.batchNumber || "-"}</TableCell>
                            <TableCell>{product.expiryDate || "-"}</TableCell>
                            <TableCell>{product.stock} {product.unit || "pcs"}</TableCell>
                            <TableCell>{product.branchName || "Primary Branch"}</TableCell>
                            <TableCell><Badge variant="outline" className={state.className}>{state.label}</Badge></TableCell>
                            <TableCell className="text-right text-[13px] font-medium">{action}</TableCell>
                          </TableRow>
                        );
                      })}
                      {!expiryRows.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            Expiry tracked product chaina. Pharmacy, grocery, cosmetics, food item add garda expiry date rakhnus.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-emerald-100 shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">Expiry Return Flow</CardTitle>
                <CardDescription className="text-[13px]">Kasari handle garne clear process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {[
                  ["1. Receive with batch", "Purchase receive garda batch no, expiry date, supplier bill no rakhne."],
                  ["2. Warning before sale", "30 days bhitra expiry cha bhane warning, expired cha bhane sale block/check."],
                  ["3. Supplier return", "Expired/damaged supplier lai firta garne ho bhane purchase return/debit note banne."],
                  ["4. Write-off", "Supplier return namilne saman damage/expiry loss entry garne, stock ghatne, finance ma expense jancha."],
                  ["5. Customer return", "Customer le expired saman firta gare refund/exchange sales return bata garne."],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-xl border p-3">
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{detail}</p>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" className="h-9 text-[13px]" asChild>
                    <Link to="/inventory/purchases">Supplier return</Link>
                  </Button>
                  <Button className="h-9 text-[13px]" asChild>
                    <Link to="/inventory/sales">Customer return</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="serial">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-[15px]">SKU / Serial / IMEI Register</CardTitle>
              <CardDescription className="text-[13px]">Current product register for barcode, SKU, warranty and stock trace</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <Label>Search SKU, IMEI, product, category</Label>
                  <Input value={serialSearch} onChange={(event) => setSerialSearch(event.target.value)} placeholder="IMEI, serial, SKU, model..." />
                </div>
                <div className="space-y-2">
                  <Label>Stock Status</Label>
                  <Select defaultValue="all">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU / Serial</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serialRows.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-[13px]">{product.sku || `SKU-${product.id}`}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell>{product.branchName || "Primary Branch"}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell><Badge variant="outline" className={statusTone[product.stockStatus || "in_stock"]}>{statusLabel(product.stockStatus || "in_stock")}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {!serialRows.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No matching product register found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service">
          <div className="grid gap-3 xl:grid-cols-[0.85fr_1.3fr]">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">New Service Ticket</CardTitle>
                <CardDescription className="text-[13px]">Repair, warranty claim, or installation job</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                  <div className="space-y-2">
                    <Label>Existing customer</Label>
                    <Select value={serviceForm.customerId} onValueChange={handleSelectServiceCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in / new customer</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer name</Label>
                    <Input
                      value={serviceForm.customer}
                      onChange={(event) => setServiceForm((current) => ({ ...current, customerId: "walk-in", customer: event.target.value }))}
                      placeholder="Customer name"
                    />
                  </div>
                </div>
                <Input value={serviceForm.device} onChange={(event) => setServiceForm((current) => ({ ...current, device: event.target.value }))} placeholder="Device / item" />
                <Input value={serviceForm.issue} onChange={(event) => setServiceForm((current) => ({ ...current, issue: event.target.value }))} placeholder="Issue / work detail" />
                <Input value={serviceForm.assigned} onChange={(event) => setServiceForm((current) => ({ ...current, assigned: event.target.value }))} placeholder="Assigned staff (optional)" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Service charge</Label>
                    <Input
                      inputMode="decimal"
                      value={serviceForm.charge}
                      onChange={(event) => setServiceForm((current) => ({ ...current, charge: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment</Label>
                    <Select value={serviceForm.paymentStatus} onValueChange={(value) => setServiceForm((current) => ({ ...current, paymentStatus: value, paidAmount: value === "paid" ? current.charge : current.paidAmount }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit / Due</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Paid amount</Label>
                    <Input
                      inputMode="decimal"
                      value={serviceForm.paymentStatus === "paid" ? serviceForm.charge : serviceForm.paidAmount}
                      disabled={serviceForm.paymentStatus === "paid"}
                      onChange={(event) => setServiceForm((current) => ({ ...current, paidAmount: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Due amount</span>
                    <span className="font-bold text-red-700">
                      {formatMoney(Math.max(Number(serviceForm.charge || 0) - Number(serviceForm.paymentStatus === "paid" ? serviceForm.charge || 0 : serviceForm.paidAmount || 0), 0))}
                    </span>
                  </div>
                </div>
                <Button className="h-10 w-full text-[13px]" onClick={handleAddServiceTicket}>
                  <Wrench className="h-4 w-4" />
                  Add Service Ticket
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">Repair / Service Jobs</CardTitle>
                <CardDescription className="text-[13px]">Received, diagnosis, ready and delivery workflow</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRows.map((job) => {
                      const charge = job.charge || 0;
                      const paidAmount = job.paidAmount || 0;
                      const dueAmount = job.paymentStatus === "credit" ? Math.max(charge - paidAmount, 0) : 0;
                      return (
                        <TableRow key={job.ticket}>
                          <TableCell className="font-medium">{job.ticket}</TableCell>
                          <TableCell>{job.customer}</TableCell>
                          <TableCell>{job.device}</TableCell>
                          <TableCell>{job.issue}</TableCell>
                          <TableCell>{job.assigned}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-[13px]">
                              <Badge variant="outline" className={dueAmount > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                                {dueAmount > 0 ? "Credit" : "Paid"}
                              </Badge>
                              <div className="text-[13px] text-muted-foreground">
                                Bill {formatMoney(charge)} / Paid {formatMoney(paidAmount)}
                              </div>
                              {dueAmount > 0 && <div className="font-semibold text-red-700">Due {formatMoney(dueAmount)}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select value={job.status} onValueChange={(value) => changeServiceStatus(job.ticket, value as ServiceRow["status"])}>
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="received">Received</SelectItem>
                                <SelectItem value="diagnosis">Diagnosis</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!serviceRows.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No service ticket yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="returns">
          <div className="grid gap-3 lg:grid-cols-3">
            {[
              { title: "Sales Return", icon: RotateCcw, text: "Customer return, refund, exchange, or restock record.", path: "/inventory/sales" },
              { title: "Exchange", icon: ArrowRightLeft, text: "Wrong item/size exchange and price difference handling.", path: "/inventory/sales" },
              { title: "Supplier Return", icon: Truck, text: "Damaged purchase item supplier lai return/debit note.", path: "/inventory/purchases" },
            ].map((item) => (
              <Card key={item.title} className="rounded-2xl shadow-sm">
                <CardHeader className="p-4">
                  <item.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-[15px]">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  <p className="text-[13px] leading-5 text-muted-foreground">{item.text}</p>
                  <Button variant="outline" className="h-9 text-[13px]" asChild><Link to={item.path}>Open</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-3 rounded-2xl shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-[15px]">Recent Returns</CardTitle>
              <CardDescription className="text-[13px]">Refund, exchange and damaged return records</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Refund</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReturns.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.product_name}</TableCell>
                      <TableCell><Badge variant="outline">{statusLabel(row.return_type)}</Badge></TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{formatMoney(Number(row.refund_amount || 0))}</TableCell>
                      <TableCell>{row.reason || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {!recentReturns.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No return records yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">Approval Rules</CardTitle>
                <CardDescription className="text-[13px]">Owner/manager control for multi-staff shop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {[
                  "Discount above 15% needs manager approval",
                  "Stock decrease/damage needs reason and approver",
                  "Purchase above Rs. 50,000 needs owner approval",
                  "Refund to bank/eSewa requires cashier and manager check",
                  "Branch transfer must be received by destination staff",
                ].map((rule) => (
                  <div key={rule} className="flex items-center gap-3 rounded-xl border p-3">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <span className="text-[13px]">{rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-[15px]">Business Control Summary</CardTitle>
                <CardDescription className="text-[13px]">Accountant/owner lai daily audit hints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-[13px] text-muted-foreground">Recent Sales</p>
                    <p className="text-[15px] font-black">{recentSales.length}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-[13px] text-muted-foreground">Stock Entries</p>
                    <p className="text-[15px] font-black">{adjustments.length}</p>
                  </div>
                </div>
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="font-medium">Sale #{sale.id}</p>
                      <p className="text-[13px] text-muted-foreground">{sale.items.length} items - {sale.paymentMethod}</p>
                    </div>
                    <Badge variant="outline" className={statusTone[sale.status]}>{formatMoney(sale.total)}</Badge>
                  </div>
                ))}
                {!recentSales.length && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-[13px] text-muted-foreground">No recent sales yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {loading && <p className="text-center text-[13px] text-muted-foreground">Loading live operation data...</p>}
      {!loading && products.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Boxes className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Operation Hub ready</p>
              <p className="text-[13px] text-muted-foreground">Products add garesi branch stock, transfer, serial register, and low stock queue live dekhinecha.</p>
            </div>
            <Button asChild><Link to="/inventory/products">Add Products</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


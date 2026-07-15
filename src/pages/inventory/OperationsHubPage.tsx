import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import {
  alertsApi,
  branches as branchesApi,
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
import { fromApiAlert, fromApiProduct, fromApiPurchase, fromApiSale, fromApiStaff } from "@/lib/transforms";
import type { Alert, Product, Purchase, Sale, Staff } from "@/types";
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
  ClipboardCheck,
  FileSearch,
  GitBranch,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
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
  customer: string;
  device: string;
  issue: string;
  assigned: string;
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
    customer: "",
    device: "",
    issue: "",
    assigned: "",
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
        adjustmentRows,
        returnRows,
        alertRows,
      ] = await Promise.allSettled([
        productsApi.list(),
        staffApi.list(),
        branchesApi.list(),
        purchasesApi.list(),
        salesApi.list(),
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
    const ticket: ServiceRow = {
      ticket: `SRV-${Date.now().toString().slice(-6)}`,
      customer: serviceForm.customer.trim(),
      device: serviceForm.device.trim(),
      issue: serviceForm.issue.trim(),
      assigned: serviceForm.assigned.trim() || "Unassigned",
      status: "received",
      createdAt: new Date().toISOString(),
    };
    setServiceRows((rows) => [ticket, ...rows]);
    setServiceForm({ customer: "", device: "", issue: "", assigned: "" });
    toast.success("Service ticket added");
  };

  const changeServiceStatus = (ticket: string, status: ServiceRow["status"]) => {
    setServiceRows((rows) => rows.map((row) => row.ticket === ticket ? { ...row, status } : row));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-header">Inventory Operations Hub</h1>
          <p className="page-description">Branch stock, transfer, purchase, sales return, warranty, and service workflow</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {activeBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadHubData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/inventory/branches">
              <GitBranch className="h-4 w-4" />
              Branches
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard title="Branches" value={branchCount} icon={<GitBranch className="h-5 w-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard title="Stock Value" value={formatMoney(stockValue)} icon={<Boxes className="h-5 w-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="Low Stock" value={lowStock} icon={<AlertTriangle className="h-5 w-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Out Stock" value={outStock} icon={<PackageCheck className="h-5 w-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard title="Pending PO" value={pendingPurchases} icon={<Truck className="h-5 w-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard title="Alerts" value={unreadAlerts} icon={<ShieldCheck className="h-5 w-5" />} iconClassName="bg-muted text-muted-foreground" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Branch Stock Position</CardTitle>
              <CardDescription>Live stock by branch, value, and low-stock risk</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/inventory/stock-control">
                <FileSearch className="h-4 w-4" />
                Stock Ledger
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Manager</TableHead>
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
                      <div className="font-medium">{branch.name}</div>
                      <div className="text-xs text-muted-foreground">{branch.code} - {branch.address || "Address not set"}</div>
                    </TableCell>
                    <TableCell>{branch.manager}</TableCell>
                    <TableCell>{branch.products}</TableCell>
                    <TableCell>{branch.qty}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(branch.value)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={branch.alerts ? statusTone.low_stock : statusTone.in_stock}>
                        {branch.alerts}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operation Shortcuts</CardTitle>
            <CardDescription>Daily retail workflow ekai thau bata</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              ["Products", "Add item, SKU, barcode, image", "/inventory/products"],
              ["Purchase Order", "Supplier bill, PO receive, stock add", "/inventory/purchases"],
              ["Sales POS", "Billing, discount, payment, refund", "/inventory/pos"],
              ["Customers", "Customer sale history and dues", "/inventory/customers"],
              ["Alerts", "Low stock and system warnings", "/inventory/alerts"],
            ].map(([title, detail, url]) => (
              <Button key={title} variant="outline" asChild className="h-auto justify-start p-3 text-left">
                <Link to={url}>
                  <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{detail}</span>
                  </span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfer" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="transfer">Transfers</TabsTrigger>
          <TabsTrigger value="stock">Movements</TabsTrigger>
          <TabsTrigger value="serial">Serials</TabsTrigger>
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
            <Card>
              <CardHeader>
                <CardTitle>New Branch Transfer</CardTitle>
                <CardDescription>Source branch bata destination branch ma item movement record garne</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <Button className="w-full" onClick={handleCreateTransfer} disabled={savingTransfer || !products.length || activeBranches.length < 2}>
                  <Plus className="h-4 w-4" />
                  {savingTransfer ? "Saving Transfer..." : "Record Transfer"}
                </Button>
                {activeBranches.length < 2 && (
                  <p className="text-xs text-muted-foreground">Transfer chalna kam se kam 2 active branch chahincha.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transfer Ledger</CardTitle>
                <CardDescription>All transfer out/in entries with branch and reference</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recent Stock Movements</CardTitle>
                <CardDescription>POS sale, purchase receive, return, correction, damage and transfer entries</CardDescription>
              </CardHeader>
              <CardContent>
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
                        <TableCell className="text-xs">{row.reference || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!recentMovements.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No stock movement yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Action Queue</CardTitle>
                <CardDescription>Reorder or adjust stock before sales stop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {visibleProducts
                  .filter((product) => product.stock <= product.minStock)
                  .slice(0, 8)
                  .map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">SKU {product.sku || "-"} - Min {product.minStock}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={product.stock <= 0 ? statusTone.out_of_stock : statusTone.low_stock}>{product.stock} left</Badge>
                        <Button size="sm" variant="outline" asChild><Link to="/inventory/purchases">PO</Link></Button>
                      </div>
                    </div>
                  ))}
                {!visibleProducts.some((product) => product.stock <= product.minStock) && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No low stock item right now.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="serial">
          <Card>
            <CardHeader>
              <CardTitle>SKU / Serial / IMEI Register</CardTitle>
              <CardDescription>Current product register for barcode, SKU, warranty and stock trace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
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
                      <TableCell className="font-mono text-xs">{product.sku || `SKU-${product.id}`}</TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service">
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.3fr]">
            <Card>
              <CardHeader>
                <CardTitle>New Service Ticket</CardTitle>
                <CardDescription>Repair, warranty claim, or installation job</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={serviceForm.customer} onChange={(event) => setServiceForm((current) => ({ ...current, customer: event.target.value }))} placeholder="Customer name" />
                <Input value={serviceForm.device} onChange={(event) => setServiceForm((current) => ({ ...current, device: event.target.value }))} placeholder="Device / item" />
                <Input value={serviceForm.issue} onChange={(event) => setServiceForm((current) => ({ ...current, issue: event.target.value }))} placeholder="Issue / work detail" />
                <Input value={serviceForm.assigned} onChange={(event) => setServiceForm((current) => ({ ...current, assigned: event.target.value }))} placeholder="Assigned staff (optional)" />
                <Button className="w-full" onClick={handleAddServiceTicket}>
                  <Wrench className="h-4 w-4" />
                  Add Service Ticket
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Repair / Service Jobs</CardTitle>
                <CardDescription>Received, diagnosis, ready and delivery workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRows.map((job) => (
                      <TableRow key={job.ticket}>
                        <TableCell className="font-medium">{job.ticket}</TableCell>
                        <TableCell>{job.customer}</TableCell>
                        <TableCell>{job.device}</TableCell>
                        <TableCell>{job.issue}</TableCell>
                        <TableCell>{job.assigned}</TableCell>
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
                    ))}
                    {!serviceRows.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No service ticket yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="returns">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { title: "Sales Return", icon: RotateCcw, text: "Customer return, refund, exchange, or restock record.", path: "/inventory/sales" },
              { title: "Exchange", icon: ArrowRightLeft, text: "Wrong item/size exchange and price difference handling.", path: "/inventory/sales" },
              { title: "Supplier Return", icon: Truck, text: "Damaged purchase item supplier lai return/debit note.", path: "/inventory/purchases" },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <item.icon className="h-5 w-5 text-primary" />
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                  <Button variant="outline" asChild><Link to={item.path}>Open</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Returns</CardTitle>
              <CardDescription>Refund, exchange and damaged return records</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Approval Rules</CardTitle>
                <CardDescription>Owner/manager control for multi-staff shop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Discount above 15% needs manager approval",
                  "Stock decrease/damage needs reason and approver",
                  "Purchase above Rs. 50,000 needs owner approval",
                  "Refund to bank/eSewa requires cashier and manager check",
                  "Branch transfer must be received by destination staff",
                ].map((rule) => (
                  <div key={rule} className="flex items-center gap-3 rounded-lg border p-3">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <span className="text-sm">{rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Business Control Summary</CardTitle>
                <CardDescription>Accountant/owner lai daily audit hints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Recent Sales</p>
                    <p className="text-xl font-bold">{recentSales.length}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Stock Entries</p>
                    <p className="text-xl font-bold">{adjustments.length}</p>
                  </div>
                </div>
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">Sale #{sale.id}</p>
                      <p className="text-xs text-muted-foreground">{sale.items.length} items - {sale.paymentMethod}</p>
                    </div>
                    <Badge variant="outline" className={statusTone[sale.status]}>{formatMoney(sale.total)}</Badge>
                  </div>
                ))}
                {!recentSales.length && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No recent sales yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {loading && <p className="text-center text-sm text-muted-foreground">Loading live operation data...</p>}
      {!loading && products.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Boxes className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Operation Hub ready</p>
              <p className="text-sm text-muted-foreground">Products add garesi branch stock, transfer, serial register, and low stock queue live dekhinecha.</p>
            </div>
            <Button asChild><Link to="/inventory/products">Add Products</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

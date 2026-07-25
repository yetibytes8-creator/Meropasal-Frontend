import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import {
  products as productsApi,
  purchases as purchasesApi,
  sales as salesApi,
  stockAdjustments as stockAdjustmentsApi,
  type ApiStockAdjustment,
} from "@/lib/api";
import { fromApiProduct, fromApiPurchase, fromApiSale } from "@/lib/transforms";
import type { Product, Purchase, Sale } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  PackageCheck,
  PackageX,
  RefreshCw,
  Save,
  Search,
  Truck,
  Warehouse,
} from "lucide-react";

type AdjustmentType = ApiStockAdjustment["adjustment_type"];
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock" | "reorder";

interface StockForm {
  productId: string;
  type: AdjustmentType;
  quantity: string;
  reference: string;
  reason: string;
}

interface LedgerRow {
  product: Product;
  opening: number;
  received: number;
  sold: number;
  adjusted: number;
  pending: number;
  reorderQty: number;
  stockValue: number;
}

const adjustmentLabels: Record<AdjustmentType, string> = {
  increase: "Increase stock",
  decrease: "Reduce stock",
  damage: "Damage / loss",
  return: "Return / restock",
  correction: "Count correction",
};

const adjustmentTone: Record<AdjustmentType, string> = {
  increase: "bg-success/10 text-success border-success/20",
  decrease: "bg-warning/10 text-warning border-warning/20",
  damage: "bg-destructive/10 text-destructive border-destructive/20",
  return: "bg-info/10 text-info border-info/20",
  correction: "bg-primary/10 text-primary border-primary/20",
};

const stockTone: Record<string, string> = {
  in_stock: "bg-success/10 text-success border-success/20",
  low_stock: "bg-warning/10 text-warning border-warning/20",
  out_of_stock: "bg-destructive/10 text-destructive border-destructive/20",
};

function formatMoney(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getProductStatus(product: Product) {
  if (product.stock <= 0) return "out_of_stock";
  if (product.stock <= product.minStock) return "low_stock";
  return "in_stock";
}

function statusLabel(status: string) {
  if (status === "out_of_stock") return "Out of Stock";
  if (status === "low_stock") return "Low Stock";
  return "In Stock";
}

function stockMovement(adjustment: ApiStockAdjustment) {
  return Number(adjustment.stock_after) - Number(adjustment.stock_before);
}

export default function StockControlPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [adjustments, setAdjustments] = useState<ApiStockAdjustment[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [form, setForm] = useState<StockForm>({
    productId: "",
    type: "increase",
    quantity: "",
    reference: "",
    reason: "",
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      productsApi.list(),
      purchasesApi.list(),
      salesApi.list(),
      stockAdjustmentsApi.list(),
    ])
      .then(([productRows, purchaseRows, saleRows, adjustmentRows]) => {
        setProducts(productRows.map(fromApiProduct));
        setPurchases(purchaseRows.map(fromApiPurchase));
        setSales(saleRows.map(fromApiSale));
        setAdjustments(adjustmentRows);
      })
      .catch((error) => {
        console.error(error);
        toast({ title: "Could not load stock control data", description: "Please refresh and try again." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!form.productId && products.length > 0) {
      setForm((prev) => ({ ...prev, productId: products[0].id }));
    }
  }, [form.productId, products]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(),
    [products],
  );

  const selectedProduct = products.find((product) => product.id === form.productId);

  const pickerProducts = useMemo(() => {
    const q = productPickerSearch.trim().toLowerCase();
    return products
      .filter((product) => {
        if (!q) return true;
        return (
          product.name.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q) ||
          (product.barcode || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 80);
  }, [productPickerSearch, products]);

  const ledgerRows = useMemo<LedgerRow[]>(() => products.map((product) => {
    const productId = product.id;
    const received = purchases
      .filter((purchase) => purchase.status === "received")
      .flatMap((purchase) => purchase.items)
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + Number(item.quantity), 0);
    const pending = purchases
      .filter((purchase) => purchase.status === "pending")
      .flatMap((purchase) => purchase.items)
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + Number(item.quantity), 0);
    const sold = sales
      .filter((sale) => sale.status === "completed")
      .flatMap((sale) => sale.items)
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + Number(item.quantity), 0);
    const adjusted = adjustments
      .filter((adjustment) => String(adjustment.product_id) === productId)
      .reduce((sum, adjustment) => sum + stockMovement(adjustment), 0);
    const opening = product.stock - received + sold - adjusted;
    const reorderQty = Math.max(0, Math.ceil((product.minStock * 2 || product.minStock) - product.stock - pending));

    return {
      product,
      opening,
      received,
      sold,
      adjusted,
      pending,
      reorderQty,
      stockValue: product.stock * product.costPrice,
    };
  }), [adjustments, products, purchases, sales]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledgerRows.filter((row) => {
      const status = getProductStatus(row.product);
      const matchesQuery = !q
        || row.product.name.toLowerCase().includes(q)
        || row.product.sku.toLowerCase().includes(q)
        || row.product.category.toLowerCase().includes(q);
      const matchesCategory = category === "all" || row.product.category === category;
      const matchesStatus = stockFilter === "all"
        || status === stockFilter
        || (stockFilter === "reorder" && row.reorderQty > 0);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [category, ledgerRows, query, stockFilter]);

  const reorderRows = useMemo(
    () => ledgerRows.filter((row) => row.reorderQty > 0).sort((a, b) => b.reorderQty - a.reorderQty),
    [ledgerRows],
  );

  const stockValue = ledgerRows.reduce((sum, row) => sum + row.stockValue, 0);
  const outOfStock = products.filter((product) => product.stock <= 0).length;
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= product.minStock).length;
  const pendingPurchaseQty = ledgerRows.reduce((sum, row) => sum + row.pending, 0);
  const adjustmentDamageQty = adjustments
    .filter((adjustment) => adjustment.adjustment_type === "damage")
    .reduce((sum, adjustment) => sum + Number(adjustment.quantity), 0);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProduct) {
      toast({ title: "Select a product first" });
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0 || (form.type !== "correction" && quantity <= 0)) {
      toast({
        title: "Enter a valid quantity",
        description: form.type === "correction" ? "Correction can be zero or more." : "Quantity must be greater than zero.",
      });
      return;
    }
    if (!form.reason.trim()) {
      toast({ title: "Reason is required", description: "Add a short audit note for this stock change." });
      return;
    }

    setSaving(true);
    try {
      await stockAdjustmentsApi.create({
        product_id: Number(selectedProduct.id),
        adjustment_type: form.type,
        quantity,
        reason: form.reason.trim(),
        reference: form.reference.trim(),
      });
      toast({ title: "Stock updated", description: `${selectedProduct.name} adjustment has been recorded.` });
      setForm((prev) => ({ ...prev, quantity: "", reference: "", reason: "" }));
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Stock adjustment failed", description: "Check the quantity and try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Stock Control</h1>
          <p className="page-description">Audit stock movement, plan reorder quantities, and record manual adjustments.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" asChild>
            <Link to="/inventory/products">Products</Link>
          </Button>
          <Button asChild>
            <Link to="/inventory/purchases">Create Purchase</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        <StatCard title="Stock Value" value={formatMoney(stockValue)} icon={<Warehouse className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard title="Reorder Items" value={reorderRows.length} icon={<Truck className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Low Stock" value={lowStock} icon={<AlertTriangle className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Out of Stock" value={outOfStock} icon={<PackageX className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard title="Pending Qty" value={formatQty(pendingPurchaseQty)} icon={<ClipboardList className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Product</Label>
                  <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl px-3 font-normal"
                      >
                        <span className={selectedProduct ? "min-w-0 truncate text-left text-foreground" : "text-muted-foreground"}>
                          {selectedProduct ? `${selectedProduct.name} - ${selectedProduct.sku}` : "Search / select product"}
                        </span>
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[min(92vw,560px)] p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoFocus
                          className="h-10 pl-9"
                          placeholder="Search product, SKU, barcode, category..."
                          value={productPickerSearch}
                          onChange={(event) => setProductPickerSearch(event.target.value)}
                        />
                      </div>
                      <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border">
                        {pickerProducts.length === 0 ? (
                          <div className="space-y-2 p-4 text-center text-sm text-muted-foreground">
                            <p>{products.length === 0 ? "No products available for stock adjustment." : "No product matched your search."}</p>
                            {products.length === 0 && (
                              <Button asChild size="sm" variant="outline">
                                <Link to="/inventory/products">Add Products</Link>
                              </Button>
                            )}
                          </div>
                        ) : pickerProducts.map((product) => {
                          const status = getProductStatus(product);
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, productId: product.id }));
                                setProductPickerSearch("");
                                setProductPickerOpen(false);
                              }}
                              className={`flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted ${
                                form.productId === product.id ? "bg-primary/10 text-primary" : ""
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{product.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {product.sku} | {product.category} | Stock: {formatQty(product.stock)} {product.unit || "pcs"}
                                </span>
                              </span>
                              <Badge variant="outline" className={`${stockTone[status]} shrink-0`}>
                                {statusLabel(status)}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as AdjustmentType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(adjustmentLabels) as AdjustmentType[]).map((type) => (
                        <SelectItem key={type} value={type}>{adjustmentLabels[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{form.type === "correction" ? "Counted Stock" : "Quantity"}</Label>
                  <Input
                    inputMode="decimal"
                    value={form.quantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value.replace(/[^0-9.]/g, "") }))}
                    placeholder={form.type === "correction" ? "New stock count" : "Adjustment qty"}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Reference</Label>
                  <Input
                    value={form.reference}
                    onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                    placeholder="Voucher, audit note, supplier return, or staff name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={form.reason}
                    onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="Why is this stock changing?"
                    maxLength={255}
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="font-semibold">{formatQty(selectedProduct.stock)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Minimum</p>
                    <p className="font-semibold">{formatQty(selectedProduct.minStock)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Value</p>
                    <p className="font-semibold">{formatMoney(selectedProduct.stock * selectedProduct.costPrice)}</p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving || loading || products.length === 0}>
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Adjustment
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Reorder Plan</CardTitle>
              <p className="text-sm text-muted-foreground">Suggested quantity targets roughly twice the minimum stock after pending purchases.</p>
            </div>
            <Badge variant="outline" className="w-fit bg-warning/10 text-warning border-warning/20">
              {formatQty(adjustmentDamageQty)} damaged qty logged
            </Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderRows.slice(0, 7).map((row) => (
                  <TableRow key={row.product.id}>
                    <TableCell>
                      <div className="font-medium">{row.product.name}</div>
                      <div className="text-xs text-muted-foreground">{row.product.category} / min {formatQty(row.product.minStock)}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatQty(row.product.stock)}</TableCell>
                    <TableCell className="text-right">{formatQty(row.pending)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatQty(row.reorderQty)}</TableCell>
                  </TableRow>
                ))}
                {reorderRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No reorder needed right now.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Stock Ledger</CardTitle>
              <p className="text-sm text-muted-foreground">Opening + received - sold +/- adjustments = current stock.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[680px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, name, category" className="pl-9" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as StockFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="reorder">Reorder Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Adjusted</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const status = getProductStatus(row.product);
                return (
                  <TableRow key={row.product.id}>
                    <TableCell>
                      <div className="font-medium">{row.product.name}</div>
                      <div className="text-xs text-muted-foreground">{row.product.category}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.product.sku}</TableCell>
                    <TableCell className="text-right">{formatQty(row.opening)}</TableCell>
                    <TableCell className="text-right text-success">+{formatQty(row.received)}</TableCell>
                    <TableCell className="text-right text-destructive">-{formatQty(row.sold)}</TableCell>
                    <TableCell className="text-right">
                      {row.adjusted >= 0 ? "+" : ""}{formatQty(row.adjusted)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatQty(row.product.stock)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.stockValue)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={stockTone[status]}>{statusLabel(status)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No products match this filter.</TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6}>Total</TableCell>
                <TableCell className="text-right">{formatQty(filteredRows.reduce((sum, row) => sum + row.product.stock, 0))}</TableCell>
                <TableCell className="text-right">{formatMoney(filteredRows.reduce((sum, row) => sum + row.stockValue, 0))}</TableCell>
                <TableCell>{filteredRows.length} items</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adjustment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Move</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.slice(0, 20).map((adjustment) => {
                const movement = stockMovement(adjustment);
                return (
                  <TableRow key={adjustment.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(adjustment.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{adjustment.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={adjustmentTone[adjustment.adjustment_type]}>
                        {adjustmentLabels[adjustment.adjustment_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatQty(Number(adjustment.stock_before))}</TableCell>
                    <TableCell className="text-right">{formatQty(Number(adjustment.stock_after))}</TableCell>
                    <TableCell className={`text-right font-semibold ${movement >= 0 ? "text-success" : "text-destructive"}`}>
                      <span className="inline-flex items-center justify-end gap-1">
                        {movement >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {movement >= 0 ? "+" : ""}{formatQty(movement)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate">{adjustment.reason}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">{adjustment.reference || "-"}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && adjustments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No manual adjustments recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {loading && (
        <div className="fixed bottom-24 right-4 rounded-full border bg-card px-4 py-2 text-sm shadow-lg">
          Loading stock data...
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { products as productsApi } from "@/lib/api";
import { fromApiProduct } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Plus, Search, Pencil, Trash2, Package, Save, ArrowUpDown, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const DEFAULT_CATEGORIES = [
  "Grocery", "Hardware", "Clothes", "Pharmacy", "Electronics", "Stationery",
  "Cosmetics", "Footwear", "Furniture", "Kitchenware", "Auto Parts", "Services",
];
const DEFAULT_UNITS = ["pcs", "box", "packet", "kg", "gram", "liter", "meter", "pair", "set", "roll", "strip", "bottle"];
const DEFAULT_ACCOUNTS = {
  sales: ["Sales Revenue", "Retail Sales", "Wholesale Sales", "Service Income"],
  purchase: ["Purchase / COGS", "Inventory Purchase", "Direct Expense", "Raw Material"],
  inventory: ["Inventory Stock", "Finished Goods", "Raw Material Stock", "Consumables Stock"],
};
const PAGE_SIZE = 10;

type SortKey = "name" | "price" | "stock";
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ProductForm = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  brand: string;
  modelNumber: string;
  size: string;
  color: string;
  batchNumber: string;
  expiryDate: string;
  warrantyMonths: string;
  storageLocation: string;
  taxRate: string;
  salesAccount: string;
  purchaseAccount: string;
  inventoryAccount: string;
  price: string;
  costPrice: string;
  stock: string;
  minStock: string;
  image: string;
};

const emptyProductForm = (category = DEFAULT_CATEGORIES[0]): ProductForm => ({
  name: "",
  sku: "",
  barcode: "",
  category,
  unit: "pcs",
  brand: "",
  modelNumber: "",
  size: "",
  color: "",
  batchNumber: "",
  expiryDate: "",
  warrantyMonths: "",
  storageLocation: "",
  taxRate: "0",
  salesAccount: DEFAULT_ACCOUNTS.sales[0],
  purchaseAccount: DEFAULT_ACCOUNTS.purchase[0],
  inventoryAccount: DEFAULT_ACCOUNTS.inventory[0],
  price: "",
  costPrice: "",
  stock: "",
  minStock: "",
  image: "",
});

const getStockStatus = (p: Product): Exclude<StockFilter, "all"> => {
  if (p.stock <= 0) return "out_of_stock";
  if (p.stock <= p.minStock) return "low_stock";
  return "in_stock";
};

const stockLabel: Record<Exclude<StockFilter, "all">, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const ProductsPage = () => {
  const [products, setProducts] = useList(() =>
    productsApi.list().then((r) => r.map(fromApiProduct))
  );

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStockStatus, setFilterStockStatus] = useState<StockFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm());
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category).filter(Boolean)])).sort(),
    [products],
  );

  const toggleSort = (key: SortKey) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
    setPage(1);
  };

  const filtered = products
    .filter((p) => {
      const haystack = [
        p.name, p.sku, p.barcode, p.category, p.brand, p.modelNumber,
        p.size, p.color, p.batchNumber, p.storageLocation,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchSearch = haystack.includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || p.category === filterCategory;
      const matchStock = filterStockStatus === "all" || getStockStatus(p) === filterStockStatus;
      return matchSearch && matchCat && matchStock;
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      return (a[sort.key] - b[sort.key]) * dir;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const inStockCount = products.filter((p) => getStockStatus(p) === "in_stock").length;
  const lowStockCount = products.filter((p) => getStockStatus(p) === "low_stock").length;
  const outOfStockCount = products.filter((p) => getStockStatus(p) === "out_of_stock").length;

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyProductForm(categories[0] || DEFAULT_CATEGORIES[0]));
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditItem(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || "",
      category: p.category,
      unit: p.unit || "pcs",
      brand: p.brand || "",
      modelNumber: p.modelNumber || "",
      size: p.size || "",
      color: p.color || "",
      batchNumber: p.batchNumber || "",
      expiryDate: p.expiryDate || "",
      warrantyMonths: p.warrantyMonths != null ? String(p.warrantyMonths) : "",
      storageLocation: p.storageLocation || "",
      taxRate: String(p.taxRate || 0),
      salesAccount: p.salesAccount || DEFAULT_ACCOUNTS.sales[0],
      purchaseAccount: p.purchaseAccount || DEFAULT_ACCOUNTS.purchase[0],
      inventoryAccount: p.inventoryAccount || DEFAULT_ACCOUNTS.inventory[0],
      price: String(p.price),
      costPrice: String(p.costPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
      image: p.image || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.sku.trim()) { toast.error("SKU is required"); return; }
    if (!form.category.trim()) { toast.error("Category name is required"); return; }
    if (!form.unit.trim()) { toast.error("Unit is required"); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error("Price must be greater than 0"); return; }
    if (!form.costPrice || parseFloat(form.costPrice) < 0) { toast.error("Cost price must be 0 or more"); return; }
    if (form.stock === "" || parseFloat(form.stock) < 0) { toast.error("Stock must be 0 or more"); return; }
    if (form.minStock === "" || parseFloat(form.minStock) < 0) { toast.error("Min stock must be 0 or more"); return; }
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      brand: form.brand.trim(),
      model_number: form.modelNumber.trim(),
      size: form.size.trim(),
      color: form.color.trim(),
      batch_number: form.batchNumber.trim(),
      expiry_date: form.expiryDate || null,
      warranty_months: form.warrantyMonths ? parseInt(form.warrantyMonths) : null,
      storage_location: form.storageLocation.trim(),
      tax_rate: parseFloat(form.taxRate || "0"),
      sales_account: form.salesAccount.trim() || DEFAULT_ACCOUNTS.sales[0],
      purchase_account: form.purchaseAccount.trim() || DEFAULT_ACCOUNTS.purchase[0],
      inventory_account: form.inventoryAccount.trim() || DEFAULT_ACCOUNTS.inventory[0],
      price: parseFloat(form.price),
      cost_price: parseFloat(form.costPrice),
      stock: parseFloat(form.stock),
      min_stock: parseFloat(form.minStock),
      image: form.image.trim() || null,
    };
    try {
      if (editItem) {
        const updated = await productsApi.update(Number(editItem.id), {
          ...payload,
        });
        setProducts((prev) => prev.map((p) => p.id === editItem.id ? fromApiProduct(updated) : p));
      } else {
        const created = await productsApi.create({
          ...payload, supplier_id: null,
        });
        setProducts((prev) => [...prev, fromApiProduct(created)]);
      }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  const stockBadge = (p: Product) => {
    const status = getStockStatus(p);
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs",
          status === "out_of_stock" && "bg-destructive/10 text-destructive border-destructive/20",
          status === "low_stock" && "bg-warning/10 text-warning border-warning/20",
          status === "in_stock" && "bg-success/10 text-success border-success/20",
        )}
      >
        {stockLabel[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Products</h1>
          <p className="page-description">Product, stock, category sabai manage garnus</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
              <Button onClick={openAdd} className="h-11 shrink-0 rounded-xl px-4 font-semibold shadow-sm sm:px-5">
              <Plus className="w-5 h-5" />
              <span>Add Product</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-y-auto sm:w-full sm:max-w-3xl">
            <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-sm font-semibold">Universal inventory item</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hardware, clothes, pharmacy, electronics, grocery sabai ko product detail ra finance account mapping yahi bata rakhnus.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">SKU <span className="text-destructive">*</span></Label>
                  <Input placeholder="ELEC-001" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Category <span className="text-destructive">*</span></Label>
                  <Input placeholder="Category name add garnus - Hardware, Clothes, Pharmacy..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, category: c })}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          form.category === c
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Unit <span className="text-destructive">*</span></Label>
                  <Select value={form.unit} onValueChange={(unit) => setForm({ ...form, unit })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEFAULT_UNITS.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Custom unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Image URL</Label>
                <div className="flex items-center gap-3">
                  {form.image ? (
                    <img src={form.image} alt="" className="w-12 h-12 rounded-md object-cover border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <Input placeholder="https://example.com/image.jpg" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Barcode</Label>
                  <Input placeholder="Scan / type barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Brand</Label>
                  <Input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Model / Article No.</Label>
                  <Input placeholder="Model, article, part no." value={form.modelNumber} onChange={(e) => setForm({ ...form, modelNumber: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Size</Label>
                  <Input placeholder="S, M, L, 10mm, 2 inch..." value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Color</Label>
                  <Input placeholder="Black, red..." value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Rack / Store Location</Label>
                  <Input placeholder="Rack A1, Godown..." value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Batch / Lot No.</Label>
                  <Input placeholder="Batch for pharmacy/FMCG" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Expiry Date</Label>
                  <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Warranty Months</Label>
                  <Input type="number" min="0" placeholder="0" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Selling Price <span className="text-destructive">*</span></Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cost Price</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Current Stock</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Min Stock</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tax / VAT %</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-sm font-semibold">Finance Mapping</p>
                <p className="mt-1 text-xs text-muted-foreground">Sale, purchase, stock entry auto-post garda kun account head ma jane ho yaha set garnus.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Sales Account</Label>
                    <Select value={form.salesAccount} onValueChange={(salesAccount) => setForm({ ...form, salesAccount })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DEFAULT_ACCOUNTS.sales.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Purchase / COGS Account</Label>
                    <Select value={form.purchaseAccount} onValueChange={(purchaseAccount) => setForm({ ...form, purchaseAccount })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DEFAULT_ACCOUNTS.purchase.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Inventory Account</Label>
                    <Select value={form.inventoryAccount} onValueChange={(inventoryAccount) => setForm({ ...form, inventoryAccount })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DEFAULT_ACCOUNTS.inventory.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleSave}>
                  <Save className="w-4 h-4" />{editItem ? "Save Changes" : "Add Product"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Items", value: products.length, icon: Package, tone: "bg-muted text-muted-foreground" },
          { label: "Stock Ma", value: inStockCount, icon: CheckCircle2, tone: "bg-success/10 text-success" },
          { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, tone: "bg-warning/10 text-warning" },
          { label: "Out of Stock", value: outOfStockCount, icon: XCircle, tone: "bg-destructive/10 text-destructive" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
              </div>
              <div className={cn("rounded-xl p-2", item.tone)}>
                <item.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search product, SKU, barcode, brand, batch..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStockStatus} onValueChange={(v) => { setFilterStockStatus(v as StockFilter); setPage(1); }}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paged.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No products found</p>
          </div>
        ) : paged.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                    </div>
                    {stockBadge(p)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[p.brand, p.modelNumber, p.size, p.color, p.batchNumber, p.storageLocation].filter(Boolean).slice(0, 4).map((detail) => (
                      <Badge key={detail} variant="secondary" className="rounded-full text-[10px]">{detail}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-semibold">Rs. {p.price.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Stock: {p.stock} {p.unit || "pcs"} / Min: {p.minStock}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2" onClick={() => openEdit(p)}>
                  <Pencil className="w-3.5 h-3.5" />Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                    Product<ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Business Details</TableHead>
                <TableHead>Finance Head</TableHead>
                <TableHead className="text-right">
                  <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => toggleSort("price")}>
                    Price<ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">
                  <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => toggleSort("stock")}>
                    Stock<ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No products found
                  </TableCell>
                </TableRow>
              ) : paged.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{p.sku}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{p.category}</div>
                    <div className="text-xs text-muted-foreground">{p.unit || "pcs"}</div>
                  </TableCell>
                  <TableCell className="min-w-52 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-1.5">
                      {p.barcode && <Badge variant="outline" className="text-[10px]">Barcode: {p.barcode}</Badge>}
                      {p.brand && <Badge variant="outline" className="text-[10px]">{p.brand}</Badge>}
                      {p.modelNumber && <Badge variant="outline" className="text-[10px]">Model: {p.modelNumber}</Badge>}
                      {p.size && <Badge variant="outline" className="text-[10px]">Size: {p.size}</Badge>}
                      {p.color && <Badge variant="outline" className="text-[10px]">Color: {p.color}</Badge>}
                      {p.batchNumber && <Badge variant="outline" className="text-[10px]">Batch: {p.batchNumber}</Badge>}
                      {p.expiryDate && <Badge variant="outline" className="text-[10px]">Exp: {p.expiryDate}</Badge>}
                      {p.warrantyMonths ? <Badge variant="outline" className="text-[10px]">Warranty: {p.warrantyMonths} mo</Badge> : null}
                      {p.storageLocation && <Badge variant="outline" className="text-[10px]">Rack: {p.storageLocation}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-44 text-xs">
                    <div className="font-medium text-foreground">{p.inventoryAccount || "Inventory Stock"}</div>
                    <div className="text-muted-foreground">Sale: {p.salesAccount || "Sales Revenue"}</div>
                    <div className="text-muted-foreground">Buy: {p.purchaseAccount || "Purchase / COGS"}</div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">Rs. {p.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">Rs. {p.costPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm">{p.stock} {p.unit || "pcs"}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{p.minStock}</TableCell>
                  <TableCell>{stockBadge(p)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openEdit(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={async () => {
                      try { await productsApi.delete(Number(p.id)); setProducts((prev) => prev.filter((x) => x.id !== p.id)); }
                      catch (err) { toast.error((err as Error).message); }
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;

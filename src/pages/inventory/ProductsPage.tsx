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
import { useAuth } from "@/contexts/AuthContext";
import { getBusinessProfileFromSystemConfig } from "@/lib/businessProfiles";
import type { Product } from "@/types";

const DEFAULT_CATEGORIES = [
  "Grocery", "Hardware", "Clothes", "Pharmacy", "Electronics", "Stationery",
  "Cosmetics", "Footwear", "Furniture", "Kitchenware", "Auto Parts", "Services",
];
const PROFILE_CATEGORIES: Record<string, string[]> = {
  clothing: ["Men", "Women", "Kids", "Shirts", "T-Shirts", "Pants", "Kurta", "Saree", "Jackets", "Accessories"],
  footwear: ["Sports Shoes", "Formal Shoes", "Casual Shoes", "Sandals", "Slippers", "School Shoes", "Boots", "Socks", "Accessories"],
  hardware: ["Tools", "Plumbing", "Electrical", "Paint", "Fasteners", "Sanitary", "Adhesive", "Safety", "Power Tools", "Building Materials"],
  pharmacy: ["Medicine", "Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Baby Care", "Medical Supplies", "Supplements"],
  electronics: ["Mobiles", "Laptops", "Accessories", "Printers", "Networking", "Storage", "Cables", "Cameras", "Power Backup"],
  kirana: ["Grains", "Pulses", "Oil", "Snacks", "Beverages", "Spices", "Personal Care", "Household", "Dairy"],
  supermarket: ["Grocery", "Beverages", "Snacks", "Dairy", "Frozen", "Personal Care", "Household", "Baby Care", "Stationery"],
};
const DEFAULT_UNITS = ["pcs", "box", "packet", "kg", "gram", "liter", "meter", "pair", "set", "roll", "strip", "bottle"];
const PROFILE_UNITS: Record<string, string[]> = {
  clothing: ["pcs", "pair", "set", "bundle"],
  footwear: ["pair", "pcs", "box", "set"],
  hardware: ["pcs", "kg", "gram", "meter", "liter", "roll", "box", "packet", "set"],
  pharmacy: ["strip", "tablet", "capsule", "bottle", "vial", "tube", "box", "pcs"],
  electronics: ["pcs", "set", "box"],
  kirana: ["pcs", "packet", "kg", "gram", "liter", "bottle", "box", "sack"],
  supermarket: ["pcs", "packet", "kg", "gram", "liter", "bottle", "box"],
};
const DEFAULT_ACCOUNTS = {
  sales: ["Sales Revenue", "Retail Sales", "Wholesale Sales", "Service Income"],
  purchase: ["Purchase / COGS", "Inventory Purchase", "Direct Expense", "Raw Material"],
  inventory: ["Inventory Stock", "Finished Goods", "Raw Material Stock", "Consumables Stock"],
};
const PAGE_SIZE = 10;
type OptionalFieldKey = "brand" | "modelNumber" | "size" | "color" | "storageLocation" | "batchNumber" | "expiryDate" | "warrantyMonths";
type ProductConfigFromSystem = {
  categories?: unknown;
  units?: unknown;
  visibleFields?: unknown;
};

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

const optionalFieldList = (value: unknown, fallback: OptionalFieldKey[]): OptionalFieldKey[] => {
  const allowed: OptionalFieldKey[] = ["brand", "modelNumber", "size", "color", "storageLocation", "batchNumber", "expiryDate", "warrantyMonths"];
  const values = stringList(value).filter((item): item is OptionalFieldKey => allowed.includes(item as OptionalFieldKey));
  return values.length ? values : fallback;
};

const profileProductCopy = {
  clothing: {
    title: "Clothing style / SKU",
    help: "Clothes shop ko lagi style code, size, color, season, supplier ra return/exchange tracking yahi bata milcha.",
    name: "Style / Item Name",
    namePlaceholder: "Cotton Shirt, Kurta, Jeans...",
    sku: "Style Code / SKU",
    skuPlaceholder: "SHIRT-BLK-M / STYLE-001",
    categoryPlaceholder: "Men, Women, Kids, Saree, Shoes...",
    barcodePlaceholder: "Scan barcode or tag code",
    brand: "Brand / Designer",
    brandPlaceholder: "Brand, boutique, label...",
    model: "Season / Collection",
    modelPlaceholder: "Summer 2026, Dashain collection...",
    size: "Size",
    sizePlaceholder: "S, M, L, XL, 32, 34, Free",
    color: "Color",
    colorPlaceholder: "Black, Blue, Maroon...",
    location: "Rack / Shelf",
    locationPlaceholder: "Rack A1, Display wall, Store room...",
    batch: "Lot / Purchase Batch",
    batchPlaceholder: "Lot no. from supplier",
    expiry: "Season End Date",
    warranty: "Return Window Days",
    stock: "Current Qty",
    minStock: "Reorder Qty",
    search: "Search style, SKU, barcode, size, color...",
  },
  default: {
    title: "Universal inventory item",
    help: "Yo profile ma essential inventory fields matra dekhaiyeko cha. Business type change garepachi form fields automatic milcha.",
    name: "Name",
    namePlaceholder: "Product name",
    sku: "SKU",
    skuPlaceholder: "ELEC-001",
    categoryPlaceholder: "Category name add garnus - Hardware, Clothes, Pharmacy...",
    barcodePlaceholder: "Scan / type barcode",
    brand: "Brand",
    brandPlaceholder: "Brand",
    model: "Model / Article No.",
    modelPlaceholder: "Model, article, part no.",
    size: "Size",
    sizePlaceholder: "S, M, L, 10mm, 2 inch...",
    color: "Color",
    colorPlaceholder: "Black, red...",
    location: "Rack / Store Location",
    locationPlaceholder: "Rack A1, Godown...",
    batch: "Batch / Lot No.",
    batchPlaceholder: "Batch for pharmacy/FMCG",
    expiry: "Expiry Date",
    warranty: "Warranty Months",
    stock: "Current Stock",
    minStock: "Min Stock",
    search: "Search product, SKU, barcode, brand, batch...",
  },
  footwear: {
    title: "Footwear SKU",
    help: "Jutta/chappal shop ko lagi shoe size, color, brand, rack, supplier purchase ra exchange tracking yahi bata milcha.",
    name: "Footwear Name",
    namePlaceholder: "Running shoes, sandal, school shoes...",
    sku: "Style Code / SKU",
    skuPlaceholder: "SHOE-BLK-42",
    categoryPlaceholder: "Sports Shoes, Sandals, Formal Shoes...",
    barcodePlaceholder: "Scan barcode or tag code",
    brand: "Brand",
    brandPlaceholder: "Goldstar, Caliber, Nike...",
    model: "Model / Style",
    modelPlaceholder: "School model, formal style...",
    size: "Shoe Size",
    sizePlaceholder: "36, 37, 38, 39, 40, 41, 42...",
    color: "Color",
    colorPlaceholder: "Black, Brown, White...",
    location: "Rack / Display",
    locationPlaceholder: "Rack F1, front display...",
    batch: "Lot No.",
    batchPlaceholder: "Supplier lot no.",
    expiry: "Season End Date",
    warranty: "Exchange Window Days",
    stock: "Current Pairs",
    minStock: "Reorder Pairs",
    search: "Search shoe, SKU, barcode, size, color...",
  },
  hardware: {
    title: "Hardware item",
    help: "Hardware ko lagi brand, specification/size, unit, rack, warranty ra supplier purchase detail yahi bata rakhnus.",
    name: "Item Name",
    namePlaceholder: "Hammer, pipe, wire, paint...",
    sku: "Item Code / SKU",
    skuPlaceholder: "HDW-001",
    categoryPlaceholder: "Tools, Plumbing, Electrical, Paint...",
    barcodePlaceholder: "Scan / type barcode",
    brand: "Brand",
    brandPlaceholder: "Brand / maker",
    model: "Model / Specification",
    modelPlaceholder: "Gauge, watt, grade, model no.",
    size: "Size / Dimension",
    sizePlaceholder: "10mm, 2 inch, 5 meter...",
    color: "Color",
    colorPlaceholder: "Paint color if needed",
    location: "Rack / Godown",
    locationPlaceholder: "Rack H1, godown bay...",
    batch: "Lot No.",
    batchPlaceholder: "Supplier lot no.",
    expiry: "Expiry Date",
    warranty: "Warranty Months",
    stock: "Current Stock",
    minStock: "Min Stock",
    search: "Search item, SKU, brand, size, rack...",
  },
  pharmacy: {
    title: "Pharmacy medicine",
    help: "Pharmacy ma batch no., expiry, strip/bottle unit, supplier bill ra tax mapping priority ho.",
    name: "Medicine Name",
    namePlaceholder: "Paracetamol 500mg, cough syrup...",
    sku: "Medicine Code / SKU",
    skuPlaceholder: "MED-PCM-500",
    categoryPlaceholder: "Tablet, Syrup, Injection, Ointment...",
    barcodePlaceholder: "Scan / type barcode",
    brand: "Company / Brand",
    brandPlaceholder: "Manufacturer name",
    model: "Strength / Generic",
    modelPlaceholder: "500mg, Amoxicillin...",
    size: "Pack Size",
    sizePlaceholder: "10 tabs, 100ml...",
    color: "Color",
    colorPlaceholder: "Optional",
    location: "Rack / Shelf",
    locationPlaceholder: "Rack P1, cold storage...",
    batch: "Batch No.",
    batchPlaceholder: "Batch no. from supplier bill",
    expiry: "Expiry Date",
    warranty: "Warranty Months",
    stock: "Current Qty",
    minStock: "Reorder Qty",
    search: "Search medicine, batch, barcode, company...",
  },
  electronics: {
    title: "Electronics device / SKU",
    help: "Electronics ko lagi brand, model, warranty, serial/barcode, supplier purchase ra finance mapping yahi bata rakhnus.",
    name: "Device / Item Name",
    namePlaceholder: "Phone, laptop, charger, router...",
    sku: "SKU",
    skuPlaceholder: "ELEC-001",
    categoryPlaceholder: "Mobiles, Laptops, Accessories...",
    barcodePlaceholder: "Scan / type barcode",
    brand: "Brand",
    brandPlaceholder: "Apple, Dell, Samsung...",
    model: "Model Number",
    modelPlaceholder: "iPhone 15, ThinkCentre...",
    size: "Variant",
    sizePlaceholder: "128GB, 8GB RAM...",
    color: "Color",
    colorPlaceholder: "Black, silver...",
    location: "Rack / Store Location",
    locationPlaceholder: "Rack E1, counter...",
    batch: "Serial / Lot",
    batchPlaceholder: "Serial / supplier lot",
    expiry: "Expiry Date",
    warranty: "Warranty Months",
    stock: "Current Stock",
    minStock: "Min Stock",
    search: "Search device, SKU, barcode, brand, model...",
  },
};

const PROFILE_VISIBLE_FIELDS: Record<string, OptionalFieldKey[]> = {
  clothing: ["brand", "modelNumber", "size", "color", "storageLocation", "batchNumber"],
  footwear: ["brand", "modelNumber", "size", "color", "storageLocation", "warrantyMonths"],
  hardware: ["brand", "modelNumber", "size", "storageLocation", "warrantyMonths"],
  pharmacy: ["brand", "modelNumber", "batchNumber", "expiryDate", "storageLocation"],
  electronics: ["brand", "modelNumber", "size", "color", "batchNumber", "warrantyMonths", "storageLocation"],
  kirana: ["brand", "batchNumber", "expiryDate", "storageLocation"],
  supermarket: ["brand", "batchNumber", "expiryDate", "storageLocation"],
  general_inventory: ["brand", "storageLocation"],
  other: ["brand", "storageLocation"],
};

const profileUnitCopy: Record<string, { label: string; help: string }> = {
  clothing: {
    label: "Stock Unit",
    help: "Clothes ma usually pcs, pair, set or bundle enough huncha.",
  },
  footwear: {
    label: "Stock Unit",
    help: "Footwear ma pair default rakhda billing ra stock sajilo huncha.",
  },
  hardware: {
    label: "Measurement Unit",
    help: "Hardware ma pcs, kg, meter, liter jasto unit must huncha.",
  },
  pharmacy: {
    label: "Medicine Unit",
    help: "Pharmacy ma strip, tablet, bottle, vial jasto unit expiry/batch sanga track huncha.",
  },
  kirana: {
    label: "Selling Unit",
    help: "Kirana ma packet, kg, liter, bottle jasto loose/unit stock chahincha.",
  },
  supermarket: {
    label: "Selling Unit",
    help: "Barcode billing ko lagi pcs/packet/kg/liter jasto unit set garnus.",
  },
  electronics: {
    label: "Stock Unit",
    help: "Electronics ma pcs/set/box mostly enough huncha.",
  },
  default: {
    label: "Unit",
    help: "Stock count ra purchase/sales calculation ko base unit.",
  },
};

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

const ProductThumbnail = ({ src, name, className }: { src?: string | null; name: string; className?: string }) => {
  const [failed, setFailed] = useState(false);
  const baseClass = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50 to-white text-emerald-700 shadow-sm",
    className,
  );

  if (!src || failed) {
    return (
      <div className={baseClass}>
        <Package className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className={baseClass}>
      <img
        src={src}
        alt={name}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

const ProductsPage = () => {
  const { systemConfig, subscription } = useAuth();
  const businessProfile = getBusinessProfileFromSystemConfig(systemConfig, subscription?.plan?.module_access);
  const productConfig = (systemConfig?.productConfig || {}) as ProductConfigFromSystem;
  const productCopy = profileProductCopy[businessProfile.key] || profileProductCopy.default;
  const unitCopy = profileUnitCopy[businessProfile.key] || profileUnitCopy.default;
  const visibleFields = optionalFieldList(productConfig.visibleFields, PROFILE_VISIBLE_FIELDS[businessProfile.key] || PROFILE_VISIBLE_FIELDS.other);
  const showField = (field: OptionalFieldKey) => visibleFields.includes(field);
  const profileCategories = stringList(productConfig.categories).length ? stringList(productConfig.categories) : (PROFILE_CATEGORIES[businessProfile.key] || DEFAULT_CATEGORIES);
  const unitSuggestions = stringList(productConfig.units).length ? stringList(productConfig.units) : (PROFILE_UNITS[businessProfile.key] || DEFAULT_UNITS);
  const [products, setProducts] = useList(() =>
    productsApi.list().then((r) => r.map(fromApiProduct))
  );

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStockStatus, setFilterStockStatus] = useState<StockFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm());
  const [categorySearch, setCategorySearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => Array.from(new Set([...profileCategories, ...products.map((p) => p.category).filter(Boolean)])).sort(),
    [products, profileCategories],
  );
  const visibleCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return categories.filter((category) => !query || category.toLowerCase().includes(query));
  }, [categories, categorySearch]);

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
    setForm(emptyProductForm(categories[0] || profileCategories[0] || DEFAULT_CATEGORIES[0]));
    setCategorySearch("");
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
    setCategorySearch("");
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

  const expiryBadge = (p: Product) => {
    if (!p.expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${p.expiryDate}T00:00:00`);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft > 60) {
      return <Badge variant="outline" className="text-[10px]">Exp: {p.expiryDate}</Badge>;
    }

    const label = daysLeft < 0
      ? `Expired ${Math.abs(daysLeft)}d`
      : daysLeft === 0
        ? "Expires today"
        : `Expires in ${daysLeft}d`;

    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px]",
          daysLeft < 0 && "bg-destructive/10 text-destructive border-destructive/20",
          daysLeft >= 0 && daysLeft <= 30 && "bg-warning/10 text-warning border-warning/20",
          daysLeft > 30 && daysLeft <= 60 && "bg-info/10 text-info border-info/20",
        )}
      >
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Package className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{businessProfile.productLabel || "Product Catalog"}</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{businessProfile.moduleLabel || "Inventory"} catalog, stock, category and finance mapping</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{businessProfile.inventoryLabel}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">{visibleFields.length} smart fields</Badge>
          </div>
        </div>
        <div className="border-t bg-gradient-to-r from-emerald-50/80 to-background px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {businessProfile.keyFields.slice(0, 6).map((field) => (
                <Badge key={field} variant="secondary" className="rounded-full bg-white text-[10px] shadow-sm">{field}</Badge>
              ))}
            </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
              <Button onClick={openAdd} className="h-11 shrink-0 rounded-xl px-4 font-semibold shadow-sm sm:px-5">
              <Plus className="w-5 h-5" />
              <span>Add Product</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] overflow-hidden p-0 sm:w-full sm:max-w-5xl">
            <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                {editItem ? "Edit Product" : `Add ${businessProfile.productLabel || "Product"}`}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(94vh-8.5rem)] overflow-y-auto bg-muted/20 px-3 py-3 sm:px-6">
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{productCopy.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {productCopy.help}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full bg-background text-[10px]">
                    {businessProfile.inventoryLabel}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                  {businessProfile.keyFields.map((field) => (
                    <Badge key={field} variant="secondary" className="shrink-0 rounded-full text-[10px]">{field}</Badge>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Basic Details</p>
                    <p className="text-xs text-muted-foreground">Name, SKU, category ra stock unit. Yo fields sabai business lai chaincha.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px]">Required</Badge>
                </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{productCopy.name} <span className="text-destructive">*</span></Label>
                  <Input placeholder={productCopy.namePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{productCopy.sku} <span className="text-destructive">*</span></Label>
                  <Input placeholder={productCopy.skuPlaceholder} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Category <span className="text-destructive">*</span></Label>
                  <Input placeholder={productCopy.categoryPlaceholder} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <div className="relative pt-1">
                    <Search className="absolute left-3 top-[1.15rem] h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-9 pl-9 text-xs"
                      placeholder="Search category suggestions..."
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                    />
                  </div>
                  <div className="flex max-h-24 gap-1.5 overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/20 p-2">
                    <div className="flex flex-wrap gap-1.5">
                    {visibleCategories.length === 0 && (
                      <span className="px-1 text-xs text-muted-foreground">No matching category. Type new category above.</span>
                    )}
                    {visibleCategories.map((c) => (
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
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{unitCopy.label} <span className="text-destructive">*</span></Label>
                  <Select value={form.unit} onValueChange={(unit) => setForm({ ...form, unit })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {unitSuggestions.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {unitSuggestions.slice(0, 6).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setForm({ ...form, unit })}
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          form.unit === unit ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                  <Input placeholder="Custom unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{unitCopy.help}</p>
                </div>
              </div>
              </div>
              <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Catalog & Identification</p>
                    <p className="text-xs text-muted-foreground">Image, barcode, brand/model and profile-specific details.</p>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px]">{visibleFields.length} fields</Badge>
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
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Barcode</Label>
                  <Input placeholder={productCopy.barcodePlaceholder} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                {showField("brand") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.brand}</Label>
                    <Input placeholder={productCopy.brandPlaceholder} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  </div>
                )}
                {showField("modelNumber") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.model}</Label>
                    <Input placeholder={productCopy.modelPlaceholder} value={form.modelNumber} onChange={(e) => setForm({ ...form, modelNumber: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {showField("size") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.size}</Label>
                    <Input placeholder={productCopy.sizePlaceholder} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
                  </div>
                )}
                {showField("color") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.color}</Label>
                    <Input placeholder={productCopy.colorPlaceholder} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  </div>
                )}
                {showField("storageLocation") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.location}</Label>
                    <Input placeholder={productCopy.locationPlaceholder} value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {showField("batchNumber") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.batch}</Label>
                    <Input placeholder={productCopy.batchPlaceholder} value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
                  </div>
                )}
                {showField("expiryDate") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.expiry}</Label>
                    <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                  </div>
                )}
                {showField("warrantyMonths") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{productCopy.warranty}</Label>
                    <Input type="number" min="0" placeholder="0" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} />
                  </div>
                )}
              </div>
              </div>
              <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Price & Stock</p>
                    <p className="text-xs text-muted-foreground">Counter sale, purchase cost, opening stock and reorder level.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px]">Operational</Badge>
                </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Selling Price <span className="text-destructive">*</span></Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cost Price</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{productCopy.stock}</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{productCopy.minStock}</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tax / VAT %</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
                </div>
              </div>
              </div>
              <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
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
            </div>
            <div className="sticky bottom-0 z-10 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave}>
                <Save className="w-4 h-4" />{editItem ? "Save Changes" : "Add Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Items", value: products.length, icon: Package, tone: "bg-muted text-muted-foreground" },
          { label: "In Stock", value: inStockCount, icon: CheckCircle2, tone: "bg-success/10 text-success" },
          { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, tone: "bg-warning/10 text-warning" },
          { label: "Out of Stock", value: outOfStockCount, icon: XCircle, tone: "bg-destructive/10 text-destructive" },
        ].map((item) => (
          <Card key={item.label} className="overflow-hidden rounded-2xl border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-3xl font-black tracking-tight">{item.value}</p>
              </div>
              <div className={cn("rounded-2xl p-3 shadow-sm", item.tone)}>
                <item.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="h-11 rounded-xl border-border/70 bg-background pl-10" placeholder={productCopy.search} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="h-11 rounded-xl sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStockStatus} onValueChange={(v) => { setFilterStockStatus(v as StockFilter); setPage(1); }}>
          <SelectTrigger className="h-11 rounded-xl sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paged.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No products found</p>
          </div>
        ) : paged.map((p) => (
          <Card key={p.id} className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-0">
              <div className="flex gap-3 p-3">
                <ProductThumbnail src={p.image} name={p.name} className="h-20 w-20" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                    </div>
                    {stockBadge(p)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[p.brand, p.modelNumber, p.size, p.color, p.batchNumber, p.storageLocation].filter(Boolean).slice(0, 4).map((detail) => (
                      <Badge key={detail} variant="secondary" className="rounded-full text-[10px]">{detail}</Badge>
                    ))}
                    {expiryBadge(p)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t bg-muted/25 text-center text-xs">
                <div className="p-2">
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-black text-primary">Rs. {p.price.toFixed(2)}</p>
                </div>
                <div className="border-x p-2">
                  <p className="text-muted-foreground">Stock</p>
                  <p className="font-bold">{p.stock} {p.unit || "pcs"}</p>
                </div>
                <div className="p-2">
                  <p className="text-muted-foreground">Min</p>
                  <p className="font-bold">{p.minStock}</p>
                </div>
              </div>
              <div className="flex gap-2 p-3">
                <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2" onClick={() => openEdit(p)}>
                  <Pencil className="w-3.5 h-3.5" />Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden overflow-hidden rounded-3xl border-border/70 shadow-sm md:block">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-muted/50 to-background px-5 py-4">
            <div>
              <p className="text-base font-black">Inventory Register</p>
              <p className="text-xs text-muted-foreground">Search, edit, stock status and account mapping in one place.</p>
            </div>
            <Badge variant="outline" className="rounded-full bg-background px-3 py-1">
              {filtered.length} records
            </Badge>
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[300px] px-5 py-3">
                  <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                    Product<ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[150px]">Category</TableHead>
                <TableHead className="min-w-[250px]">Details</TableHead>
                <TableHead className="min-w-[210px]">Finance</TableHead>
                <TableHead className="min-w-[120px] text-right">
                  <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => toggleSort("price")}>
                    Price<ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[110px] text-right">Cost</TableHead>
                <TableHead className="min-w-[130px] text-right">
                  <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => toggleSort("stock")}>
                    Stock<ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="min-w-[130px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No products found
                  </TableCell>
                </TableRow>
              ) : paged.map((p) => (
                <TableRow key={p.id} className="align-middle border-b last:border-0 hover:bg-emerald-50/30">
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail src={p.image} name={p.name} className="h-14 w-14 rounded-2xl" />
                      <div className="min-w-0">
                        <span className="block max-w-[220px] truncate text-sm font-black">{p.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                        {p.barcode && <span className="block truncate text-[11px] text-muted-foreground">Barcode {p.barcode}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">{p.category}</Badge>
                    <div className="mt-1 text-xs text-muted-foreground">Unit: {p.unit || "pcs"}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-1.5">
                      {p.brand && <Badge variant="secondary" className="rounded-full bg-muted/70 text-[10px]">{p.brand}</Badge>}
                      {p.modelNumber && <Badge variant="secondary" className="rounded-full bg-muted/70 text-[10px]">Model: {p.modelNumber}</Badge>}
                      {p.size && <Badge variant="secondary" className="rounded-full bg-muted/70 text-[10px]">Size: {p.size}</Badge>}
                      {p.color && <Badge variant="secondary" className="rounded-full bg-muted/70 text-[10px]">Color: {p.color}</Badge>}
                      {p.batchNumber && <Badge variant="secondary" className="rounded-full bg-muted/70 text-[10px]">Batch: {p.batchNumber}</Badge>}
                      {expiryBadge(p)}
                      {p.warrantyMonths ? <Badge variant="outline" className="text-[10px]">Warranty: {p.warrantyMonths} mo</Badge> : null}
                      {p.storageLocation && <Badge variant="secondary" className="rounded-full bg-muted/70 text-[10px]">Rack: {p.storageLocation}</Badge>}
                      {!p.brand && !p.modelNumber && !p.size && !p.color && !p.batchNumber && !p.storageLocation && !p.expiryDate && !p.warrantyMonths && (
                        <span>No extra fields</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="rounded-2xl border bg-muted/20 p-2">
                      <div className="font-semibold text-foreground">{p.inventoryAccount || "Inventory Stock"}</div>
                      <div className="mt-1 text-muted-foreground">Sale: {p.salesAccount || "Sales Revenue"}</div>
                      <div className="text-muted-foreground">Buy: {p.purchaseAccount || "Purchase / COGS"}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-black text-emerald-700">Rs. {p.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">Rs. {p.costPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm">
                    <div className="font-bold">{p.stock} {p.unit || "pcs"}</div>
                    <div className="text-xs text-muted-foreground">Min {p.minStock}</div>
                  </TableCell>
                  <TableCell>{stockBadge(p)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => openEdit(p)} title="Edit product">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-background text-destructive hover:text-destructive" onClick={async () => {
                        try { await productsApi.delete(Number(p.id)); setProducts((prev) => prev.filter((x) => x.id !== p.id)); }
                        catch (err) { toast.error((err as Error).message); }
                      }} title="Delete product">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <div className="hidden">
        {paged.length < 0 && paged.map((p) => (
          <Card key={p.id}>
            <CardContent>
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
                    {expiryBadge(p)}
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
      <Card className="hidden">
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
                      {expiryBadge(p)}
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

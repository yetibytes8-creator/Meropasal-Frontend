import {
  Coffee,
  Hammer,
  Package,
  Pill,
  Shirt,
  ShoppingBasket,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/contexts/AuthContext";

export type BusinessProfileKey =
  | "restaurant"
  | "cafe"
  | "general_inventory"
  | "hardware"
  | "clothing"
  | "footwear"
  | "pharmacy"
  | "supermarket"
  | "kirana"
  | "electronics"
  | "bakery"
  | "combo"
  | "other";

export type BusinessProfile = {
  key: BusinessProfileKey;
  label: string;
  moduleLabel: string;
  inventoryLabel: string;
  description: string;
  icon: LucideIcon;
  defaultModule: "restaurant" | "inventory" | "finance";
  branchLimit: number;
  enabledFeatures: Partial<Record<FeatureKey, boolean>>;
  productLabel: string;
  stockLabel: string;
  purchaseLabel: string;
  salesLabel: string;
  keyFields: string[];
  setupChecklist: string[];
  defaultCategories?: string[];
  defaultUnits?: string[];
  visibleProductFields?: string[];
  requiredProductFields?: string[];
  implementationFlow?: string[];
  roleAccessGuide?: string[];
  financeMapping?: string[];
};

const shopCore: Partial<Record<FeatureKey, boolean>> = {
  restaurant: false,
  inventory: true,
  finance: true,
  billing: true,
  reports: true,
  staff: true,
  customers: true,
  branches: true,
  bankRecon: true,
  taxes: true,
  refunds: true,
  qrMenu: false,
  delivery: false,
};

const restaurantCore: Partial<Record<FeatureKey, boolean>> = {
  restaurant: true,
  inventory: false,
  finance: true,
  billing: true,
  reports: true,
  staff: true,
  customers: true,
  branches: true,
  bankRecon: true,
  taxes: true,
  refunds: true,
  qrMenu: true,
  delivery: true,
};

export const businessProfiles: Record<BusinessProfileKey, BusinessProfile> = {
  cafe: {
    key: "cafe",
    label: "Cafe",
    moduleLabel: "Cafe",
    inventoryLabel: "Cafe Stock",
    description: "Menu, tables, QR order, kitchen, billing, purchase and accounts.",
    icon: Coffee,
    defaultModule: "restaurant",
    branchLimit: 1,
    enabledFeatures: restaurantCore,
    productLabel: "Menu Items",
    stockLabel: "Ingredients",
    purchaseLabel: "Ingredient Purchase",
    salesLabel: "Billing",
    keyFields: ["Menu item", "Sub menu", "Ingredient", "Table", "KOT"],
    setupChecklist: ["Enable QR menu", "Set tables and kitchen", "Map daily sales to finance"],
  },
  restaurant: {
    key: "restaurant",
    label: "Restaurant",
    moduleLabel: "Restaurant",
    inventoryLabel: "Restaurant Stock",
    description: "Full restaurant flow with menu, orders, kitchen, delivery and finance.",
    icon: Coffee,
    defaultModule: "restaurant",
    branchLimit: 1,
    enabledFeatures: restaurantCore,
    productLabel: "Menu Items",
    stockLabel: "Ingredients",
    purchaseLabel: "Kitchen Purchase",
    salesLabel: "Billing",
    keyFields: ["Menu item", "Recipe / ingredient", "Table", "Delivery", "KOT"],
    setupChecklist: ["Enable table and kitchen flow", "Use QR/public menu", "Track purchase and daily sales"],
  },
  general_inventory: {
    key: "general_inventory",
    label: "General Inventory",
    moduleLabel: "Inventory",
    inventoryLabel: "Inventory",
    description: "Products, stock control, purchase, sales POS, suppliers and finance.",
    icon: Package,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Products",
    stockLabel: "Stock Control",
    purchaseLabel: "Purchases",
    salesLabel: "Sales POS",
    keyFields: ["SKU", "Barcode", "Unit", "Purchase price", "Selling price", "Supplier"],
    setupChecklist: ["Enable POS billing", "Add product categories", "Set reorder alerts"],
  },
  hardware: {
    key: "hardware",
    label: "Hardware Store",
    moduleLabel: "Hardware",
    inventoryLabel: "Hardware Inventory",
    description: "Items, units, suppliers, purchase order, quotation, sale and returns.",
    icon: Hammer,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Items / Materials",
    stockLabel: "Stock & Units",
    purchaseLabel: "Supplier Purchase",
    salesLabel: "Counter Sales",
    keyFields: ["Item code", "Unit", "Brand", "Size / specification", "Supplier"],
    setupChecklist: ["Use unit-wise stock", "Enable purchase order", "Track quotations and returns"],
    defaultCategories: ["Tools", "Fasteners", "Paint", "Electrical", "Plumbing", "Sanitary", "Cement / Rod", "Machine Parts"],
    defaultUnits: ["pcs", "kg", "gram", "meter", "liter", "roll", "box", "packet", "set"],
    visibleProductFields: ["brand", "modelNumber", "size", "storageLocation", "warrantyMonths"],
    requiredProductFields: ["name", "sku", "category", "unit", "price", "costPrice"],
    implementationFlow: ["Create supplier and opening stock", "Use unit-wise purchase order", "Map sales and purchase to ledger", "Track low stock and returns"],
    roleAccessGuide: ["Owner: all modules", "Manager: stock, purchase, sales, reports", "Cashier: POS and customer receipt", "Accountant: finance, bank, tax, supplier ledger"],
    financeMapping: ["Sales -> Sales Revenue", "Purchase -> Inventory / COGS", "Supplier due -> Accounts Payable", "Return -> Sales Return / Purchase Return"],
  },
  clothing: {
    key: "clothing",
    label: "Clothing Store",
    moduleLabel: "Clothing",
    inventoryLabel: "Clothing Inventory",
    description: "Style, size, color, SKU, stock, sales, return and customer ledger.",
    icon: Shirt,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Styles / SKUs",
    stockLabel: "Size & Color Stock",
    purchaseLabel: "Garment Purchase",
    salesLabel: "Retail Sales",
    keyFields: ["Style code", "Size", "Color", "Season", "Supplier"],
    setupChecklist: ["Use size/color stock", "Track exchanges and refunds", "Keep category-wise sales"],
    defaultCategories: ["Men", "Women", "Kids", "Shirts", "T-Shirts", "Pants", "Kurta", "Saree", "Jackets", "Accessories"],
    defaultUnits: ["pcs", "pair", "set", "bundle"],
    visibleProductFields: ["brand", "modelNumber", "size", "color", "storageLocation", "batchNumber"],
    requiredProductFields: ["name", "sku", "category", "unit", "size", "color", "price", "costPrice"],
    implementationFlow: [
      "Create branch / counter and cash account",
      "Create category, sub category, style code, size and color variants",
      "Add opening stock by size and color",
      "Create suppliers and purchase orders",
      "Enable POS billing, exchange, refund and customer credit",
      "Auto-post sales, purchases, returns and payments to finance",
    ],
    roleAccessGuide: [
      "Owner: full access, settings, finance approval",
      "Manager: product, stock, purchase, sales, reports",
      "Cashier: POS billing, discount, exchange, refund request",
      "Accountant: ledger, bank, tax, supplier/customer dues, reports",
      "Viewer: dashboard and reports only",
    ],
    financeMapping: [
      "Cash/Card sale -> Cash/Bank Dr, Sales Revenue Cr",
      "Credit sale -> Customer Receivable Dr, Sales Revenue Cr",
      "Purchase -> Inventory Stock Dr, Supplier Payable/Cash Cr",
      "Refund/Exchange -> Sales Return Dr, Cash/Customer Ledger Cr",
      "Discount -> Sales Discount / contra revenue",
    ],
  },
  footwear: {
    key: "footwear",
    label: "Footwear Store",
    moduleLabel: "Footwear",
    inventoryLabel: "Footwear Inventory",
    description: "Shoes, sandals, slippers, size/color stock, sales, exchange and supplier purchase.",
    icon: Shirt,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Footwear SKUs",
    stockLabel: "Size & Color Stock",
    purchaseLabel: "Footwear Purchase",
    salesLabel: "Footwear Sales",
    keyFields: ["Style code", "Shoe size", "Color", "Brand", "Supplier"],
    setupChecklist: ["Use shoe size/color stock", "Track exchanges and refunds", "Keep brand-wise sales"],
    defaultCategories: ["Men Shoes", "Women Shoes", "Kids Shoes", "Sandals", "Slippers", "Sports", "Formal", "Accessories"],
    defaultUnits: ["pair", "pcs", "box", "set"],
    visibleProductFields: ["brand", "modelNumber", "size", "color", "storageLocation", "warrantyMonths"],
    requiredProductFields: ["name", "sku", "category", "unit", "size", "color", "price", "costPrice"],
    implementationFlow: ["Create size/color variants", "Add brand and supplier", "Track purchase order and stock receive", "Enable exchange/refund and brand-wise report"],
    roleAccessGuide: ["Owner: all access", "Manager: stock and reports", "Cashier: sales and return", "Accountant: finance and supplier ledger"],
    financeMapping: ["Sales -> Sales Revenue", "Purchase -> Inventory Stock", "Return -> Sales Return", "Supplier payment -> Accounts Payable settlement"],
  },
  pharmacy: {
    key: "pharmacy",
    label: "Pharmacy",
    moduleLabel: "Pharmacy",
    inventoryLabel: "Pharmacy Inventory",
    description: "Medicines, batch, expiry, supplier purchase, POS, returns and tax reports.",
    icon: Pill,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Medicines",
    stockLabel: "Batch & Expiry Stock",
    purchaseLabel: "Medicine Purchase",
    salesLabel: "Pharmacy POS",
    keyFields: ["Medicine name", "Batch no.", "Expiry date", "MRP", "Supplier", "Prescription optional"],
    setupChecklist: ["Track batch and expiry", "Enable supplier purchase order", "Use tax and return reports"],
    defaultCategories: ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Surgical", "Personal Care"],
    defaultUnits: ["strip", "tablet", "capsule", "bottle", "vial", "tube", "box", "pcs"],
    visibleProductFields: ["brand", "modelNumber", "batchNumber", "expiryDate", "storageLocation"],
    requiredProductFields: ["name", "sku", "category", "unit", "batchNumber", "expiryDate", "price", "costPrice"],
    implementationFlow: ["Create medicine categories", "Add batch, expiry, MRP and supplier", "Enable expiry alerts", "Track purchase return and supplier due"],
    roleAccessGuide: ["Owner: all access", "Pharmacist/Manager: stock, sales, expiry", "Cashier: POS", "Accountant: finance, tax and supplier ledger"],
    financeMapping: ["Medicine sale -> Sales Revenue", "Expired/damaged -> Stock Adjustment Expense", "Purchase -> Inventory Stock", "Supplier payment -> Bank/Cash"],
  },
  supermarket: {
    key: "supermarket",
    label: "Supermarket",
    moduleLabel: "Supermarket",
    inventoryLabel: "Supermarket Inventory",
    description: "Barcode POS, stock, suppliers, purchase, discounts and branch reports.",
    icon: ShoppingBasket,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Products",
    stockLabel: "Barcode Stock",
    purchaseLabel: "Supplier Purchase",
    salesLabel: "POS Sales",
    keyFields: ["Barcode", "MRP", "Unit", "Reorder level", "Supplier"],
    setupChecklist: ["Enable barcode POS", "Add supplier purchase flow", "Set low stock alerts"],
    defaultCategories: ["Beverages", "Grocery", "Snacks", "Personal Care", "Household", "Dairy", "Frozen", "Stationery"],
    defaultUnits: ["pcs", "packet", "kg", "gram", "liter", "bottle", "box"],
    visibleProductFields: ["brand", "batchNumber", "expiryDate", "storageLocation"],
    requiredProductFields: ["name", "sku", "barcode", "category", "unit", "price", "costPrice"],
    implementationFlow: ["Enable barcode billing", "Add product category and supplier", "Set reorder level", "Use purchase order and stock receive"],
    roleAccessGuide: ["Owner: all access", "Manager: stock and purchase", "Cashier: POS", "Accountant: finance and bank"],
    financeMapping: ["Counter sale -> Cash/Bank", "Credit sale -> Receivable", "Purchase -> Inventory", "Discount -> Sales Discount"],
  },
  kirana: {
    key: "kirana",
    label: "Kirana / Grocery",
    moduleLabel: "Kirana",
    inventoryLabel: "Kirana Inventory",
    description: "Daily grocery, barcode billing, loose/unit items, supplier purchase and credit ledger.",
    icon: ShoppingBasket,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Grocery Items",
    stockLabel: "Unit / Loose Stock",
    purchaseLabel: "Supplier Purchase",
    salesLabel: "Counter Billing",
    keyFields: ["Barcode", "Unit", "MRP", "Loose quantity", "Expiry optional", "Supplier"],
    setupChecklist: ["Turn on POS billing", "Use unit/loose quantity stock", "Track customer credit and supplier dues"],
    defaultCategories: ["Rice / Grains", "Pulses", "Oil", "Spices", "Snacks", "Beverages", "Personal", "Household"],
    defaultUnits: ["pcs", "packet", "kg", "gram", "liter", "bottle", "box", "sack"],
    visibleProductFields: ["brand", "batchNumber", "expiryDate", "storageLocation"],
    requiredProductFields: ["name", "sku", "category", "unit", "price", "costPrice"],
    implementationFlow: ["Create loose/unit items", "Add supplier and opening stock", "Enable POS discount and credit", "Track supplier due and daily cash"],
    roleAccessGuide: ["Owner: all access", "Manager: stock and purchase", "Cashier: billing and receipt", "Accountant: finance and dues"],
    financeMapping: ["Daily sales -> Cash / Bank", "Supplier purchase -> Inventory / COGS", "Credit customer -> Accounts Receivable", "Expense -> Expense ledger"],
  },
  electronics: {
    key: "electronics",
    label: "Electronics",
    moduleLabel: "Electronics",
    inventoryLabel: "Electronics Inventory",
    description: "Product, serial/IMEI tracking, purchase, warranty, billing and finance.",
    icon: Package,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Devices / SKUs",
    stockLabel: "Serial Stock",
    purchaseLabel: "Vendor Purchase",
    salesLabel: "Device Sales",
    keyFields: ["Serial / IMEI", "Warranty", "Brand", "Model", "Supplier", "Purchase bill"],
    setupChecklist: ["Enable serial tracking", "Keep warranty detail on invoice", "Map supplier purchase to finance"],
    defaultCategories: ["Mobiles", "Laptops", "Accessories", "Printers", "Networking", "CCTV", "Storage", "Power Backup"],
    defaultUnits: ["pcs", "set", "box"],
    visibleProductFields: ["brand", "modelNumber", "size", "color", "batchNumber", "warrantyMonths", "storageLocation"],
    requiredProductFields: ["name", "sku", "category", "unit", "brand", "modelNumber", "price", "costPrice"],
    implementationFlow: ["Enable serial/IMEI tracking", "Add warranty and model detail", "Create supplier purchase order", "Track customer warranty and return"],
    roleAccessGuide: ["Owner: all access", "Manager: product/stock", "Sales: billing and warranty", "Accountant: finance and supplier ledger"],
    financeMapping: ["Device sale -> Sales Revenue", "Warranty replacement -> Stock Adjustment", "Purchase -> Inventory", "Supplier due -> Accounts Payable"],
  },
  bakery: {
    key: "bakery",
    label: "Bakery",
    moduleLabel: "Bakery",
    inventoryLabel: "Bakery Stock",
    description: "Menu, production stock, orders, billing, QR menu and daily accounts.",
    icon: Coffee,
    defaultModule: "restaurant",
    branchLimit: 1,
    enabledFeatures: restaurantCore,
    productLabel: "Bakery Items",
    stockLabel: "Raw Materials",
    purchaseLabel: "Bakery Purchase",
    salesLabel: "Billing",
    keyFields: ["Batch date", "Production qty", "Shelf life", "Ingredient cost"],
    setupChecklist: ["Enable restaurant/menu flow", "Track ingredients", "Use daily sales reports"],
  },
  combo: {
    key: "combo",
    label: "Restaurant + Inventory",
    moduleLabel: "Combo",
    inventoryLabel: "Inventory",
    description: "Restaurant and shop inventory together, with shared finance and branches.",
    icon: Store,
    defaultModule: "restaurant",
    branchLimit: 5,
    enabledFeatures: {
      ...restaurantCore,
      inventory: true,
    },
    productLabel: "Products / Menu",
    stockLabel: "Stock Control",
    purchaseLabel: "Purchases",
    salesLabel: "Sales / Billing",
    keyFields: ["Menu item", "Product SKU", "Ingredient", "Stock item", "Branch"],
    setupChecklist: ["Enable both restaurant and inventory", "Use shared finance", "Create branch-wise reports"],
  },
  other: {
    key: "other",
    label: "Custom Business",
    moduleLabel: "Business",
    inventoryLabel: "Inventory",
    description: "Custom setup. Enable only the modules and features this company needs.",
    icon: Store,
    defaultModule: "inventory",
    branchLimit: 1,
    enabledFeatures: shopCore,
    productLabel: "Products",
    stockLabel: "Stock",
    purchaseLabel: "Purchases",
    salesLabel: "Sales",
    keyFields: ["SKU", "Unit", "Selling price", "Purchase price", "Supplier"],
    setupChecklist: ["Choose only required modules", "Set finance access", "Add staff roles"],
  },
};

const aliases: Record<string, BusinessProfileKey> = {
  inventory: "general_inventory",
  clothes: "clothing",
  cloth: "clothing",
  garment: "clothing",
  footwear: "footwear",
  shoes: "footwear",
  shoe: "footwear",
  jutta: "footwear",
  medical: "pharmacy",
  pharma: "pharmacy",
  grocery: "kirana",
  kirana_pasal: "kirana",
  daily_needs: "kirana",
  retail: "general_inventory",
  shop: "general_inventory",
};

export function resolveBusinessProfile(value?: unknown): BusinessProfileKey {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!raw) return "other";
  const aliased = aliases[raw] || raw;
  return aliased in businessProfiles ? (aliased as BusinessProfileKey) : "other";
}

export function getBusinessProfile(value?: unknown): BusinessProfile {
  return businessProfiles[resolveBusinessProfile(value)];
}

export function resolveBusinessProfileFromSystemConfig(config?: {
  businessProfile?: unknown;
  defaultModule?: unknown;
  profileLabels?: Record<string, unknown>;
}, fallback?: unknown): BusinessProfileKey {
  if (config?.businessProfile) return resolveBusinessProfile(config.businessProfile);

  const labelText = Object.values(config?.profileLabels || {})
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (labelText) {
    if (/cloth|garment|fashion|shirt|saree|kurta/.test(labelText)) return "clothing";
    if (/footwear|shoe|jutta|sandal|slipper/.test(labelText)) return "footwear";
    if (/pharma|medicine|medical|drug/.test(labelText)) return "pharmacy";
    if (/hardware|tool|paint|plumb|electric/.test(labelText)) return "hardware";
    if (/kirana|grocery/.test(labelText)) return "kirana";
    if (/supermarket/.test(labelText)) return "supermarket";
    if (/electronic|mobile|laptop|device/.test(labelText)) return "electronics";
    if (/restaurant/.test(labelText)) return "restaurant";
    if (/cafe|coffee/.test(labelText)) return "cafe";
  }

  if (fallback) return resolveBusinessProfile(fallback);
  return config?.defaultModule === "restaurant" ? "restaurant" : "general_inventory";
}

export function getBusinessProfileFromSystemConfig(config?: {
  businessProfile?: unknown;
  defaultModule?: unknown;
  profileLabels?: Record<string, unknown>;
}, fallback?: unknown): BusinessProfile {
  return businessProfiles[resolveBusinessProfileFromSystemConfig(config, fallback)];
}

export function profileFeatureDefaults(value?: unknown): Partial<Record<FeatureKey, boolean>> {
  return getBusinessProfile(value).enabledFeatures;
}

export function profileModuleAccess(value?: unknown): "cafe" | "inventory" | "combo" {
  const profile = getBusinessProfile(value);
  if (profile.key === "combo") return "combo";
  return profile.defaultModule === "restaurant" ? "cafe" : "inventory";
}

export function buildBusinessSystemConfig(value?: unknown) {
  const businessProfile = resolveBusinessProfile(value);
  const profile = getBusinessProfile(businessProfile);
  return {
    businessProfile,
    defaultModule: profile.defaultModule,
    branchLimit: profile.branchLimit,
    features: profileFeatureDefaults(businessProfile),
    profileLabels: {
      moduleLabel: profile.moduleLabel,
      inventoryLabel: profile.inventoryLabel,
      productLabel: profile.productLabel,
      stockLabel: profile.stockLabel,
      purchaseLabel: profile.purchaseLabel,
      salesLabel: profile.salesLabel,
    },
    profileFields: profile.keyFields,
    productConfig: {
      categories: profile.defaultCategories ?? [],
      units: profile.defaultUnits ?? [],
      visibleFields: profile.visibleProductFields ?? [],
      requiredFields: profile.requiredProductFields ?? ["name", "sku", "category", "unit", "price", "costPrice"],
      labels: {
        product: profile.productLabel,
        stock: profile.stockLabel,
        purchase: profile.purchaseLabel,
        sales: profile.salesLabel,
      },
    },
    setupChecklist: profile.setupChecklist,
    implementationFlow: profile.implementationFlow ?? profile.setupChecklist,
    roleAccessGuide: profile.roleAccessGuide ?? [],
    financeMapping: profile.financeMapping ?? [],
  };
}

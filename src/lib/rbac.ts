export type StaffRole = "admin" | "manager" | "cashier" | "kitchen" | "staff";

// Every page in the system has a unique key
export type PageKey =
  // Restaurant
  | "r-dashboard" | "r-menu" | "r-ingredients" | "r-purchases" | "r-services" | "r-orders" | "r-tables" | "r-kitchen"
  | "r-qr-codes" | "r-billing"   | "r-customers" | "r-staff" | "r-alerts" | "r-settings"
  // Inventory
  | "i-dashboard" | "i-products"  | "i-stock-control" | "i-operations" | "i-branches" | "i-sales"  | "i-purchases" | "i-suppliers"
  | "i-expenses"  | "i-customers" | "i-staff"  | "i-reports"   | "i-alerts" | "i-settings"
  // Finance
  | "f-dashboard" | "f-day-book" | "f-income" | "f-expenses" | "f-invoices" | "f-accounts"
  | "f-budget" | "f-transactions" | "f-cash-banks" | "f-tax-rates" | "f-balance-transfer"
  | "f-chart-of-accounts" | "f-reports";

// Map every route path to a page key
export const ROUTE_PAGE: Record<string, PageKey> = {
  "/restaurant":           "r-dashboard",
  "/restaurant/menu":      "r-menu",
  "/restaurant/ingredients": "r-ingredients",
  "/restaurant/stock":     "r-ingredients",
  "/restaurant/purchases":  "r-purchases",
  "/restaurant/services":  "r-services",
  "/restaurant/orders":    "r-orders",
  "/restaurant/tables":    "r-tables",
  "/restaurant/qr-codes":  "r-qr-codes",
  "/restaurant/kitchen":   "r-kitchen",
  "/restaurant/billing":   "r-billing",
  "/restaurant/customers": "r-customers",
  "/restaurant/staff":     "r-staff",
  "/restaurant/alerts":    "r-alerts",
  "/restaurant/settings":  "r-settings",

  "/inventory":            "i-dashboard",
  "/inventory/products":   "i-products",
  "/inventory/stock-control": "i-stock-control",
  "/inventory/operations": "i-operations",
  "/inventory/branches":   "i-branches",
  "/inventory/sales":      "i-sales",
  "/inventory/purchases":  "i-purchases",
  "/inventory/suppliers":  "i-suppliers",
  "/inventory/expenses":   "i-expenses",
  "/inventory/customers":  "i-customers",
  "/inventory/staff":      "i-staff",
  "/inventory/reports":    "i-reports",
  "/inventory/alerts":     "i-alerts",
  "/inventory/settings":   "i-settings",

  "/finance":              "f-dashboard",
  "/finance/day-book":     "f-day-book",
  "/finance/income":       "f-income",
  "/finance/expenses":     "f-expenses",
  "/finance/invoices":     "f-invoices",
  "/finance/accounts":     "f-accounts",
  "/finance/budget":       "f-budget",
  "/finance/transactions": "f-transactions",
  "/finance/cash-banks":   "f-cash-banks",
  "/finance/tax-rates":    "f-tax-rates",
  "/finance/balance-transfer": "f-balance-transfer",
  "/finance/chart-of-accounts": "f-chart-of-accounts",
  "/finance/reports":      "f-reports",

  "/restaurant/finance":         "f-dashboard",
  "/restaurant/day-book":        "f-day-book",
  "/restaurant/income":          "f-income",
  "/restaurant/expenses":        "f-expenses",
  "/restaurant/invoices":        "f-invoices",
  "/restaurant/accounts":        "f-accounts",
  "/restaurant/budget":          "f-budget",
  "/restaurant/transactions":    "f-transactions",
  "/restaurant/cash-banks":      "f-cash-banks",
  "/restaurant/tax-rates":       "f-tax-rates",
  "/restaurant/balance-transfer": "f-balance-transfer",
  "/restaurant/chart-of-accounts": "f-chart-of-accounts",
  "/restaurant/finance-reports": "f-reports",

  "/inventory/finance":         "f-dashboard",
  "/inventory/day-book":        "f-day-book",
  "/inventory/income":          "f-income",
  "/inventory/invoices":        "f-invoices",
  "/inventory/accounts":        "f-accounts",
  "/inventory/budget":          "f-budget",
  "/inventory/transactions":    "f-transactions",
  "/inventory/cash-banks":      "f-cash-banks",
  "/inventory/tax-rates":       "f-tax-rates",
  "/inventory/balance-transfer": "f-balance-transfer",
  "/inventory/chart-of-accounts": "f-chart-of-accounts",
  "/inventory/finance-reports": "f-reports",
};

// Which pages each role can access (* = all)
const PERMISSIONS: Record<StaffRole, PageKey[] | ["*"]> = {
  // Admin — full unrestricted access
  admin: ["*"],

  // Manager — everything except nothing; can also change settings
  manager: [
    "r-dashboard", "r-menu", "r-ingredients", "r-purchases", "r-services", "r-orders", "r-tables", "r-kitchen",
    "r-qr-codes", "r-billing", "r-customers", "r-staff", "r-alerts", "r-settings",
    "i-dashboard", "i-products", "i-stock-control", "i-operations", "i-branches", "i-sales", "i-purchases", "i-suppliers",
    "i-expenses", "i-customers", "i-staff", "i-reports", "i-alerts", "i-settings",
    "f-dashboard", "f-day-book", "f-income", "f-expenses", "f-invoices", "f-accounts",
    "f-budget", "f-transactions", "f-cash-banks", "f-tax-rates", "f-balance-transfer",
    "f-chart-of-accounts", "f-reports",
  ],

  // Cashier — POS, billing, orders, customers only
  cashier: [
    "r-dashboard", "r-orders", "r-tables", "r-qr-codes", "r-billing", "r-customers",
    "i-dashboard", "i-sales", "i-customers",
  ],

  // Kitchen — restaurant kitchen display and order viewing only; no inventory
  kitchen: [
    "r-dashboard", "r-orders", "r-kitchen",
  ],

  // Inventory Staff — stock/product management in inventory only; no restaurant
  staff: [
    "i-dashboard", "i-products", "i-stock-control", "i-operations", "i-branches", "i-purchases", "i-suppliers", "i-alerts",
  ],
};

/** Returns true if the role may access the given page key */
export function canAccessPage(role: StaffRole, page: PageKey): boolean {
  const allowed = PERMISSIONS[role];
  if (allowed[0] === "*") return true;
  return (allowed as PageKey[]).includes(page);
}

/** Returns true if the role may access the given route path */
export function canAccessRoute(role: StaffRole, path: string): boolean {
  const page = ROUTE_PAGE[path];
  if (!page) return true; // unknown route — let pass
  return canAccessPage(role, page);
}

// Human-readable role labels and descriptions
export const ROLE_META: Record<StaffRole, { label: string; description: string; color: string; pages: string }> = {
  admin: {
    label: "Admin",
    description: "Full system control — all pages, settings, and staff management.",
    color: "bg-primary/10 text-primary border-primary/20",
    pages: "All pages",
  },
  manager: {
    label: "Manager",
    description: "Full operations access including settings, Finance, and all reports.",
    color: "bg-info/10 text-info border-info/20",
    pages: "All pages including Services and Finance",
  },
  cashier: {
    label: "Cashier",
    description: "POS sales, billing, orders, tables, and customer management only.",
    color: "bg-success/10 text-success border-success/20",
    pages: "Dashboard, Orders, Tables, QR Codes, Billing, Customers, Sales (POS)",
  },
  kitchen: {
    label: "Kitchen",
    description: "Restaurant kitchen display and order viewing only. No billing or inventory access.",
    color: "bg-restaurant/10 text-restaurant border-restaurant/20",
    pages: "Dashboard, Orders, Kitchen Display",
  },
  staff: {
    label: "Inventory Staff",
    description: "Inventory stock and product management only. No restaurant or reports access.",
    color: "bg-inventory/10 text-inventory border-inventory/20",
    pages: "Inventory Dashboard, Products, Stock Control, Operations, Branches, Purchases, Suppliers, Alerts",
  },
};

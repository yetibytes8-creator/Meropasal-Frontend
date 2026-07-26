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

export interface StaffAccessConfig {
  mode?: "role" | "custom";
  allowedPages?: PageKey[];
}

export type PageAccessItem = {
  key: PageKey;
  label: string;
  description: string;
};

export type PageAccessGroup = {
  title: string;
  description: string;
  pages: PageAccessItem[];
};

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

export const PAGE_ACCESS_GROUPS: PageAccessGroup[] = [
  {
    title: "Restaurant",
    description: "Menu, table, kitchen, QR and billing operations.",
    pages: [
      { key: "r-dashboard", label: "Dashboard", description: "Restaurant overview and daily status." },
      { key: "r-menu", label: "Menu", description: "Menu items, categories and offers." },
      { key: "r-ingredients", label: "Ingredients / Stock", description: "Kitchen stock and ingredients." },
      { key: "r-purchases", label: "Purchases", description: "Restaurant purchase orders and receiving." },
      { key: "r-services", label: "Services", description: "Service catalog and charges." },
      { key: "r-orders", label: "Orders", description: "Pending, preparing and ready orders." },
      { key: "r-tables", label: "Tables", description: "Table status, booking and occupancy." },
      { key: "r-kitchen", label: "Kitchen", description: "Kitchen display and preparation flow." },
      { key: "r-qr-codes", label: "QR Codes", description: "Table QR cards and QR menu links." },
      { key: "r-billing", label: "Billing", description: "Invoice, payment and receipt flow." },
      { key: "r-customers", label: "Customers", description: "Restaurant customer records." },
      { key: "r-staff", label: "Staff", description: "Restaurant staff management." },
      { key: "r-alerts", label: "Alerts", description: "Operational alerts." },
      { key: "r-settings", label: "Settings", description: "Restaurant business settings." },
    ],
  },
  {
    title: "Inventory",
    description: "Products, stock, purchase, supplier and POS workflow.",
    pages: [
      { key: "i-dashboard", label: "Dashboard", description: "Inventory overview." },
      { key: "i-products", label: "Products", description: "Product catalog and profile fields." },
      { key: "i-stock-control", label: "Stock Control", description: "Stock adjustment and reorder plan." },
      { key: "i-operations", label: "Operations Hub", description: "Returns, damage, expiry and operational tasks." },
      { key: "i-branches", label: "Branches", description: "Branch-wise stock and settings." },
      { key: "i-sales", label: "Sales / POS", description: "Inventory billing and sales." },
      { key: "i-purchases", label: "Purchases", description: "Purchase orders and purchase bills." },
      { key: "i-suppliers", label: "Suppliers", description: "Supplier records." },
      { key: "i-expenses", label: "Expenses", description: "Inventory expenses." },
      { key: "i-customers", label: "Customers", description: "Inventory customers and credit." },
      { key: "i-staff", label: "Staff", description: "Inventory staff management." },
      { key: "i-reports", label: "Reports", description: "Inventory reports." },
      { key: "i-alerts", label: "Alerts", description: "Stock and expiry alerts." },
      { key: "i-settings", label: "Settings", description: "Inventory business settings." },
    ],
  },
  {
    title: "Finance",
    description: "Accounts, ledgers, cash, reports, tax and vouchers.",
    pages: [
      { key: "f-dashboard", label: "Dashboard", description: "Finance overview." },
      { key: "f-day-book", label: "Day Book", description: "Daily vouchers and movement." },
      { key: "f-income", label: "Income", description: "Income records and receipts." },
      { key: "f-expenses", label: "Expenses", description: "Expense records and approvals." },
      { key: "f-invoices", label: "Invoices", description: "Sales invoices and collections." },
      { key: "f-accounts", label: "Accounts", description: "Account balances and ledger view." },
      { key: "f-budget", label: "Budget", description: "Budget planning and branch budget." },
      { key: "f-transactions", label: "Transactions", description: "Complete transaction ledger." },
      { key: "f-cash-banks", label: "Cash & Banks", description: "Cash, bank and cheque position." },
      { key: "f-tax-rates", label: "Tax / TDS", description: "VAT, TDS and tax settings." },
      { key: "f-balance-transfer", label: "Balance Transfer", description: "Transfer between cash and bank." },
      { key: "f-chart-of-accounts", label: "Chart of Accounts", description: "Account groups, subgroups and ledgers." },
      { key: "f-reports", label: "Reports", description: "Trial balance, P&L and balance sheet." },
    ],
  },
];

const ALL_PAGES = Array.from(new Set(Object.values(ROUTE_PAGE)));

export function pagesForRole(role: StaffRole): PageKey[] {
  const allowed = PERMISSIONS[role];
  if (allowed[0] === "*") return ALL_PAGES;
  return [...(allowed as PageKey[])];
}

export function staffAllowedPages(role: StaffRole, permissions?: StaffAccessConfig | null): PageKey[] {
  if (permissions?.mode === "custom" && Array.isArray(permissions.allowedPages)) {
    return permissions.allowedPages.filter((page): page is PageKey => ALL_PAGES.includes(page as PageKey));
  }
  return pagesForRole(role);
}

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

export function canStaffAccessPage(role: StaffRole, page: PageKey, permissions?: StaffAccessConfig | null): boolean {
  return staffAllowedPages(role, permissions).includes(page);
}

export function canStaffAccessRoute(role: StaffRole, path: string, permissions?: StaffAccessConfig | null): boolean {
  const page = ROUTE_PAGE[path];
  if (!page) return true;
  return canStaffAccessPage(role, page, permissions);
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

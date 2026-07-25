// ===== AUTH =====
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff" | "kitchen";
  avatar?: string;
}

// ===== RESTAURANT =====
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  price: number;
  originalPrice?: number;
  offerLabel?: string;
  description?: string;
  image?: string;
  available: boolean;
  ingredients: { ingredientId: string; quantity: number; unit: string }[];
}

export interface Order {
  id: string;
  tableId?: string;
  type: "dine-in" | "takeaway" | "delivery";
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled" | "refunded";
  items: { menuItemId: string; name: string; quantity: number; price: number }[];
  total: number;
  createdAt: string;
  customerName?: string;
  paymentMethod?: "cash" | "card" | "mobile" | "split";
  splitPayment?: { cash: number; online: number };
}

export interface MenuCategory {
  name: string;
  image?: string;
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: "available" | "occupied" | "reserved";
  orderId?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  category?: string;
  stock: number;
  unit: string;
  minStock: number;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
}

// ===== INVENTORY =====
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  unit?: string;
  brand?: string;
  modelNumber?: string;
  size?: string;
  color?: string;
  batchNumber?: string;
  expiryDate?: string;
  warrantyMonths?: number;
  storageLocation?: string;
  taxRate?: number;
  salesAccount?: string;
  purchaseAccount?: string;
  inventoryAccount?: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  image?: string;
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  products: string[];
}

export interface Purchase {
  id: string;
  poNumber?: string;
  supplierId: string;
  supplierName: string;
  items: { productId: string; productName: string; quantity: number; cost: number }[];
  total: number;
  date: string;
  status: "pending" | "received" | "cancelled";
}

export interface Sale {
  id: string;
  items: { productId: string; productName: string; quantity: number; price: number }[];
  total: number;
  date: string;
  paymentMethod: "cash" | "card" | "mobile" | "split";
  splitPayment?: { cash: number; online: number };
  customerName?: string;
  status: "completed" | "refunded";
}

// ===== EXPENSES =====
export interface Expense {
  id: string;
  category: "rent" | "utilities" | "supplies" | "marketing" | "maintenance" | "salary" | "other";
  description: string;
  amount: number;
  date: string;
  paidBy: string;
  receipt?: string;
  status: "pending" | "approved" | "rejected";
}

// ===== STAFF =====
export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "cashier" | "kitchen" | "staff";
  department: "restaurant" | "inventory" | "both";
  joinDate: string;
  salary: number;
  status: "active" | "on-leave" | "inactive";
  avatar?: string;
  password?: string;
  hasLogin?: boolean;
}

// ===== CUSTOMERS =====
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  totalOrders: number;
  loyaltyPoints: number;
  joinDate: string;
  lastVisit: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

// ===== ALERTS =====
export interface Alert {
  id: string;
  type: "low_stock" | "expiry" | "order" | "system" | "payment";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
  module: "restaurant" | "inventory" | "both";
}

// ===== SETTINGS =====
export interface NotificationPreferences {
  lowStock: boolean;
  newOrders: boolean;
  dailyReport: boolean;
  expenseApproval: boolean;
}

export interface InvoicePrintSettings {
  title: string;
  headerText: string;
  footerTitle: string;
  footerMessage: string;
  showLogo: boolean;
  showBusinessName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showInvoiceNo: boolean;
  showDate: boolean;
  showOrderType: boolean;
  showTable: boolean;
  showPaymentMode: boolean;
  showQr: boolean;
}

export interface KotPrintSettings {
  title: string;
  headerText: string;
  footerText: string;
  printCount: number;
  compactView: boolean;
  showLogo: boolean;
  showBusinessName: boolean;
  showKotNo: boolean;
  showOrderType: boolean;
  showTable: boolean;
  showOrderBy: boolean;
  showTime: boolean;
  showItems: boolean;
  showQuantity: boolean;
  showRemarks: boolean;
}

export interface ReportPrintSettings {
  titlePrefix: string;
  headerNote: string;
  footerNote: string;
  showLogo: boolean;
  showAddress: boolean;
  showPanVat: boolean;
  showPhoneEmail: boolean;
  createdByLabel: string;
  checkedByLabel: string;
  printedByLabel: string;
  authorizedByLabel: string;
  createdByName?: string;
  checkedByName?: string;
  printedByName?: string;
  authorizedByName?: string;
  createdBySignature?: string;
  checkedBySignature?: string;
  printedBySignature?: string;
  authorizedBySignature?: string;
  createdByNote?: string;
  checkedByNote?: string;
  printedByNote?: string;
  authorizedByNote?: string;
}

export interface PrintSettings {
  invoice: InvoicePrintSettings;
  kot: KotPrintSettings;
  report: ReportPrintSettings;
}

export interface PaymentQrSettings {
  provider: "esewa" | "fonepay" | "khalti" | "bank" | "other";
  accountName: string;
  accountNumber: string;
  image?: string;
  showOnBill: boolean;
}

export interface BusinessSettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  taxNumber: string;
  taxRate: number;
  currency: string;
  currencySymbol: string;
  receiptFooter: string;
  logo?: string;
  notifications: NotificationPreferences;
  printSettings: PrintSettings;
  paymentQr: PaymentQrSettings;
}

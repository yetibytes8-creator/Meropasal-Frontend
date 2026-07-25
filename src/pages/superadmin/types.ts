export type CompanyPlan = "cafe" | "inventory" | "combo";
export type CompanyStatus = "active" | "trial" | "suspended" | "cancelled";
export type BusinessType =
  | "cafe" | "restaurant" | "general_inventory" | "hardware" | "pharmacy" | "kirana"
  | "supermarket" | "bakery" | "clothing" | "footwear" | "electronics" | "other";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  cafe: "Cafe",
  restaurant: "Restaurant",
  general_inventory: "General Inventory",
  hardware: "Hardware Store",
  pharmacy: "Pharmacy",
  kirana: "Kirana / Grocery",
  supermarket: "Supermarket",
  bakery: "Bakery",
  clothing: "Clothing Store",
  footwear: "Footwear Store",
  electronics: "Electronics",
  other: "Other",
};
export type UserRole = "admin" | "manager" | "staff";
export type UserStatus = "active" | "inactive";

export interface UserPermissions {
  // Restaurant
  r_dashboard: boolean;
  r_orders: boolean;
  r_billing: boolean;
  r_menu: boolean;
  r_tables: boolean;
  r_kitchen: boolean;
  r_customers: boolean;
  r_staff: boolean;
  r_reports: boolean;
  r_settings: boolean;
  // Inventory
  i_dashboard: boolean;
  i_products: boolean;
  i_sales: boolean;
  i_purchases: boolean;
  i_suppliers: boolean;
  i_expenses: boolean;
  i_customers: boolean;
  i_staff: boolean;
  i_reports: boolean;
  i_alerts: boolean;
  i_settings: boolean;
}

export const ALL_PERMISSIONS_OFF: UserPermissions = {
  r_dashboard: false, r_orders: false, r_billing: false, r_menu: false,
  r_tables: false, r_kitchen: false, r_customers: false, r_staff: false,
  r_reports: false, r_settings: false,
  i_dashboard: false, i_products: false, i_sales: false, i_purchases: false,
  i_suppliers: false, i_expenses: false, i_customers: false, i_staff: false,
  i_reports: false, i_alerts: false, i_settings: false,
};

export const ROLE_PERMISSION_PRESETS: Record<UserRole, UserPermissions> = {
  admin: {
    r_dashboard: true, r_orders: true, r_billing: true, r_menu: true,
    r_tables: true, r_kitchen: true, r_customers: true, r_staff: true,
    r_reports: true, r_settings: true,
    i_dashboard: true, i_products: true, i_sales: true, i_purchases: true,
    i_suppliers: true, i_expenses: true, i_customers: true, i_staff: true,
    i_reports: true, i_alerts: true, i_settings: true,
  },
  manager: {
    r_dashboard: true, r_orders: true, r_billing: true, r_menu: true,
    r_tables: true, r_kitchen: true, r_customers: true, r_staff: false,
    r_reports: true, r_settings: false,
    i_dashboard: true, i_products: true, i_sales: true, i_purchases: true,
    i_suppliers: true, i_expenses: true, i_customers: true, i_staff: false,
    i_reports: true, i_alerts: true, i_settings: false,
  },
  staff: {
    r_dashboard: true, r_orders: true, r_billing: true, r_menu: false,
    r_tables: true, r_kitchen: true, r_customers: true, r_staff: false,
    r_reports: false, r_settings: false,
    i_dashboard: true, i_products: false, i_sales: true, i_purchases: false,
    i_suppliers: false, i_expenses: false, i_customers: true, i_staff: false,
    i_reports: false, i_alerts: true, i_settings: false,
  },
};

export interface Company {
  id: string;
  userId?: number;
  name: string;
  businessType: BusinessType | "";
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  plan: CompanyPlan;
  planId?: number;
  planName?: string;
  subscriptionId?: number;
  status: CompanyStatus;
  createdAt: string;
  expiresAt: string;
  maxUsers: number;
  activeUsers: number;
  monthlyRevenue: number;
  notes: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  companyId: string;
  companyName: string;
  status: UserStatus;
  joinDate: string;
  lastLogin: string;
  permissions?: UserPermissions;
}

export interface Plan {
  id: string;
  key: CompanyPlan;
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  features: string[];
  isPopular: boolean;
}

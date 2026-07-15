import type { PrintSettings } from "@/types";

// ---------------------------------------------------------------------------
// Typed API client for the Django backend.
// Base URL is read from VITE_API_URL. Keep it relative for local/live preview
// so phones and other devices use the same frontend host through Vite proxy.
// Tokens are stored in localStorage under mp_access / mp_refresh.
// ---------------------------------------------------------------------------

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const ACCESS_KEY  = "mp_access";
const REFRESH_KEY = "mp_refresh";
const BRANCH_KEY = "mp_branch_id";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null  { return localStorage.getItem(ACCESS_KEY); }
export function getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY,  access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getSelectedBranchId(): string {
  return localStorage.getItem(BRANCH_KEY) || "all";
}

export function setSelectedBranchId(branchId: string) {
  localStorage.setItem(BRANCH_KEY, branchId || "all");
  window.dispatchEvent(new CustomEvent("mp-branch-change", { detail: branchId || "all" }));
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem(ACCESS_KEY, data.access);
    return true;
  } catch {
    return false;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;   // default true
  raw?: boolean;    // return Response instead of parsed JSON
};

function extractApiError(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractApiError(item);
      if (message) return message;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["detail", "non_field_errors", "items", "product_id", "product_name", "supplier_name", "quantity", "cost"]) {
      const message = extractApiError(record[key]);
      if (message) return key === "detail" || key === "non_field_errors" ? message : `${key}: ${message}`;
    }
    for (const [key, nested] of Object.entries(record)) {
      const message = extractApiError(nested);
      if (message) return `${key}: ${message}`;
    }
  }
  return undefined;
}

export async function request<T = unknown>(
  path: string,
  { method = "GET", body, auth = true, raw = false }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["X-Branch-Id"] = getSelectedBranchId();
  }

  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res = await fetch(`${BASE}${path}`, opts);

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${BASE}${path}`, { ...opts, headers });
    }
  }

  if (raw) return res as unknown as T;

  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const trimmedText = text.trim();
  const looksJson = contentType.includes("json") || trimmedText.startsWith("{") || trimmedText.startsWith("[");
  let json: unknown = {};

  if (trimmedText && looksJson) {
    try {
      json = JSON.parse(trimmedText);
    } catch {
      throw new Error("Server returned invalid JSON. Please check the API response.");
    }
  }

  if (trimmedText && !looksJson) {
    const isHtml = /^<!doctype html/i.test(trimmedText) || /^<html/i.test(trimmedText);
    const fallback = isHtml
      ? "Backend returned an HTML page instead of JSON. Please check the API server or VITE_API_URL."
      : `Server returned a non-JSON response (${res.status}).`;
    if (!res.ok || isHtml) throw new Error(fallback);
  }

  if (!res.ok) {
    if (res.status === 401 && auth) clearTokens();
    const data = json as Record<string, unknown>;
    const msg =
      (res.status === 401 ? "Session expired. Please sign in again." : undefined) ||
      extractApiError(data) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { results?: unknown }).results) &&
    "count" in (json as Record<string, unknown>)
  ) {
    return (json as { results: unknown[] }).results as T;
  }

  return json as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  email: string;
  full_name: string;
  role: "superadmin" | "admin" | "user";
  finance_enabled?: boolean;
  system_config?: {
    features?: Partial<Record<
      "restaurant" | "inventory" | "finance" | "branches" | "billing" | "reports" |
      "staff" | "qrMenu" | "delivery" | "bankRecon" | "taxes" | "refunds",
      boolean
    >>;
    defaultModule?: "restaurant" | "inventory" | "finance";
    [key: string]: unknown;
  };
}

export interface ApiSubscription {
  id: number;
  user_id: number;
  status: "trial" | "active" | "expired" | "cancelled" | "payment_pending";
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  payment_provider: string | null;
  plan: {
    id: number;
    name: string;
    type: string;
    module_access: "cafe" | "inventory" | "combo";
    price: number;
    billing_cycle: string | null;
    duration_days: number | null;
    features: string[];
  } | null;
}

export const auth = {
  async login(email: string, password: string): Promise<{ user: ApiUser; access: string; refresh: string }> {
    const data = await request<{ access: string; refresh: string; user: ApiUser }>(
      "/auth/login/", { method: "POST", body: { email, password }, auth: false }
    );
    saveTokens(data.access, data.refresh);
    return data;
  },

  async requestTrialOtp(email: string): Promise<void> {
    await request("/auth/trial-otp/request/", { method: "POST", body: { email }, auth: false });
  },

  async signup(email: string, password: string, full_name: string, plan_id: number, otp_code?: string): Promise<{ user: ApiUser; access: string; refresh: string }> {
    const data = await request<{ access: string; refresh: string; user: ApiUser }>(
      "/auth/signup/", { method: "POST", body: { email, password, full_name, plan_id, otp_code }, auth: false }
    );
    saveTokens(data.access, data.refresh);
    return data;
  },

  async me(): Promise<ApiUser & { subscription: ApiSubscription | null }> {
    return request("/auth/me/");
  },

  async changePassword(old_password: string, new_password: string): Promise<void> {
    await request("/auth/password/change/", { method: "POST", body: { old_password, new_password } });
  },

  async cancelSubscription(): Promise<ApiSubscription> {
    return request("/auth/subscription/cancel/", { method: "POST" });
  },

  async resetPassword(email: string): Promise<void> {
    await request("/auth/password/reset/", { method: "POST", body: { email }, auth: false });
  },

  async confirmPasswordReset(uid: string, token: string, new_password: string): Promise<void> {
    await request("/auth/password/reset/confirm/", {
      method: "POST", body: { uid, token, new_password }, auth: false,
    });
  },

  logout() {
    clearTokens();
  },
};

export interface ApiBranch {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  manager_name: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export const branches = {
  list: () => request<ApiBranch[]>("/branches/"),
  create: (data: Omit<ApiBranch, "id" | "created_at">) =>
    request<ApiBranch>("/branches/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiBranch, "id" | "created_at">>) =>
    request<ApiBranch>(`/branches/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/branches/${id}/`, { method: "DELETE" }),
};

// ── Plans ─────────────────────────────────────────────────────────────────────

export interface ApiPlan {
  id: number;
  name: string;
  type: "trial" | "paid";
  module_access: "cafe" | "inventory" | "combo";
  price: number;
  billing_cycle: string | null;
  duration_days: number | null;
  features: string[];
  is_active: boolean;
}

export const plans = {
  list: (activeOnly = true) =>
    request<ApiPlan[]>(`/plans/?active=${activeOnly}`, { auth: false }),

  adminList: () => request<ApiPlan[]>("/admin/plans/"),

  create: (data: Omit<ApiPlan, "id">) =>
    request<ApiPlan>("/admin/plans/", { method: "POST", body: data }),

  update: (id: number, data: Partial<ApiPlan>) =>
    request<ApiPlan>(`/admin/plans/${id}/`, { method: "PATCH", body: data }),
};

// ── Admin users ───────────────────────────────────────────────────────────────

export interface ApiProfile {
  id: number;
  user_id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "user";
  created_at: string;
}

export const users = {
  list: () => request<ApiProfile[]>("/admin/users/"),
  update: (id: number, data: Partial<ApiProfile>) =>
    request<ApiProfile>(`/admin/users/${id}/`, { method: "PATCH", body: data }),
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface AdminSub {
  id: number;
  user_id: number;
  plan: { id: number; name: string; module_access: string } | null;
  status: string;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  payment_provider: string | null;
  created_at: string;
}

export const subscriptions = {
  list: () => request<AdminSub[]>("/admin/subscriptions/"),
  update: (id: number, data: Partial<AdminSub>) =>
    request<AdminSub>(`/admin/subscriptions/${id}/`, { method: "PATCH", body: data }),
};

// ── Payments ──────────────────────────────────────────────────────────────────

export interface ApiPayment {
  id: number;
  user_id: number;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export const payments = {
  list: () => request<ApiPayment[]>("/admin/payments/"),
  update: (id: number, data: Partial<ApiPayment>) =>
    request<ApiPayment>(`/admin/payments/${id}/`, { method: "PATCH", body: data }),
};

// ── Activity logs ─────────────────────────────────────────────────────────────

export interface ApiLog {
  id: number;
  admin_id: number;
  admin_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  target_user_id: number | null;
  target_user_name: string | null;
  old_value: string | null;
  new_value: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const logs = {
  list: () => request<ApiLog[]>("/admin/logs/"),
  create: (data: Omit<ApiLog, "id" | "admin_id" | "admin_name" | "created_at">) =>
    request<ApiLog>("/admin/logs/", { method: "POST", body: data }),
};

// ── Overview ──────────────────────────────────────────────────────────────────

export interface OverviewStats {
  users: number;
  active: number;
  trial: number;
  expired: number;
  pending: number;
  revenue: number;
}

export const overview = {
  get: () => request<OverviewStats>("/admin/overview/"),
};

// ── Restaurant: Ingredients ───────────────────────────────────────────────────

export interface ApiIngredient {
  id: number;
  name: string;
  stock: number;
  unit: string;
  min_stock: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
}

export const ingredients = {
  list: () => request<ApiIngredient[]>("/restaurant/ingredients/"),
  create: (data: Omit<ApiIngredient, "id" | "stock_status">) =>
    request<ApiIngredient>("/restaurant/ingredients/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiIngredient, "id" | "stock_status">>) =>
    request<ApiIngredient>(`/restaurant/ingredients/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/restaurant/ingredients/${id}/`, { method: "DELETE" }),
};

// ── Restaurant: Menu items ────────────────────────────────────────────────────

export interface ApiMenuItemIngredient {
  ingredient_id: number;
  quantity: number;
  unit: string;
}

export interface ApiMenuItem {
  id: number;
  name: string;
  category: string;
  sub_category: string;
  price: number;
  original_price: number;
  offer_label: string;
  description: string;
  image: string | null;
  available: boolean;
  ingredients: ApiMenuItemIngredient[];
  created_at: string;
}

export const menuItems = {
  list: () => request<ApiMenuItem[]>("/restaurant/menu-items/"),
  create: (data: Omit<ApiMenuItem, "id" | "ingredients" | "created_at">) =>
    request<ApiMenuItem>("/restaurant/menu-items/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiMenuItem, "id" | "ingredients" | "created_at">>) =>
    request<ApiMenuItem>(`/restaurant/menu-items/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/restaurant/menu-items/${id}/`, { method: "DELETE" }),
  listIngredients: (menuItemId: number) =>
    request<ApiMenuItemIngredient[]>(`/restaurant/menu-items/${menuItemId}/ingredients/`),
  addIngredient: (menuItemId: number, data: { ingredient_id: number; quantity: number; unit: string }) =>
    request<ApiMenuItemIngredient>(`/restaurant/menu-items/${menuItemId}/ingredients/`, { method: "POST", body: data }),
  removeIngredient: (menuItemId: number, ingredientId: number) =>
    request<void>(`/restaurant/menu-items/${menuItemId}/ingredients/${ingredientId}/`, { method: "DELETE" }),
};

// ── Restaurant: Tables ────────────────────────────────────────────────────────

export interface ApiComboOfferItem {
  id?: number;
  menu_item_id: number | null;
  menu_item_name: string;
  quantity: number;
}

export interface ApiComboOffer {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  original_price: number;
  image: string | null;
  available: boolean;
  valid_from: string | null;
  valid_until: string | null;
  items: ApiComboOfferItem[];
  created_at: string;
}

export const comboOffers = {
  list: () => request<ApiComboOffer[]>("/restaurant/combo-offers/"),
  create: (data: Omit<ApiComboOffer, "id" | "items" | "created_at"> & { item_inputs?: Omit<ApiComboOfferItem, "id">[] }) =>
    request<ApiComboOffer>("/restaurant/combo-offers/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiComboOffer, "id" | "items" | "created_at">> & { item_inputs?: Omit<ApiComboOfferItem, "id">[] }) =>
    request<ApiComboOffer>(`/restaurant/combo-offers/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/restaurant/combo-offers/${id}/`, { method: "DELETE" }),
};

export interface ApiRestaurantService {
  id: number;
  name: string;
  service_type: "dine_in" | "delivery" | "takeaway" | "reservation" | "catering" | "stamp_program" | "online_order" | "other";
  description: string;
  price: number;
  enabled: boolean;
  schedule: string;
  created_at: string;
}

export const restaurantServices = {
  list: () => request<ApiRestaurantService[]>("/restaurant/services/"),
  create: (data: Omit<ApiRestaurantService, "id" | "created_at">) =>
    request<ApiRestaurantService>("/restaurant/services/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiRestaurantService, "id" | "created_at">>) =>
    request<ApiRestaurantService>(`/restaurant/services/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/restaurant/services/${id}/`, { method: "DELETE" }),
};

export interface ApiTable {
  id: number;
  number: number;
  seats: number;
  status: "available" | "occupied" | "reserved";
  order_id: number | null;
}

export const tables = {
  list: () => request<ApiTable[]>("/restaurant/tables/"),
  create: (data: Omit<ApiTable, "id" | "order_id">) =>
    request<ApiTable>("/restaurant/tables/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiTable, "id" | "order_id">>) =>
    request<ApiTable>(`/restaurant/tables/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/restaurant/tables/${id}/`, { method: "DELETE" }),
};

// ── Restaurant: Orders ────────────────────────────────────────────────────────

export interface ApiOrderItem {
  id?: number;
  menu_item_id: number | null;
  name: string;
  quantity: number;
  price: number;
}

export interface ApiOrder {
  id: number;
  table_id: number | null;
  type: "dine-in" | "takeaway" | "delivery";
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled" | "refunded";
  total: number;
  customer_name: string | null;
  payment_method: "cash" | "card" | "mobile" | "split" | null;
  split_cash: number | null;
  split_online: number | null;
  items: ApiOrderItem[];
  created_at: string;
}

export const orders = {
  list: () => request<ApiOrder[]>("/restaurant/orders/"),
  create: (data: Omit<ApiOrder, "id" | "created_at">) =>
    request<ApiOrder>("/restaurant/orders/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiOrder, "id" | "created_at">>) =>
    request<ApiOrder>(`/restaurant/orders/${id}/`, { method: "PATCH", body: data }),
  refund: (id: number) =>
    request<ApiOrder>(`/restaurant/orders/${id}/refund/`, { method: "POST" }),
  delete: (id: number) =>
    request<void>(`/restaurant/orders/${id}/`, { method: "DELETE" }),
};

// ── Inventory: Suppliers ──────────────────────────────────────────────────────

export interface ApiSupplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

export const suppliers = {
  list: () => request<ApiSupplier[]>("/inventory/suppliers/"),
  create: (data: Omit<ApiSupplier, "id" | "created_at">) =>
    request<ApiSupplier>("/inventory/suppliers/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiSupplier, "id" | "created_at">>) =>
    request<ApiSupplier>(`/inventory/suppliers/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/inventory/suppliers/${id}/`, { method: "DELETE" }),
};

// ── Inventory: Products ───────────────────────────────────────────────────────

export interface ApiProduct {
  id: number;
  branch_id?: number | null;
  branch_name?: string | null;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  unit?: string;
  brand?: string;
  model_number?: string;
  size?: string;
  color?: string;
  batch_number?: string;
  expiry_date?: string | null;
  warranty_months?: number | null;
  storage_location?: string;
  tax_rate?: number;
  sales_account?: string;
  purchase_account?: string;
  inventory_account?: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  image: string | null;
  supplier_id: number | null;
  created_at: string;
}

export const products = {
  list: () => request<ApiProduct[]>("/inventory/products/"),
  create: (data: Omit<ApiProduct, "id" | "stock_status" | "created_at">) =>
    request<ApiProduct>("/inventory/products/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiProduct, "id" | "stock_status" | "created_at">>) =>
    request<ApiProduct>(`/inventory/products/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/inventory/products/${id}/`, { method: "DELETE" }),
};

// ── Inventory: Purchases ──────────────────────────────────────────────────────

export interface ApiPurchaseItem {
  id?: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  cost: number;
}

export interface ApiPurchase {
  id: number;
  branch_id?: number | null;
  branch_name?: string | null;
  supplier_id: number | null;
  supplier_name: string;
  total: number;
  date: string;
  status: "pending" | "received" | "cancelled";
  items: ApiPurchaseItem[];
  created_at: string;
}

export const purchases = {
  list: () => request<ApiPurchase[]>("/inventory/purchases/"),
  create: (data: Omit<ApiPurchase, "id" | "created_at">) =>
    request<ApiPurchase>("/inventory/purchases/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiPurchase, "id" | "created_at">>) =>
    request<ApiPurchase>(`/inventory/purchases/${id}/`, { method: "PATCH", body: data }),
  receive: (id: number) =>
    request<ApiPurchase>(`/inventory/purchases/${id}/receive/`, { method: "POST" }),
  cancel: (id: number) =>
    request<ApiPurchase>(`/inventory/purchases/${id}/cancel/`, { method: "POST" }),
  delete: (id: number) =>
    request<void>(`/inventory/purchases/${id}/`, { method: "DELETE" }),
};

// ── Inventory: Sales ──────────────────────────────────────────────────────────

export interface ApiSaleItem {
  id?: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  price: number;
}

export interface ApiSale {
  id: number;
  branch_id?: number | null;
  branch_name?: string | null;
  bill_number?: string;
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  total: number;
  date: string;
  payment_method: "cash" | "card" | "mobile" | "split";
  split_cash: number | null;
  split_online: number | null;
  customer_name: string | null;
  status: "completed" | "refunded";
  items: ApiSaleItem[];
  created_at: string;
}

export const sales = {
  list: () => request<ApiSale[]>("/inventory/sales/"),
  create: (data: Omit<ApiSale, "id" | "created_at" | "status">) =>
    request<ApiSale>("/inventory/sales/", { method: "POST", body: data }),
  refund: (id: number) =>
    request<ApiSale>(`/inventory/sales/${id}/refund/`, { method: "POST" }),
  delete: (id: number) =>
    request<void>(`/inventory/sales/${id}/`, { method: "DELETE" }),
};

// ── Inventory: Expenses ───────────────────────────────────────────────────────

export interface ApiSaleReturn {
  id: number;
  branch_id?: number | null;
  branch_name?: string | null;
  sale_id: number;
  product_id: number;
  product_name: string;
  return_type: "refund" | "exchange" | "damaged_return";
  quantity: number;
  refund_amount: number;
  restock_returned: boolean;
  exchange_product_id: number | null;
  exchange_product_name: string;
  exchange_quantity: number;
  reason: string;
  created_at: string;
}

export const saleReturns = {
  list: () => request<ApiSaleReturn[]>("/inventory/sale-returns/"),
  create: (data: Omit<ApiSaleReturn, "id" | "product_name" | "exchange_product_name" | "created_at">) =>
    request<ApiSaleReturn>("/inventory/sale-returns/", { method: "POST", body: data }),
};

export interface ApiStockAdjustment {
  id: number;
  branch_id?: number | null;
  branch_name?: string | null;
  product_id: number;
  product_name: string;
  adjustment_type: "increase" | "decrease" | "damage" | "return" | "correction";
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason: string;
  reference: string;
  created_at: string;
}

export const stockAdjustments = {
  list: () => request<ApiStockAdjustment[]>("/inventory/stock-adjustments/"),
  create: (data: Pick<ApiStockAdjustment, "product_id" | "adjustment_type" | "quantity" | "reason" | "reference">) =>
    request<ApiStockAdjustment>("/inventory/stock-adjustments/", { method: "POST", body: data }),
};

export interface ApiExpense {
  id: number;
  category: "rent" | "utilities" | "supplies" | "marketing" | "maintenance" | "salary" | "other";
  description: string;
  amount: number;
  date: string;
  paid_by: string;
  receipt: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export const expenses = {
  list: () => request<ApiExpense[]>("/inventory/expenses/"),
  create: (data: Omit<ApiExpense, "id" | "created_at">) =>
    request<ApiExpense>("/inventory/expenses/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiExpense, "id" | "created_at">>) =>
    request<ApiExpense>(`/inventory/expenses/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/inventory/expenses/${id}/`, { method: "DELETE" }),
};

// ── Staff ─────────────────────────────────────────────────────────────────────

export interface ApiStaff {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "cashier" | "kitchen" | "staff";
  department: "restaurant" | "inventory" | "both";
  join_date: string;
  salary: number;
  status: "active" | "on-leave" | "inactive";
  avatar: string | null;
  has_login: boolean;
  created_at: string;
}

export const staff = {
  list: () => request<ApiStaff[]>("/staff/"),
  create: (data: Omit<ApiStaff, "id" | "created_at" | "has_login"> & { password?: string }) =>
    request<ApiStaff>("/staff/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiStaff, "id" | "created_at" | "has_login">> & { password?: string }) =>
    request<ApiStaff>(`/staff/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/staff/${id}/`, { method: "DELETE" }),
  changePassword: (id: number, current_password: string, new_password: string) =>
    request<void>(`/staff/${id}/change-password/`, { method: "POST", body: { current_password, new_password } }),
  login: (email: string, password: string) =>
    request<ApiStaff>("/staff/login/", { method: "POST", body: { email, password } }),
};

// ── Customers ─────────────────────────────────────────────────────────────────

export interface ApiCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  total_spent: number;
  total_orders: number;
  loyalty_points: number;
  join_date: string;
  last_visit: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  created_at: string;
}

export const customers = {
  list: () => request<ApiCustomer[]>("/customers/"),
  create: (data: Omit<ApiCustomer, "id" | "created_at">) =>
    request<ApiCustomer>("/customers/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiCustomer, "id" | "created_at">>) =>
    request<ApiCustomer>(`/customers/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/customers/${id}/`, { method: "DELETE" }),
};

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface ApiAlert {
  id: number;
  type: "low_stock" | "expiry" | "order" | "system" | "payment";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  module: "restaurant" | "inventory" | "both";
  created_at: string;
}

export const alertsApi = {
  list: () => request<ApiAlert[]>("/alerts/"),
  create: (data: Omit<ApiAlert, "id" | "created_at">) =>
    request<ApiAlert>("/alerts/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiAlert, "id" | "created_at">>) =>
    request<ApiAlert>(`/alerts/${id}/`, { method: "PATCH", body: data }),
  markRead: (id: number) =>
    request<ApiAlert>(`/alerts/${id}/mark_read/`, { method: "POST" }),
  markAllRead: () =>
    request<void>("/alerts/mark_all_read/", { method: "POST" }),
  delete: (id: number) =>
    request<void>(`/alerts/${id}/`, { method: "DELETE" }),
};

// ── Finance: Income ───────────────────────────────────────────────────────────

export interface ApiIncome {
  id: number;
  category: "sales" | "service" | "rental" | "investment" | "refund" | "other";
  description: string;
  amount: number;
  date: string;
  reference: string;
  created_at: string;
}

export const income = {
  list: () => request<ApiIncome[]>("/finance/income/"),
  create: (data: Omit<ApiIncome, "id" | "created_at">) =>
    request<ApiIncome>("/finance/income/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiIncome, "id" | "created_at">>) =>
    request<ApiIncome>(`/finance/income/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/finance/income/${id}/`, { method: "DELETE" }),
};

// ── Finance: Invoices ─────────────────────────────────────────────────────────

export interface ApiInvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ApiInvoice {
  id: number;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes: string;
  tax_rate: number;
  items: ApiInvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
}

export const invoices = {
  list: () => request<ApiInvoice[]>("/finance/invoices/"),
  create: (data: Omit<ApiInvoice, "id" | "created_at" | "subtotal" | "tax_amount" | "total">) =>
    request<ApiInvoice>("/finance/invoices/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiInvoice, "id" | "created_at" | "subtotal" | "tax_amount" | "total">>) =>
    request<ApiInvoice>(`/finance/invoices/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/finance/invoices/${id}/`, { method: "DELETE" }),
};

// ── Finance: Budgets ──────────────────────────────────────────────────────────

export interface ApiBudget {
  id: number;
  category: "rent" | "utilities" | "supplies" | "marketing" | "maintenance" | "salary" | "other";
  month: string;
  amount: number;
  created_at: string;
}

export const budgets = {
  list: (month?: string) =>
    request<ApiBudget[]>(month ? `/finance/budgets/?month=${month}` : "/finance/budgets/"),
  create: (data: Omit<ApiBudget, "id" | "created_at">) =>
    request<ApiBudget>("/finance/budgets/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiBudget, "id" | "created_at">>) =>
    request<ApiBudget>(`/finance/budgets/${id}/`, { method: "PATCH", body: data }),
  delete: (id: number) =>
    request<void>(`/finance/budgets/${id}/`, { method: "DELETE" }),
};

// ── Finance: Summary ──────────────────────────────────────────────────────────

export interface ApiChartAccount {
  id: number;
  code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  group: string;
  opening_debit: number;
  opening_credit: number;
  is_active: boolean;
  created_at: string;
}

export const chartAccounts = {
  list: () => request<ApiChartAccount[]>("/finance/chart-accounts/"),
  create: (data: Omit<ApiChartAccount, "id" | "created_at">) =>
    request<ApiChartAccount>("/finance/chart-accounts/", { method: "POST", body: data }),
  update: (id: number, data: Partial<Omit<ApiChartAccount, "id" | "created_at">>) =>
    request<ApiChartAccount>(`/finance/chart-accounts/${id}/`, { method: "PATCH", body: data }),
};

export interface ApiAccountingEntry {
  id: number;
  branch_id: number | null;
  branch_name: string | null;
  date: string;
  entry_type: "receipt" | "payment" | "sale" | "purchase" | "journal" | "refund" | "transfer" | "adjustment";
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  debit: number;
  credit: number;
  payment_mode: "cash" | "bank" | "card" | "esewa" | "cheque" | "credit" | "owner" | "other";
  bank_name: string;
  cheque_number: string;
  reference_number: string;
  party_name: string;
  description: string;
  source: string;
  source_id: string;
  created_at: string;
}

type AccountingEntryPayload = Omit<
  ApiAccountingEntry,
  "id" | "branch_id" | "branch_name" | "account_code" | "account_name" | "account_type" | "source" | "source_id" | "created_at"
>;

export const accountingEntries = {
  list: () => request<ApiAccountingEntry[]>("/finance/accounting-entries/"),
  create: (data: AccountingEntryPayload) =>
    request<ApiAccountingEntry>("/finance/accounting-entries/", { method: "POST", body: data }),
  update: (id: number, data: Partial<AccountingEntryPayload>) =>
    request<ApiAccountingEntry>(`/finance/accounting-entries/${id}/`, { method: "PATCH", body: data }),
};

export interface FinanceSummary {
  branch_id: number | null;
  branch_name: string;
  income: number;
  expenses: number;
  net_profit: number;
  invoices_paid: number;
  invoices_open: number;
  invoices_overdue: number;
  monthly: { month: string; income: number; expenses: number }[];
  branches: {
    branch_id: number;
    branch_name: string;
    income: number;
    expenses: number;
    net_profit: number;
    sales_count: number;
    orders_count: number;
  }[];
}

export const financeSummary = {
  get: (month: string) =>
    request<FinanceSummary>(`/finance/summary/?month=${month}`),
};

// ── Super Admin: Client management ───────────────────────────────────────────

export interface SuperAdminClient {
  id: number;
  user_id: number;
  business_name: string;
  business_type: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  plan_module: "cafe" | "inventory" | "combo" | null;
  plan_id: number | null;
  plan_name: string | null;
  subscription_id: number | null;
  status: "active" | "trial" | "suspended" | "cancelled";
  created_at: string;
  expires_at: string | null;
  max_users: number;
  active_users: number;
  monthly_revenue: number;
  internal_notes: string;
  finance_enabled?: boolean;
  implementation_notes?: string;
  devops_notes?: string;
  system_config?: Record<string, unknown>;
}

export interface SuperAdminClientCreate {
  business_name: string;
  business_type: string;
  contact_person: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  plan_id: number;
  status?: string;
  max_users?: number;
  expires_at: string;
  internal_notes?: string;
  finance_enabled?: boolean;
  implementation_notes?: string;
  devops_notes?: string;
  system_config?: Record<string, unknown>;
  password?: string;
}

export interface SuperAdminOverview {
  total_clients: number;
  active: number;
  trial: number;
  suspended: number;
  mrr: number;
  expiring_soon: number;
  total_users: number;
}

export const superAdmin = {
  overview: () => request<SuperAdminOverview>("/super-admin/overview/"),

  listClients: () => request<SuperAdminClient[]>("/super-admin/clients/"),

  createClient: (data: SuperAdminClientCreate) =>
    request<{ client: SuperAdminClient; generated_password: string }>(
      "/super-admin/clients/",
      { method: "POST", body: data }
    ),

  updateClient: (id: number, data: Partial<SuperAdminClientCreate>) =>
    request<SuperAdminClient>(`/super-admin/clients/${id}/`, { method: "PATCH", body: data }),

  deleteClient: (id: number) =>
    request<void>(`/super-admin/clients/${id}/`, { method: "DELETE" }),

  getClientPayments: (id: number) =>
    request<ApiPayment[]>(`/super-admin/clients/${id}/payments/`),

  recordPayment: (id: number, data: { amount: number; provider: string; currency?: string }) =>
    request<ApiPayment>(`/super-admin/clients/${id}/payments/`, { method: "POST", body: data }),

  activityLog: () => request<ApiLog[]>("/super-admin/activity/"),

  listClientStaff: (clientId: number) =>
    request<ApiStaff[]>(`/super-admin/clients/${clientId}/staff/`),

  createClientStaff: (clientId: number, data: Omit<ApiStaff, "id" | "created_at" | "has_login"> & { password?: string }) =>
    request<ApiStaff>(`/super-admin/clients/${clientId}/staff/`, { method: "POST", body: data }),

  updateClientStaff: (clientId: number, staffId: number, data: Partial<Omit<ApiStaff, "id" | "created_at" | "has_login">> & { password?: string }) =>
    request<ApiStaff>(`/super-admin/clients/${clientId}/staff/${staffId}/`, { method: "PATCH", body: data }),

  deleteClientStaff: (clientId: number, staffId: number) =>
    request<void>(`/super-admin/clients/${clientId}/staff/${staffId}/`, { method: "DELETE" }),
};

// ── Super Admin: Platform settings ───────────────────────────────────────────

export interface PlatformSettings {
  id: number;
  name: string;
  tagline: string;
  support_email: string;
  website: string;
  trial_days: number;
  max_trial_companies: number;
  notify_new_company: boolean;
  notify_trial_expiring: boolean;
  notify_payment_failed: boolean;
  notify_company_deleted: boolean;
}

export const platformSettings = {
  get: () => request<PlatformSettings>("/super-admin/settings/"),
  update: (data: Partial<Omit<PlatformSettings, "id">>) =>
    request<PlatformSettings>("/super-admin/settings/", { method: "PATCH", body: data }),
};

// ── Super Admin: Account management ──────────────────────────────────────────

export interface SuperAdminAccount {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export const superAdminAccounts = {
  list: () => request<SuperAdminAccount[]>("/super-admin/accounts/"),
  create: (data: { email: string; full_name: string; password?: string }) =>
    request<{ account: SuperAdminAccount; generated_password: string }>("/super-admin/accounts/", { method: "POST", body: data }),
  delete: (id: number) => request<void>(`/super-admin/accounts/${id}/`, { method: "DELETE" }),
};

// ── Business settings ─────────────────────────────────────────────────────────

export interface ApiBusinessSettings {
  id: number;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  pan_vat: string;
  tax_number?: string;
  tax_rate: number;
  currency: string;
  currency_symbol: string;
  receipt_footer: string;
  logo: string | null;
  notifications: Partial<{ lowStock: boolean; newOrders: boolean; dailyReport: boolean; expenseApproval: boolean }>;
  system_config?: { printSettings?: Partial<PrintSettings>; [key: string]: unknown };
  print_settings?: Partial<PrintSettings>;
}

export const businessSettings = {
  get: () => request<ApiBusinessSettings>("/settings/"),
  update: (data: Partial<Omit<ApiBusinessSettings, "id">>) =>
    request<ApiBusinessSettings>("/settings/", { method: "PATCH", body: data }),
};

export interface ApiPublicMenu {
  business: {
    id: number;
    business_name: string;
    address: string;
    phone: string;
    email: string;
    logo: string | null;
    currency_symbol: string;
    receipt_footer: string;
  };
  table: { id: number; number: number; seats: number } | null;
  items: Array<Pick<ApiMenuItem, "id" | "name" | "category" | "sub_category" | "price" | "original_price" | "offer_label" | "description" | "image" | "available">>;
  combos: Array<Pick<ApiComboOffer, "id" | "name" | "category" | "price" | "original_price" | "description" | "image" | "available" | "items">>;
}

export const publicMenu = {
  get: (businessId: string | number, tableId?: string | number | null) => {
    const params = new URLSearchParams({ business: String(businessId) });
    if (tableId) params.set("table", String(tableId));
    return request<ApiPublicMenu>(`/public/menu/?${params.toString()}`, { auth: false });
  },
};

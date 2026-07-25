import type {
  ApiOrder, ApiTable, ApiMenuItem, ApiIngredient, ApiProduct, ApiSupplier,
  ApiPurchase, ApiSale, ApiExpense, ApiCustomer, ApiAlert, ApiStaff,
} from "@/lib/api";
import type { Order, Table, MenuItem, Ingredient, Product, Supplier, Purchase, Sale, Expense, Customer, Alert, Staff } from "@/types";
import { menuFoodImage } from "@/lib/menuImages";
import { productImage } from "@/lib/productImages";

export function fromApiOrder(o: ApiOrder): Order {
  return {
    id: String(o.id),
    tableId: o.table_id ? String(o.table_id) : undefined,
    type: o.type,
    status: o.status,
    items: o.items.map((i) => ({
      menuItemId: i.menu_item_id ? String(i.menu_item_id) : "",
      name: i.name,
      quantity: i.quantity,
      price: Number(i.price),
    })),
    total: Number(o.total),
    createdAt: o.created_at,
    customerName: o.customer_name ?? undefined,
    paymentMethod: (o.payment_method as Order["paymentMethod"]) ?? undefined,
    splitPayment:
      o.split_cash != null && o.split_online != null
        ? { cash: Number(o.split_cash), online: Number(o.split_online) }
        : undefined,
  };
}

export function fromApiTable(t: ApiTable): Table {
  return {
    id: String(t.id),
    number: t.number,
    seats: t.seats,
    status: t.status,
    orderId: t.order_id ? String(t.order_id) : undefined,
  };
}

export function fromApiMenuItem(i: ApiMenuItem): MenuItem {
  return {
    id: String(i.id),
    name: i.name,
    category: i.category,
    subCategory: i.sub_category || undefined,
    price: Number(i.price),
    originalPrice: Number(i.original_price || 0) || undefined,
    offerLabel: i.offer_label || undefined,
    description: i.description,
    image: menuFoodImage(i.name, i.category, i.image),
    available: i.available,
    ingredients: i.ingredients.map((ing) => ({
      ingredientId: String(ing.ingredient_id),
      quantity: Number(ing.quantity),
      unit: ing.unit,
    })),
  };
}

export function fromApiIngredient(i: ApiIngredient): Ingredient {
  return {
    id: String(i.id),
    name: i.name,
    category: "Ingredient",
    stock: Number(i.stock),
    unit: i.unit,
    minStock: Number(i.min_stock),
    stockStatus: i.stock_status,
  };
}

export function fromApiProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    name: p.name,
    sku: p.sku,
    barcode: p.barcode || undefined,
    category: p.category,
    unit: p.unit || "pcs",
    brand: p.brand || undefined,
    modelNumber: p.model_number || undefined,
    size: p.size || undefined,
    color: p.color || undefined,
    batchNumber: p.batch_number || undefined,
    expiryDate: p.expiry_date || undefined,
    warrantyMonths: p.warranty_months ?? undefined,
    storageLocation: p.storage_location || undefined,
    taxRate: Number(p.tax_rate || 0),
    salesAccount: p.sales_account || undefined,
    purchaseAccount: p.purchase_account || undefined,
    inventoryAccount: p.inventory_account || undefined,
    price: Number(p.price),
    costPrice: Number(p.cost_price),
    stock: Number(p.stock),
    minStock: Number(p.min_stock),
    stockStatus: p.stock_status,
    image: productImage(p.name, p.category, p.image),
    supplierId: p.supplier_id ? String(p.supplier_id) : undefined,
  };
}

export function fromApiSupplier(s: ApiSupplier): Supplier {
  return {
    id: String(s.id),
    name: s.name,
    phone: s.phone,
    email: s.email,
    address: s.address,
    products: [],
  };
}

export function fromApiPurchase(p: ApiPurchase): Purchase {
  return {
    id: String(p.id),
    poNumber: p.invoice_number || undefined,
    supplierId: p.supplier_id ? String(p.supplier_id) : "",
    supplierName: p.supplier_name,
    items: p.items.map((i) => ({
      productId: i.product_id ? String(i.product_id) : `custom-${i.product_name}`,
      productName: i.product_name,
      quantity: i.quantity,
      cost: Number(i.cost),
    })),
    total: Number(p.total),
    date: p.date,
    status: p.status,
  };
}

export function fromApiSale(s: ApiSale): Sale {
  return {
    id: String(s.id),
    items: s.items.map((i) => ({
      productId: i.product_id ? String(i.product_id) : "",
      productName: i.product_name,
      quantity: i.quantity,
      price: Number(i.price),
    })),
    total: Number(s.total),
    date: s.date,
    paymentMethod: s.payment_method,
    status: s.status,
    splitPayment:
      s.split_cash != null && s.split_online != null
        ? { cash: Number(s.split_cash), online: Number(s.split_online) }
        : undefined,
    customerName: s.customer_name ?? undefined,
  };
}

export function fromApiExpense(e: ApiExpense): Expense {
  return {
    id: String(e.id),
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    date: e.date,
    paidBy: e.paid_by,
    receipt: e.receipt ?? undefined,
    status: e.status,
  };
}

export function fromApiCustomer(c: ApiCustomer): Customer {
  return {
    id: String(c.id),
    name: c.name,
    email: c.email,
    phone: c.phone,
    totalSpent: Number(c.total_spent),
    totalOrders: c.total_orders,
    loyaltyPoints: c.loyalty_points,
    joinDate: c.join_date,
    lastVisit: c.last_visit,
    tier: c.tier,
  };
}

export function fromApiAlert(a: ApiAlert): Alert {
  return {
    id: String(a.id),
    type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    createdAt: a.created_at,
    read: a.read,
    actionUrl: a.action_url ?? undefined,
    module: a.module,
  };
}

export function fromApiStaff(s: ApiStaff): Staff {
  return {
    id: String(s.id),
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    department: s.department,
    joinDate: s.join_date,
    salary: Number(s.salary),
    status: s.status,
    avatar: s.avatar ?? undefined,
    hasLogin: Boolean(s.has_login),
  };
}

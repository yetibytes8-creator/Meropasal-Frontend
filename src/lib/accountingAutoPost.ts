import {
  accountingEntries,
  chartAccounts,
  type ApiAccountingEntry,
  type ApiChartAccount,
  type ApiPurchase,
  type ApiSale,
} from "@/lib/api";
import type { Order, Purchase, Sale } from "@/types";

type AccountSeed = {
  code: string;
  name: string;
  account_type: ApiChartAccount["account_type"];
  group: string;
};

const ACCOUNTS = {
  cash: { code: "1001", name: "Cash in Hand", account_type: "asset", group: "Cash & Bank" },
  bank: { code: "1002", name: "Bank / Digital Wallet", account_type: "asset", group: "Cash & Bank" },
  receivable: { code: "1101", name: "Accounts Receivable", account_type: "asset", group: "Receivable" },
  payable: { code: "2101", name: "Accounts Payable", account_type: "liability", group: "Payable" },
  salaryPayable: { code: "2300", name: "Salary Payable", account_type: "liability", group: "Payroll Liabilities" },
  tdsPayable: { code: "2100", name: "TDS Payable", account_type: "liability", group: "Current Liabilities" },
  staffAdvance: { code: "2320", name: "Staff Advance Payable", account_type: "liability", group: "Payroll Liabilities" },
  sales: { code: "4001", name: "Sales Revenue", account_type: "income", group: "Sales" },
  purchase: { code: "5001", name: "Purchase / Stock In", account_type: "expense", group: "Purchase" },
  refund: { code: "5002", name: "Sales Return / Refund", account_type: "expense", group: "Returns" },
  discount: { code: "5003", name: "Sales Discount", account_type: "expense", group: "Discount" },
  salaryExpense: { code: "5100", name: "Salary Expense", account_type: "expense", group: "Operating Expenses" },
} satisfies Record<string, AccountSeed>;

type PaymentMode = ApiAccountingEntry["payment_mode"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function paymentMode(method?: string): PaymentMode {
  if (method === "cash") return "cash";
  if (method === "card") return "card";
  if (method === "mobile" || method === "split") return "esewa";
  if (method === "credit") return "credit";
  return "other";
}

async function ensureAccount(seed: AccountSeed): Promise<ApiChartAccount> {
  const accounts = await chartAccounts.list();
  const existing = accounts.find((account) => account.code === seed.code || account.name.toLowerCase() === seed.name.toLowerCase());
  if (existing) return existing;
  return chartAccounts.create({
    ...seed,
    opening_debit: 0,
    opening_credit: 0,
    is_active: true,
  });
}

async function alreadyPosted(reference: string, type: ApiAccountingEntry["entry_type"]) {
  const entries = await accountingEntries.list();
  return entries.some((entry) => entry.reference_number === reference && entry.entry_type === type);
}

async function postLine(params: {
  account: AccountSeed;
  entry_type: ApiAccountingEntry["entry_type"];
  debit?: number;
  credit?: number;
  mode?: PaymentMode;
  reference: string;
  party?: string;
  description: string;
  date?: string;
}) {
  const account = await ensureAccount(params.account);
  await accountingEntries.create({
    date: params.date ?? today(),
    entry_type: params.entry_type,
    account_id: account.id,
    debit: Number((params.debit ?? 0).toFixed(2)),
    credit: Number((params.credit ?? 0).toFixed(2)),
    payment_mode: params.mode ?? "other",
    bank_name: params.mode === "esewa" ? "Digital Wallet / QR" : "",
    cheque_number: "",
    reference_number: params.reference,
    party_name: params.party ?? "",
    description: params.description,
  });
}

async function postPair(params: {
  debitAccount: AccountSeed;
  creditAccount: AccountSeed;
  entry_type: ApiAccountingEntry["entry_type"];
  amount: number;
  mode?: PaymentMode;
  reference: string;
  party?: string;
  description: string;
  date?: string;
}) {
  if (!params.amount || params.amount <= 0) return;
  if (await alreadyPosted(params.reference, params.entry_type)) return;
  await postLine({ ...params, account: params.debitAccount, debit: params.amount, credit: 0 });
  await postLine({ ...params, account: params.creditAccount, debit: 0, credit: params.amount });
}

export async function postInventorySaleToAccounts(sale: ApiSale | Sale | {
  id: string | number;
  billNumber?: string;
  total?: number;
  grandTotal?: number;
  paymentMethod?: string;
  payment_method?: string;
  customerName?: string;
  customer_name?: string | null;
  items?: Array<{ productName?: string; product_name?: string; name?: string; quantity: number }>;
}) {
  const reference = `SALE-${sale.billNumber ?? sale.id}`;
  const amount = Number(sale.grandTotal ?? sale.total ?? 0);
  const method = sale.paymentMethod ?? sale.payment_method;
  const itemText = (sale.items ?? []).map((item) => `${item.quantity}x ${item.productName ?? item.product_name ?? item.name ?? "Item"}`).join(", ");
  await postPair({
    debitAccount: method === "cash" ? ACCOUNTS.cash : ACCOUNTS.bank,
    creditAccount: ACCOUNTS.sales,
    entry_type: "sale",
    amount,
    mode: paymentMode(method),
    reference,
    party: sale.customerName ?? sale.customer_name ?? "Walk-in Customer",
    description: `Inventory sale${itemText ? `: ${itemText}` : ""}`,
  });
}

export async function postInventoryPurchaseToAccounts(purchase: ApiPurchase | Purchase) {
  const reference = `PUR-${purchase.id}`;
  const amount = Number(purchase.total ?? 0);
  const itemText = (purchase.items ?? []).map((item) => `${item.quantity}x ${"productName" in item ? item.productName : item.product_name}`).join(", ");
  await postPair({
    debitAccount: ACCOUNTS.purchase,
    creditAccount: ACCOUNTS.payable,
    entry_type: "purchase",
    amount,
    mode: "credit",
    reference,
    party: purchase.supplierName ?? ("supplier_name" in purchase ? purchase.supplier_name : ""),
    description: `Purchase received${itemText ? `: ${itemText}` : ""}`,
    date: purchase.date,
  });
}

export async function postRestaurantBillToAccounts(order: Order) {
  const reference = `REST-${order.id}`;
  await postPair({
    debitAccount: order.paymentMethod === "cash" ? ACCOUNTS.cash : ACCOUNTS.bank,
    creditAccount: ACCOUNTS.sales,
    entry_type: "sale",
    amount: Number(order.total ?? 0),
    mode: paymentMode(order.paymentMethod),
    reference,
    party: order.customerName ?? "Walk-in Customer",
    description: `Restaurant bill: ${order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}`,
    date: order.createdAt.slice(0, 10),
  });
}

export async function postRefundToAccounts(params: {
  reference: string;
  amount: number;
  method?: string;
  party?: string;
  description: string;
}) {
  await postPair({
    debitAccount: ACCOUNTS.refund,
    creditAccount: params.method === "cash" ? ACCOUNTS.cash : ACCOUNTS.bank,
    entry_type: "refund",
    amount: params.amount,
    mode: paymentMode(params.method),
    reference: `REF-${params.reference}`,
    party: params.party ?? "",
    description: params.description,
  });
}

export async function postSalaryAccrualToAccounts(params: {
  reference: string;
  grossSalary: number;
  tdsAmount?: number;
  advanceDeduction?: number;
  staffName?: string;
  date?: string;
}) {
  const netPayable = params.grossSalary - (params.tdsAmount ?? 0) - (params.advanceDeduction ?? 0);
  await postPair({
    debitAccount: ACCOUNTS.salaryExpense,
    creditAccount: ACCOUNTS.salaryPayable,
    entry_type: "expense",
    amount: netPayable,
    mode: "credit",
    reference: `SAL-${params.reference}`,
    party: params.staffName ?? "Staff",
    description: "Salary accrued and payable",
    date: params.date,
  });
  if (params.tdsAmount) {
    await postPair({
      debitAccount: ACCOUNTS.salaryExpense,
      creditAccount: ACCOUNTS.tdsPayable,
      entry_type: "expense",
      amount: params.tdsAmount,
      mode: "credit",
      reference: `TDS-SAL-${params.reference}`,
      party: params.staffName ?? "Staff",
      description: "TDS deducted from salary",
      date: params.date,
    });
  }
  if (params.advanceDeduction) {
    await postPair({
      debitAccount: ACCOUNTS.salaryPayable,
      creditAccount: ACCOUNTS.staffAdvance,
      entry_type: "expense",
      amount: params.advanceDeduction,
      mode: "credit",
      reference: `ADV-SAL-${params.reference}`,
      party: params.staffName ?? "Staff",
      description: "Staff advance adjusted against salary",
      date: params.date,
    });
  }
}

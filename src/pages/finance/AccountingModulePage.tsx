import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Archive,
  Banknote,
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Eye,
  Landmark,
  Receipt,
  RefreshCcw,
  RotateCcw,
  Scale,
  ShieldCheck,
  WalletCards,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ModuleConfig = {
  title: string;
  subtitle: string;
  reportNo: string;
  icon: typeof Receipt;
  fields: string[];
  rows: Array<Record<string, string>>;
  actions: string[];
};

type SavedAccountingEntry = Record<string, string> & {
  id: string;
  status: "Draft" | "Posted";
  createdAt: string;
  postedAt?: string;
  updatedAt?: string;
};

type AttachmentMeta = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

function fieldKey(field: string) {
  return field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function entryStorageKey(slug: string) {
  return `mero-pasal-accounting-${slug}`;
}

function readSavedEntries(slug: string): SavedAccountingEntry[] {
  try {
    const raw = window.localStorage.getItem(entryStorageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function seedForm(fields: string[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    const key = fieldKey(field);
    if (field.toLowerCase().includes("date")) acc[key] = todayLabel();
    else if (field.toLowerCase().includes("amount")) acc[key] = "0";
    else acc[key] = "";
    return acc;
  }, {});
}

function isFileField(field: string) {
  const lower = field.toLowerCase();
  return lower.includes("file") || lower.includes("document") || lower.includes("attachment") || lower.includes("receipt");
}

function attachmentKey(field: string) {
  return `${fieldKey(field)}_attachment`;
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fieldOptions(field: string) {
  const lower = field.toLowerCase();
  if (lower.includes("branch")) return ["Main Branch", "Branch 2", "All Branches"];
  if (lower.includes("account")) {
    return [
      "Cash in Hand",
      "Bank Account",
      "eSewa / QR Wallet",
      "Accounts Receivable",
      "Accounts Payable",
      "Sales Income",
      "Purchase Account",
      "Salary Payable",
      "TDS Payable",
      "Owner Capital",
    ];
  }
  if (lower.includes("type")) return ["Sales", "Purchase", "Expense", "Refund", "Transfer", "Adjustment"];
  if (lower.includes("status")) return ["Draft", "Pending", "Approved", "Posted", "Cleared"];
  if (lower.includes("method") || lower.includes("paid from") || lower.includes("refund from")) {
    return ["Cash", "Bank", "Card", "eSewa", "Khalti", "Fonepay", "Cheque", "Split"];
  }
  if (lower.includes("group")) return ["Assets", "Liabilities", "Equity", "Income", "Expense"];
  return [];
}

const modules: Record<string, ModuleConfig> = {
  "journal-voucher": {
    title: "Journal Voucher",
    subtitle: "Manual debit and credit entry for accountant adjustments",
    reportNo: "JV-MANUAL",
    icon: BookOpenCheck,
    fields: ["Voucher Date", "Voucher No.", "Debit Account", "Credit Account", "Amount", "Narration"],
    actions: ["Save Voucher", "Post to Ledger", "Print Voucher"],
    rows: [
      { date: "Today", account: "Cash Account", type: "Debit", amount: "Rs. 0", status: "Draft" },
      { date: "Today", account: "Sales Income", type: "Credit", amount: "Rs. 0", status: "Balanced" },
    ],
  },
  "sales-register": {
    title: "Sales Register",
    subtitle: "Invoice-wise sales, VAT/PAN, discount, receipt and due tracking",
    reportNo: "SR-ALL",
    icon: Receipt,
    fields: ["Invoice No.", "Customer", "Branch", "Payment Method", "Taxable Amount", "VAT", "Discount"],
    actions: ["Add Sale Entry", "Export Register", "Print Sales Register"],
    rows: [
      { date: "Today", invoice: "POS-001", party: "Walk-in Customer", amount: "Rs. 0", status: "Paid" },
      { date: "Today", invoice: "BILL-001", party: "Credit Customer", amount: "Rs. 0", status: "Due" },
    ],
  },
  "purchase-register": {
    title: "Purchase Register",
    subtitle: "Supplier bill, purchase VAT, stock purchase and payable tracking",
    reportNo: "PR-ALL",
    icon: FileText,
    fields: ["Bill No.", "Supplier", "Branch", "Purchase Account", "VAT", "Paid From", "Payable"],
    actions: ["Add Purchase", "Record Supplier Payment", "Print Purchase Register"],
    rows: [
      { date: "Today", invoice: "SUP-001", party: "Supplier", amount: "Rs. 0", status: "Unpaid" },
      { date: "Today", invoice: "GRN-001", party: "Stock Purchase", amount: "Rs. 0", status: "Posted" },
    ],
  },
  "refunds-returns": {
    title: "Refunds & Returns",
    subtitle: "Sales return, purchase return, overpayment refund and cancelled order refund",
    reportNo: "RR-ALL",
    icon: RotateCcw,
    fields: ["Refund Type", "Reference Bill", "Customer/Supplier", "Refund From", "Amount", "Reason"],
    actions: ["Create Refund", "Approve Refund", "Print Credit Note"],
    rows: [
      { date: "Today", reference: "BILL-001", party: "Customer", amount: "Rs. 0", status: "Pending" },
      { date: "Today", reference: "PUR-001", party: "Supplier", amount: "Rs. 0", status: "Adjusted" },
    ],
  },
  "payroll-payables": {
    title: "Payroll & Salary Payables",
    subtitle: "Salary expense, salary payable, TDS payable, staff advance and loan adjustment tracking",
    reportNo: "PAYROLL",
    icon: Banknote,
    fields: ["Salary Month", "Staff", "Gross Salary", "TDS Deducted", "Advance/Loan Deduction", "Net Payable", "Paid From"],
    actions: ["Accrue Salary", "Record Salary Payment", "Print Payroll Sheet"],
    rows: [
      { account: "Salary Expense", type: "Expense", amount: "Rs. 0", status: "Debit" },
      { account: "Salary Payable", type: "Liability", amount: "Rs. 0", status: "Credit" },
      { account: "TDS Payable", type: "Liability", amount: "Rs. 0", status: "Credit" },
      { account: "Staff Advance / Loan", type: "Adjustment", amount: "Rs. 0", status: "Adjusted" },
    ],
  },
  "bank-reconciliation": {
    title: "Bank Reconciliation",
    subtitle: "Match bank statement with software cash and bank ledger",
    reportNo: "BR-OPEN",
    icon: Landmark,
    fields: ["Bank Account", "Statement Date", "Book Balance", "Bank Balance", "Difference", "Remarks"],
    actions: ["Import Statement", "Match Entries", "Finalize Reconciliation"],
    rows: [
      { date: "Today", reference: "DEP-001", party: "Deposit", amount: "Rs. 0", status: "Matched" },
      { date: "Today", reference: "CHQ-001", party: "Cheque", amount: "Rs. 0", status: "Unmatched" },
    ],
  },
  "cheque-management": {
    title: "Cheque Management",
    subtitle: "Issued, received, cleared, bounced and pending cheque tracking",
    reportNo: "CHQ-ALL",
    icon: WalletCards,
    fields: ["Cheque No.", "Bank", "Party", "Issue/Receive Date", "Amount", "Status"],
    actions: ["Add Cheque", "Mark Cleared", "Mark Bounced"],
    rows: [
      { date: "Today", reference: "000001", party: "Supplier", amount: "Rs. 0", status: "Issued" },
      { date: "Today", reference: "000002", party: "Customer", amount: "Rs. 0", status: "Received" },
    ],
  },
  "audit-trail": {
    title: "Audit Trail",
    subtitle: "Track who created, edited, deleted or approved every sensitive record",
    reportNo: "AUDIT",
    icon: ShieldCheck,
    fields: ["User", "Action", "Module", "Record ID", "Time", "Device/IP"],
    actions: ["Filter Logs", "Export Audit", "Print Audit Trail"],
    rows: [
      { date: "Today", user: "Admin", action: "Created Invoice", module: "Billing", status: "Logged" },
      { date: "Today", user: "Accountant", action: "Posted Voucher", module: "Finance", status: "Logged" },
    ],
  },
  "fiscal-year-closing": {
    title: "Fiscal Year Closing",
    subtitle: "Lock year, carry opening balances and prepare next fiscal year",
    reportNo: "FY-CLOSE",
    icon: CalendarClock,
    fields: ["Closing Year", "Next Fiscal Year", "Opening Cash", "Opening Bank", "Stock Value", "Lock Date"],
    actions: ["Validate Books", "Close Fiscal Year", "Carry Forward"],
    rows: [
      { account: "Cash", type: "Asset", amount: "Rs. 0", status: "Ready" },
      { account: "Capital", type: "Equity", amount: "Rs. 0", status: "Ready" },
    ],
  },
  "opening-balance": {
    title: "Opening Balance",
    subtitle: "Set cash, bank, stock, customer due, supplier due and capital balances",
    reportNo: "OB-SETUP",
    icon: Scale,
    fields: ["Account", "Group", "Debit Opening", "Credit Opening", "Branch", "Remarks"],
    actions: ["Add Opening Balance", "Validate Trial Balance", "Post Opening"],
    rows: [
      { account: "Cash in Hand", type: "Asset", amount: "Rs. 0", status: "Debit" },
      { account: "Owner Capital", type: "Equity", amount: "Rs. 0", status: "Credit" },
    ],
  },
  "customer-supplier-ledger": {
    title: "Customer & Supplier Ledger",
    subtitle: "Credit customers, supplier payable and party-wise payment history",
    reportNo: "CS-LEDGER",
    icon: ClipboardCheck,
    fields: ["Party Type", "Party Name", "Opening", "Invoice", "Payment", "Closing"],
    actions: ["Add Party Entry", "Send Statement", "Print Ledger"],
    rows: [
      { date: "Today", party: "Walk-in Customer", amount: "Rs. 0", status: "Settled" },
      { date: "Today", party: "Main Supplier", amount: "Rs. 0", status: "Payable" },
    ],
  },
  "stock-valuation": {
    title: "Stock Valuation",
    subtitle: "Opening stock, purchase, sales, closing stock and cost of goods sold",
    reportNo: "STK-VAL",
    icon: Archive,
    fields: ["Item", "Opening Qty", "Purchase Qty", "Sales Qty", "Closing Qty", "Average Cost"],
    actions: ["Calculate Valuation", "Export Stock Value", "Print COGS"],
    rows: [
      { item: "Menu Item / Product", qty: "0", amount: "Rs. 0", status: "Average Cost" },
      { item: "Closing Stock", qty: "0", amount: "Rs. 0", status: "Asset" },
    ],
  },
  "tds-compliance": {
    title: "TDS Compliance",
    subtitle: "TDS deducted, TDS payable and vendor/staff/service tax tracking",
    reportNo: "TDS",
    icon: FileCheck2,
    fields: ["Party", "PAN", "Service Type", "Gross Amount", "TDS Rate", "TDS Amount"],
    actions: ["Add TDS Entry", "Prepare TDS Payable", "Print TDS Summary"],
    rows: [
      { date: "Today", party: "Service Vendor", amount: "Rs. 0", status: "Deducted" },
      { date: "Today", party: "TDS Payable", amount: "Rs. 0", status: "Pending" },
    ],
  },
  "vat-tds-reconciliation": {
    title: "VAT & TDS Reconciliation",
    subtitle: "Match sales VAT, purchase VAT, TDS deducted, TDS payable and statutory deposit",
    reportNo: "VAT-TDS-REC",
    icon: FileCheck2,
    fields: ["Tax Period", "PAN/VAT No.", "Sales VAT", "Purchase VAT", "TDS Deducted", "Deposit Voucher", "Difference", "Remarks"],
    actions: ["Calculate Difference", "Attach Voucher", "Print Tax Reconciliation"],
    rows: [
      { tax: "Output VAT", books: "Rs. 0", return: "Rs. 0", difference: "Rs. 0", status: "Matched" },
      { tax: "Input VAT", books: "Rs. 0", return: "Rs. 0", difference: "Rs. 0", status: "Review" },
      { tax: "TDS Payable", books: "Rs. 0", return: "Rs. 0", difference: "Rs. 0", status: "Pending Deposit" },
      { tax: "TDS Receivable", books: "Rs. 0", return: "Rs. 0", difference: "Rs. 0", status: "Claimable" },
    ],
  },
  "mis-reporting": {
    title: "Management Information System",
    subtitle: "Owner-level daily and monthly dashboard for sales, margin, stock, dues and cash flow",
    reportNo: "MIS-MONTHLY",
    icon: ClipboardCheck,
    fields: ["Report Period", "Branch", "Sales Target", "Expense Budget", "Stock Alert Limit", "Receivable Limit"],
    actions: ["Generate MIS", "Send to Owner", "Print MIS Pack"],
    rows: [
      { metric: "Net Sales", current: "Rs. 0", previous: "Rs. 0", variance: "0%", status: "Stable" },
      { metric: "Gross Margin", current: "0%", previous: "0%", variance: "0%", status: "Review" },
      { metric: "Cash & Bank", current: "Rs. 0", previous: "Rs. 0", variance: "0%", status: "OK" },
      { metric: "Customer Due", current: "Rs. 0", previous: "Rs. 0", variance: "0%", status: "Monitor" },
      { metric: "Low Stock Items", current: "0", previous: "0", variance: "0", status: "OK" },
    ],
  },
  "financial-statements": {
    title: "Financial Statements",
    subtitle: "Trial balance, profit and loss, balance sheet, cash flow and notes in one report pack",
    reportNo: "FS-PACK",
    icon: Scale,
    fields: ["Fiscal Year", "Statement Type", "Branch", "Prepared By", "Reviewed By", "Notes"],
    actions: ["Generate Statement", "Lock Statement", "Print Statement Pack"],
    rows: [
      { statement: "Trial Balance", purpose: "Debit and credit validation", amount: "Rs. 0", status: "Ready" },
      { statement: "Profit & Loss", purpose: "Income, COGS and expense result", amount: "Rs. 0", status: "Ready" },
      { statement: "Balance Sheet", purpose: "Assets, liabilities and equity", amount: "Rs. 0", status: "Ready" },
      { statement: "Cash Flow", purpose: "Operating, investing and financing cash", amount: "Rs. 0", status: "Ready" },
    ],
  },
  "ratio-analysis": {
    title: "Ratio Analysis",
    subtitle: "Liquidity, profitability, leverage and efficiency ratios for owner and auditor review",
    reportNo: "RATIO",
    icon: Scale,
    fields: ["Period", "Branch", "Current Assets", "Current Liabilities", "Net Profit", "Sales", "Inventory", "Receivables"],
    actions: ["Calculate Ratios", "Compare Previous Period", "Print Ratio Analysis"],
    rows: [
      { ratio: "Current Ratio", formula: "Current Assets / Current Liabilities", result: "0.00", benchmark: ">= 1.5", status: "Needs data" },
      { ratio: "Gross Profit Margin", formula: "Gross Profit / Sales", result: "0%", benchmark: "Business defined", status: "Needs data" },
      { ratio: "Net Profit Margin", formula: "Net Profit / Sales", result: "0%", benchmark: "Positive", status: "Needs data" },
      { ratio: "Inventory Turnover", formula: "COGS / Average Inventory", result: "0.00", benchmark: "Higher is better", status: "Needs data" },
      { ratio: "Receivable Days", formula: "Debtors / Sales x Days", result: "0 days", benchmark: "Lower is better", status: "Needs data" },
    ],
  },
  "provisional-report": {
    title: "Provisional Financial Report",
    subtitle: "Unaudited provisional income, expense, tax and closing position for management decision",
    reportNo: "PROV",
    icon: FileText,
    fields: ["Period From", "Period To", "Estimated Sales", "Estimated Expenses", "Provision For Tax", "Accrual Notes"],
    actions: ["Prepare Provisional", "Mark Reviewed", "Print Provisional Report"],
    rows: [
      { head: "Estimated Revenue", actual: "Rs. 0", adjustment: "Rs. 0", provisional: "Rs. 0", status: "Draft" },
      { head: "Estimated Expense", actual: "Rs. 0", adjustment: "Rs. 0", provisional: "Rs. 0", status: "Draft" },
      { head: "Provision For VAT/TDS/Tax", actual: "Rs. 0", adjustment: "Rs. 0", provisional: "Rs. 0", status: "Draft" },
      { head: "Provisional Net Profit", actual: "Rs. 0", adjustment: "Rs. 0", provisional: "Rs. 0", status: "Draft" },
    ],
  },
  "five-year-projection": {
    title: "5 Year Projection Report",
    subtitle: "Projected sales, cost, expense, profit, cash and investment requirement for planning",
    reportNo: "5Y-PROJ",
    icon: CalendarClock,
    fields: ["Base Year Sales", "Growth %", "Gross Margin %", "Expense Growth %", "Loan/Investment", "Projection Notes"],
    actions: ["Generate Projection", "Compare Scenario", "Print 5 Year Projection"],
    rows: [
      { year: "Year 1", sales: "Rs. 0", expenses: "Rs. 0", profit: "Rs. 0", cash: "Rs. 0", status: "Projected" },
      { year: "Year 2", sales: "Rs. 0", expenses: "Rs. 0", profit: "Rs. 0", cash: "Rs. 0", status: "Projected" },
      { year: "Year 3", sales: "Rs. 0", expenses: "Rs. 0", profit: "Rs. 0", cash: "Rs. 0", status: "Projected" },
      { year: "Year 4", sales: "Rs. 0", expenses: "Rs. 0", profit: "Rs. 0", cash: "Rs. 0", status: "Projected" },
      { year: "Year 5", sales: "Rs. 0", expenses: "Rs. 0", profit: "Rs. 0", cash: "Rs. 0", status: "Projected" },
    ],
  },
  "approval-workflow": {
    title: "Approval Workflow",
    subtitle: "Approve high discounts, refunds, expenses and purchase payments",
    reportNo: "APPROVAL",
    icon: ClipboardCheck,
    fields: ["Request Type", "Requested By", "Amount", "Reason", "Approver", "Status"],
    actions: ["Create Request", "Approve", "Reject"],
    rows: [
      { date: "Today", reference: "DISC-001", party: "Cashier", amount: "Rs. 0", status: "Pending" },
      { date: "Today", reference: "EXP-001", party: "Manager", amount: "Rs. 0", status: "Approved" },
    ],
  },
  "document-attachments": {
    title: "Document Attachments",
    subtitle: "Attach supplier bills, receipts, cheque images and tax documents",
    reportNo: "DOCS",
    icon: FileCheck2,
    fields: ["Document Type", "Reference No.", "Party", "File", "Verified By", "Remarks"],
    actions: ["Upload Document", "Verify Document", "Print Attachment List"],
    rows: [
      { date: "Today", reference: "BILL-001", party: "Supplier", status: "Attached" },
      { date: "Today", reference: "RCPT-001", party: "Customer", status: "Pending" },
    ],
  },
  "cash-flow": {
    title: "Cash Flow Report",
    subtitle: "Cash in and out from sales, purchase, expense, owner and bank transfer",
    reportNo: "CF-ALL",
    icon: Banknote,
    fields: ["Period", "Operating Cash", "Investing Cash", "Financing Cash", "Opening", "Closing"],
    actions: ["Calculate Cash Flow", "Export Cash Flow", "Print Report"],
    rows: [
      { section: "Operating", inflow: "Rs. 0", outflow: "Rs. 0", net: "Rs. 0", status: "Current" },
      { section: "Financing", inflow: "Rs. 0", outflow: "Rs. 0", net: "Rs. 0", status: "Owner" },
    ],
  },
  "branch-reporting": {
    title: "Branch Reporting",
    subtitle: "Branch-wise sales, cash, bank, expenses, stock and profit",
    reportNo: "BRANCH",
    icon: Landmark,
    fields: ["Branch", "Sales", "Cash", "Bank", "Expenses", "Net Profit"],
    actions: ["Filter Branch", "Consolidate", "Print Branch Report"],
    rows: [
      { branch: "Main Branch", sales: "Rs. 0", expenses: "Rs. 0", profit: "Rs. 0", status: "Open" },
      { branch: "All Branches", sales: "Rs. 0", expenses: "Rs. 0", profit: "Rs. 0", status: "Consolidated" },
    ],
  },
};

function humanize(slug?: string) {
  return (slug || "accounting-module")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveSlug(pathname: string, paramSlug?: string) {
  if (paramSlug) return paramSlug;
  const parts = pathname.split("/").filter(Boolean);
  return parts.at(-1) || "journal-voucher";
}

export default function AccountingModulePage() {
  const { user, profile } = useAuth();
  const { slug } = useParams();
  const location = useLocation();
  const resolvedSlug = resolveSlug(location.pathname, slug);
  const config = modules[resolvedSlug] ?? {
    title: humanize(resolvedSlug),
    subtitle: "Accountant module workspace",
    reportNo: resolvedSlug.toUpperCase(),
    icon: Receipt,
    fields: ["Date", "Reference No.", "Account", "Branch", "Amount", "Remarks"],
    actions: ["Save Entry", "Post Entry", "Print"],
    rows: [{ date: "Today", reference: "NEW", account: humanize(resolvedSlug), amount: "Rs. 0", status: "Draft" }],
  };
  const Icon = config.icon;
  const operatorName = profile?.full_name || user?.email || "System User";
  const printedAt = new Date().toLocaleString();
  const [form, setForm] = useState<Record<string, string>>(() => seedForm(config.fields));
  const [savedEntries, setSavedEntries] = useState<SavedAccountingEntry[]>(() => readSavedEntries(resolvedSlug));
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentMeta | null>(null);

  useEffect(() => {
    setForm(seedForm(config.fields));
    setSavedEntries(readSavedEntries(resolvedSlug));
    setEditingEntryId(null);
  }, [config.fields, resolvedSlug]);

  useEffect(() => {
    window.localStorage.setItem(entryStorageKey(resolvedSlug), JSON.stringify(savedEntries));
  }, [resolvedSlug, savedEntries]);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetEntryForm = () => {
    setForm(seedForm(config.fields));
    setEditingEntryId(null);
  };

  const editEntry = (entry: SavedAccountingEntry) => {
    const nextForm = seedForm(config.fields);
    config.fields.forEach((field) => {
      const key = fieldKey(field);
      nextForm[key] = String(entry[key] ?? "");
      const fileKey = attachmentKey(field);
      if (entry[fileKey]) nextForm[fileKey] = String(entry[fileKey]);
    });
    setForm(nextForm);
    setEditingEntryId(entry.id);
    toast.info(`${config.title} loaded for update`);
  };

  const handleFileUpload = (field: string, file?: File) => {
    const key = fieldKey(field);
    const fileKey = attachmentKey(field);
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      toast.error("Attachment must be below 2.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: AttachmentMeta = {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        dataUrl: String(reader.result || ""),
      };
      setForm((prev) => ({
        ...prev,
        [key]: `${attachment.name} (${formatBytes(attachment.size)})`,
        [fileKey]: JSON.stringify(attachment),
      }));
      toast.success(`${file.name} attached`);
    };
    reader.onerror = () => toast.error("Could not read attachment");
    reader.readAsDataURL(file);
  };

  const clearAttachment = (field: string) => {
    const key = fieldKey(field);
    const fileKey = attachmentKey(field);
    setForm((prev) => {
      const next = { ...prev, [key]: "" };
      delete next[fileKey];
      return next;
    });
  };

  const openAttachment = (raw?: string) => {
    if (!raw) {
      toast.info("No attachment found");
      return;
    }
    try {
      const attachment = JSON.parse(raw) as AttachmentMeta;
      setPreviewAttachment(attachment);
    } catch {
      toast.error("Attachment could not be opened");
    }
  };

  const saveDraftEntry = () => {
    const requiredValue = config.fields
      .map((field) => form[fieldKey(field)]?.trim())
      .find((value) => value && value !== "0");

    if (!requiredValue) {
      toast.error("At least one meaningful accounting value is required");
      return;
    }

    if (editingEntryId) {
      setSavedEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingEntryId
            ? {
                ...entry,
                updatedAt: new Date().toLocaleString(),
                ...config.fields.reduce<Record<string, string>>((acc, field) => {
                  const key = fieldKey(field);
                  acc[key] = form[key]?.trim() || "-";
                  if (isFileField(field) && form[attachmentKey(field)]) {
                    acc[attachmentKey(field)] = form[attachmentKey(field)];
                  }
                  return acc;
                }, {}),
              }
            : entry,
        ),
      );
      resetEntryForm();
      toast.success(`${config.title} updated`);
      return;
    }

    const entry: SavedAccountingEntry = {
      id: `${resolvedSlug}-${Date.now()}`,
      createdAt: printedAt,
      status: "Draft",
      ...config.fields.reduce<Record<string, string>>((acc, field) => {
        const key = fieldKey(field);
        acc[key] = form[key]?.trim() || "-";
        if (isFileField(field) && form[attachmentKey(field)]) {
          acc[attachmentKey(field)] = form[attachmentKey(field)];
        }
        return acc;
      }, {}),
    };

    setSavedEntries((prev) => [entry, ...prev]);
    resetEntryForm();
    toast.success(`${config.title} draft saved`);
  };

  const postDraftEntries = () => {
    const draftCount = savedEntries.filter((entry) => entry.status === "Draft").length;
    if (!draftCount) {
      toast.info("No draft entries to post");
      return;
    }

    setSavedEntries((prev) =>
      prev.map((entry) =>
        entry.status === "Draft"
          ? { ...entry, status: "Posted", postedAt: new Date().toLocaleString() }
          : entry,
      ),
    );
    toast.success(`${draftCount} entry posted to ledger`);
  };

  const deleteEntry = (id: string) => {
    setSavedEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (editingEntryId === id) resetEntryForm();
    toast.success("Draft entry removed");
  };

  const reportDetails = [
    ["Report Title", config.title],
    ["Report No.", config.reportNo],
    ["Period", "Current fiscal year"],
    ["Branch", "All Branches"],
    ["Basis", "Accrual / cash mixed"],
    ["Prepared By", operatorName],
    ["Printed By", operatorName],
    ["Printed At", printedAt],
  ];

  const defaultRows = useMemo(
    () => config.rows.map((row, index) => ({ id: `sample-${index}`, status: row.status || "Template", createdAt: "-", ...row })),
    [config.rows],
  );
  const registerRows = savedEntries.length ? savedEntries : defaultRows;
  const tableKeys = useMemo(() => {
    const preferred = config.fields.map(fieldKey);
    const discovered = Array.from(new Set(registerRows.flatMap((row) => Object.keys(row))));
    return [
      ...preferred,
      ...discovered.filter((key) =>
        !preferred.includes(key) &&
        !key.endsWith("_attachment") &&
        !["id", "createdAt", "postedAt", "updatedAt"].includes(key),
      ),
    ];
  }, [config.fields, registerRows]);
  const totalLabel = `Total Records: ${registerRows.length}`;
  const draftCount = savedEntries.filter((entry) => entry.status === "Draft").length;
  const postedCount = savedEntries.filter((entry) => entry.status === "Posted").length;
  const pendingReviewCount = Math.max(draftCount - postedCount, 0);
  const statusSummary = [
    ["Entries", String(registerRows.length)],
    ["Draft", String(savedEntries.length ? draftCount : 1)],
    ["Posted", String(postedCount)],
    ["Pending Review", String(pendingReviewCount)],
  ];

  return (
    <>
    <div className="finance-page space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <FinanceStatementHeader
        title={config.title}
        subtitle={config.subtitle}
        periodLabel="Current fiscal year"
        reportNo={config.reportNo}
        onExport={() => toast.success(`${config.title} export prepared`)}
      />

      <div data-print-hide className="grid gap-3 md:grid-cols-4 print:hidden">
        {statusSummary.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div data-print-hide className="grid gap-4 xl:grid-cols-[1fr_0.9fr] print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>{editingEntryId ? `Update ${config.title}` : "Entry Form"}</span>
              {editingEntryId && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Editing voucher
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {config.fields.map((field) => (
              <div key={field} className={field === "Narration" || field === "Remarks" || field === "Reason" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <Label>{field}</Label>
                {fieldOptions(field).length ? (
                  <Select value={form[fieldKey(field)]} onValueChange={(value) => updateForm(fieldKey(field), value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions(field).map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field === "Narration" || field === "Remarks" || field === "Reason" ? (
                  <Textarea value={form[fieldKey(field)]} onChange={(event) => updateForm(fieldKey(field), event.target.value)} placeholder={`Enter ${field.toLowerCase()}`} />
                ) : isFileField(field) ? (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(event) => handleFileUpload(field, event.target.files?.[0])}
                    />
                    {form[fieldKey(field)] ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="max-w-full truncate">
                          {form[fieldKey(field)]}
                        </Badge>
                        <Button type="button" variant="outline" size="sm" onClick={() => openAttachment(form[attachmentKey(field)])}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => clearAttachment(field)}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Upload supplier bill, receipt, cheque image, PDF or document.</p>
                    )}
                  </div>
                ) : (
                  <Input
                    value={form[fieldKey(field)]}
                    onChange={(event) => updateForm(fieldKey(field), event.target.value)}
                    placeholder={`Enter ${field.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              {config.actions.map((action, index) => (
                <Button
                  key={action}
                  variant={index === 0 ? "default" : "outline"}
                  onClick={index === 0 ? saveDraftEntry : index === 1 ? postDraftEntries : () => toast.success(`${action} ready`)}
                >
                  {index === 0 && editingEntryId ? action.replace(/^Save|^Add|^Create/, "Update") : action}
                </Button>
              ))}
              {editingEntryId && (
                <Button variant="ghost" onClick={resetEntryForm}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel Update
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accountant Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Branch-wise tracking enabled",
              "Cash, bank, cheque and QR supported",
              "Debit / credit validation required",
              "Audit log required before delete",
              "Print-ready report format",
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{item}</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Active
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card data-print-keep className="finance-print-status-card hidden print:block print:border print:shadow-none">
        <CardHeader className="print:px-4 print:py-3">
          <CardTitle className="text-base">Status Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0 print:px-4 print:pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                {statusSummary.map(([label]) => (
                  <TableHead key={label} className="text-center">{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {statusSummary.map(([label, value]) => (
                  <TableCell key={label} className="text-center text-lg font-bold">{value}</TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card data-print-keep className="finance-print-details-card hidden print:block print:border print:shadow-none">
        <CardHeader className="print:px-4 print:py-3">
          <CardTitle className="text-base">Report Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0 print:px-4 print:pb-4">
          <div className="finance-print-details-grid">
            {reportDetails.map(([label, value]) => (
              <div key={label} className="finance-print-detail-item">
                <span className="finance-print-detail-label">{label}</span>
                <strong className="finance-print-detail-value">{value}</strong>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-print-keep className="finance-print-register-card print:border print:shadow-none">
        <CardHeader className="print:px-4 print:py-3">
          <CardTitle className="text-base">{config.title} Register</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 print:px-4 print:pb-4">
          <Table className="finance-ledger-table finance-accounting-register-table">
            <TableHeader>
              <TableRow>
                {tableKeys.map((key) => (
                  <TableHead key={key} data-column-key={key} className="capitalize">{key.replace(/_/g, " ")}</TableHead>
                ))}
                {savedEntries.length > 0 && <TableHead className="text-right print:hidden">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {registerRows.map((row, index) => (
                <TableRow key={row.id || index}>
                  {tableKeys.map((key) => (
                  <TableCell key={key} data-column-key={key} className={key === "amount" || key === "net" || key === "profit" ? "font-semibold" : undefined}>
                      {key === "file" || key.includes("document") || key.includes("attachment") || key.includes("receipt") ? (
                        row[attachmentKey(key)] ? (
                          <Button type="button" variant="link" className="h-auto p-0 text-left" onClick={() => openAttachment(String(row[attachmentKey(key)]))}>
                            {String(row[key] ?? "View attachment")}
                          </Button>
                        ) : (
                          String(row[key] ?? "-")
                        )
                      ) : (
                        String(row[key] ?? "-")
                      )}
                    </TableCell>
                  ))}
                  {savedEntries.length > 0 && (
                    <TableCell className="print:hidden">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => editEntry(row as SavedAccountingEntry)}
                          title="Update voucher"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteEntry(row.id)}
                        disabled={row.status === "Posted"}
                        title={row.status === "Posted" ? "Posted entries stay in ledger" : "Delete draft"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                {tableKeys.map((key, index) => (
                  <TableCell key={key}>
                    {index === 0 ? totalLabel : key === "amount" || key === "net" || key === "profit" || key === "inflow" || key === "outflow" ? "Rs. 0" : ""}
                  </TableCell>
                ))}
                {savedEntries.length > 0 && <TableCell className="print:hidden" />}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <Dialog open={Boolean(previewAttachment)} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{previewAttachment?.name || "Attachment"}</DialogTitle>
        </DialogHeader>
        {previewAttachment && (
          <div className="min-h-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {previewAttachment.type || "File"} · {formatBytes(previewAttachment.size)}
              </span>
              <Button asChild variant="outline" size="sm">
                <a href={previewAttachment.dataUrl} download={previewAttachment.name}>
                  Download
                </a>
              </Button>
            </div>
            {previewAttachment.type.startsWith("image/") ? (
              <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-xl border bg-slate-950 p-2">
                <img src={previewAttachment.dataUrl} alt={previewAttachment.name} className="max-h-[68vh] max-w-full object-contain" />
              </div>
            ) : previewAttachment.type === "application/pdf" ? (
              <iframe title={previewAttachment.name} src={previewAttachment.dataUrl} className="h-[70vh] w-full rounded-xl border bg-white" />
            ) : (
              <div className="rounded-xl border bg-muted/20 p-6 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-semibold">{previewAttachment.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  यो file browser भित्र preview नहुन सक्छ। Download गरेर खोल्नुस्।
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

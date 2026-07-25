export type FinanceBase = "/finance" | "/restaurant" | "/inventory";

export type FinanceNavItem = {
  title: string;
  url: string;
  end?: boolean;
};

function pathFor(base: FinanceBase, page: string) {
  if (base === "/finance") {
    if (page === "overview") return "/finance";
    return `/finance/${page}`;
  }
  if (page === "overview") return `${base}/finance`;
  if (page === "reports") return `${base}/finance-reports`;
  if (page === "expenses") return `${base}/expenses`;
  if (page === "settings") return `${base}/settings#report-settings`;
  return `${base}/${page}`;
}

export function getFinanceNav(base: FinanceBase): FinanceNavItem[] {
  return [
    { title: "Dashboard", url: pathFor(base, "overview"), end: true },
    { title: "Transactions", url: pathFor(base, "transactions") },
    { title: "Journal Voucher", url: pathFor(base, "journal-voucher") },
    { title: "Day Book", url: pathFor(base, "day-book") },
    { title: "Income", url: pathFor(base, "income") },
    { title: "Expenses", url: pathFor(base, "expenses") },
    { title: "Sales Register", url: pathFor(base, "sales-register") },
    { title: "Purchase Register", url: pathFor(base, "purchase-register") },
    { title: "Refunds & Returns", url: pathFor(base, "refunds-returns") },
    { title: "Payroll & Payables", url: pathFor(base, "payroll-payables") },
    { title: "Payment In / Out", url: pathFor(base, "accounts") },
    { title: "Cash & Banks", url: pathFor(base, "cash-banks") },
    { title: "Bank Reconciliation", url: pathFor(base, "bank-reconciliation") },
    { title: "Cheque Management", url: pathFor(base, "cheque-management") },
    { title: "Tax & Rates", url: pathFor(base, "tax-rates") },
    { title: "TDS Compliance", url: pathFor(base, "tds-compliance") },
    { title: "VAT & TDS Reconciliation", url: pathFor(base, "vat-tds-reconciliation") },
    { title: "Balance Transfer", url: pathFor(base, "balance-transfer") },
    { title: "Chart of Accounts", url: pathFor(base, "chart-of-accounts") },
    { title: "Opening Balance", url: pathFor(base, "opening-balance") },
    { title: "Customer/Supplier Ledger", url: pathFor(base, "customer-supplier-ledger") },
    { title: "Stock Valuation", url: pathFor(base, "stock-valuation") },
    { title: "Branch Reporting", url: pathFor(base, "branch-reporting") },
    { title: "Cash Flow", url: pathFor(base, "cash-flow") },
    { title: "MIS Dashboard", url: pathFor(base, "mis-reporting") },
    { title: "Financial Statements", url: pathFor(base, "financial-statements") },
    { title: "Ratio Analysis", url: pathFor(base, "ratio-analysis") },
    { title: "Provisional Report", url: pathFor(base, "provisional-report") },
    { title: "5 Year Projection", url: pathFor(base, "five-year-projection") },
    { title: "Approval Workflow", url: pathFor(base, "approval-workflow") },
    { title: "Document Attachments", url: pathFor(base, "document-attachments") },
    { title: "Report & Signature Settings", url: pathFor(base, "settings") },
    { title: "Audit Trail", url: pathFor(base, "audit-trail") },
    { title: "Fiscal Year Closing", url: pathFor(base, "fiscal-year-closing") },
    { title: "Reports", url: pathFor(base, "reports") },
  ];
}

export function getPinnedFinanceReports(base: FinanceBase): FinanceNavItem[] {
  return [
    { title: "Trial Balance", url: `${pathFor(base, "reports")}?report=trial-balance` },
    { title: "Profit & Loss", url: `${pathFor(base, "reports")}?report=profit-loss` },
    { title: "Balance Sheet", url: `${pathFor(base, "reports")}?report=balance-sheet` },
  ];
}

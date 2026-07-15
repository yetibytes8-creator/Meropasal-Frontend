import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { financeSummary, type FinanceSummary } from "@/lib/api";
import StatCard from "@/components/StatCard";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Landmark,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const thisMonth = new Date().toISOString().slice(0, 7);

const FinanceDashboard = () => {
  const location = useLocation();
  const [data, setData] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    financeSummary.get(thisMonth).then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <div><h1 className="page-header">Finance</h1><p className="page-description">Loading…</p></div>
      </div>
    );
  }

  const profitPositive = data.net_profit >= 0;
  const base = location.pathname.startsWith("/inventory")
    ? "/inventory"
    : location.pathname.startsWith("/restaurant")
      ? "/restaurant"
      : "/finance";
  const financeLink = (path: string) => base === "/finance" ? `/finance/${path}` : `${base}/${path}`;
  const accountantWorkflows = [
    {
      title: "Sales & Receipts",
      description: "Cash/bank debit, sales revenue credit, customer due track.",
      icon: ReceiptText,
      to: financeLink("transactions"),
      tag: "Income / Debtor",
    },
    {
      title: "Purchases & Supplier Payable",
      description: "Stock/expense debit, supplier liability or bank/cheque credit.",
      icon: PackageCheck,
      to: base === "/finance" ? "/finance/expenses" : `${base}/expenses`,
      tag: "Expense / Liability",
    },
    {
      title: "Cash, Bank & Cheque",
      description: "Bank deposit, cash counter, cheque number and transfer match.",
      icon: Banknote,
      to: financeLink("cash-banks"),
      tag: "Bank Recon",
    },
    {
      title: "Assets, Liability, Equity",
      description: "Owner capital, fixed asset, loan, opening balance and journals.",
      icon: Landmark,
      to: financeLink("chart-of-accounts"),
      tag: "COA",
    },
    {
      title: "Refunds & Returns",
      description: "Overpaid money, sales return, credit note and supplier return.",
      icon: RotateCcw,
      to: financeLink("accounts"),
      tag: "Credit Note",
    },
    {
      title: "VAT, TDS & Tax",
      description: "Tax rate setup, TDS payable/receivable and statutory reports.",
      icon: Scale,
      to: financeLink("tax-rates"),
      tag: "Tax",
    },
  ];
  const seniorAccountantFlow = [
    {
      step: "01",
      title: "Setup Chart of Accounts",
      description: "Create cash, bank, receivable, payable, stock, tax, capital, income and expense heads.",
      to: financeLink("chart-of-accounts"),
    },
    {
      step: "02",
      title: "Enter Opening Balance",
      description: "Bring previous cash, bank, stock, customer due, supplier due, loan and capital balances.",
      to: financeLink("opening-balance"),
    },
    {
      step: "03",
      title: "Record Daily Transactions",
      description: "Post sales, purchases, receipts, payments, refunds, salary, expenses and journals daily.",
      to: financeLink("transactions"),
    },
    {
      step: "04",
      title: "Match Cash, Bank and Cheque",
      description: "Verify counter cash, QR/card settlement, bank deposit, cheque clearing and transfers.",
      to: financeLink("cash-banks"),
    },
    {
      step: "05",
      title: "Review Tax and Compliance",
      description: "Check VAT/PAN, TDS payable or receivable, supplier bills and statutory reports.",
      to: financeLink("tax-rates"),
    },
    {
      step: "06",
      title: "Print Reports and Close Period",
      description: "Prepare day book, ledger, trial balance, P&L, balance sheet and fiscal closing file.",
      to: base === "/finance" ? "/finance/reports" : `${base}/finance-reports`,
    },
  ];
  const postingRules = [
    { transaction: "Cash / QR sale", debit: "Cash / Bank / Wallet", credit: "Sales Revenue + VAT Payable", module: "Sales Register", to: financeLink("sales-register") },
    { transaction: "Credit sale", debit: "Accounts Receivable", credit: "Sales Revenue + VAT Payable", module: "Invoices / Ledger", to: financeLink("invoices") },
    { transaction: "Purchase bill", debit: "Inventory / Purchase Expense + VAT Receivable", credit: "Supplier / Accounts Payable", module: "Purchase Register", to: financeLink("purchase-register") },
    { transaction: "Supplier payment", debit: "Accounts Payable", credit: "Cash / Bank / Cheque", module: "Payment In / Out", to: financeLink("accounts") },
    { transaction: "Customer receipt", debit: "Cash / Bank", credit: "Accounts Receivable", module: "Payment In / Out", to: financeLink("accounts") },
    { transaction: "Refund / return", debit: "Sales Return / Payable", credit: "Cash / Bank or Customer Ledger", module: "Refunds & Returns", to: financeLink("refunds-returns") },
    { transaction: "Salary and TDS", debit: "Salary Expense", credit: "Salary Payable + TDS Payable", module: "Payroll & Payables", to: financeLink("payroll-payables") },
    { transaction: "Owner capital / adjustment", debit: "Cash / Asset / Expense", credit: "Owner Capital / Liability", module: "Journal Voucher", to: financeLink("journal-voucher") },
  ];
  const accountantChecks = [
    "Every bill has customer/supplier name, PAN/VAT when required, payment mode and branch.",
    "Cash counter closing equals POS cash sales minus cash expenses and refunds.",
    "Bank/QR/card settlement is matched with statement and no duplicate receipt exists.",
    "Stock purchase updates inventory and supplier payable together.",
    "Customer due and supplier due reports match receivable/payable ledger.",
    "VAT, TDS and tax reports are reviewed before filing.",
    "Documents, cheque copy and supplier bills are attached before posting sensitive entries.",
    "Trial balance debit and credit totals are equal before P&L and Balance Sheet print.",
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Finance Dashboard</h1>
        <p className="page-description">
          {new Date().toLocaleString("default", { month: "long", year: "numeric" })} overview · {data.branch_name}
        </p>
      </div>

      <FinanceStatementHeader
        title="Finance Overview Statement"
        subtitle="Monthly income, expense, invoice, and net result overview"
        periodLabel={new Date().toLocaleString("default", { month: "long", year: "numeric" })}
        reportNo={`FIN-${thisMonth.replace("-", "")}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <StatCard
          title="Total Income"
          value={`Rs. ${data.income.toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="Total Expenses"
          value={`Rs. ${data.expenses.toLocaleString()}`}
          icon={<TrendingDown className="w-5 h-5" />}
          iconClassName="bg-destructive/10 text-destructive"
        />
        <StatCard
          title="Net Profit"
          value={`Rs. ${data.net_profit.toLocaleString()}`}
          icon={<Banknote className="w-5 h-5" />}
          iconClassName={profitPositive ? "bg-finance/10 text-finance" : "bg-destructive/10 text-destructive"}
          trend={data.net_profit !== 0 ? { value: Math.abs(Math.round((data.net_profit / (data.income || 1)) * 100)), positive: profitPositive } : undefined}
        />
        <StatCard
          title="Open Invoices"
          value={data.invoices_open + data.invoices_overdue}
          icon={<FileText className="w-5 h-5" />}
          iconClassName={data.invoices_overdue > 0 ? "bg-destructive/10 text-destructive" : "bg-finance/10 text-finance"}
        />
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="finance-accountant-workspace-copy">
              <CardTitle className="text-base">Accountant Workspace</CardTitle>
              <p className="finance-clean-copy mt-1 text-sm text-muted-foreground">
                Daily entry, account posting and report flow for the accountant.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                दैनिक entry गर्दा कुन transaction कुन account मा राख्ने भन्ने quick guide.
              </p>
            </div>
            <Badge variant="outline" className="w-fit bg-finance/10 text-finance border-finance/20">
              Double-entry ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {accountantWorkflows.map((workflow) => {
              const Icon = workflow.icon;
              return (
                <Link
                  key={workflow.title}
                  to={workflow.to}
                  className="group rounded-lg border bg-card p-4 transition-colors hover:border-finance/40 hover:bg-finance/5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-finance/10 text-finance">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground group-hover:text-finance">{workflow.title}</p>
                        <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">{workflow.tag}</Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-finance" />
                Senior Accountant Finance Flow
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Start here, then follow the steps in order for clean books and audit-ready reports.
              </p>
            </div>
            <Badge variant="outline" className="w-fit bg-success/10 text-success border-success/20">
              Audit ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-3">
            {seniorAccountantFlow.map((item, index) => (
              <Link
                key={item.step}
                to={item.to}
                className="group rounded-lg border bg-card p-4 transition-colors hover:border-finance/40 hover:bg-finance/5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-finance/10 text-sm font-bold text-finance">
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold group-hover:text-finance">{item.title}</p>
                      {index < seniorAccountantFlow.length - 1 && <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground xl:block" />}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-finance" />
            Posting Rules: Transaction Goes Where?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Use Module</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postingRules.map((rule) => (
                <TableRow key={rule.transaction}>
                  <TableCell className="font-medium">{rule.transaction}</TableCell>
                  <TableCell>{rule.debit}</TableCell>
                  <TableCell>{rule.credit}</TableCell>
                  <TableCell>
                    <Link to={rule.to} className="font-semibold text-finance hover:underline">
                      {rule.module}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Accountant Daily / Monthly Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {accountantChecks.map((check) => (
              <div key={check} className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-sm leading-6">{check}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice status row */}
      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-base">Overview Details</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount / Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Total Income</TableCell>
                <TableCell className="text-muted-foreground">Income recorded for selected month</TableCell>
                <TableCell className="text-right font-semibold text-success">Rs. {data.income.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total Expenses</TableCell>
                <TableCell className="text-muted-foreground">Expenses recorded for selected month</TableCell>
                <TableCell className="text-right font-semibold text-destructive">Rs. {data.expenses.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Paid Invoices</TableCell>
                <TableCell className="text-muted-foreground">Invoices marked paid</TableCell>
                <TableCell className="text-right font-semibold">{data.invoices_paid}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Open Invoices</TableCell>
                <TableCell className="text-muted-foreground">Pending invoices not yet collected</TableCell>
                <TableCell className="text-right font-semibold text-info">{data.invoices_open}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Overdue Invoices</TableCell>
                <TableCell className="text-muted-foreground">Invoices past due date</TableCell>
                <TableCell className="text-right font-semibold text-destructive">{data.invoices_overdue}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Net Profit / Loss</TableCell>
                <TableCell className={`text-right ${profitPositive ? "text-success" : "text-destructive"}`}>
                  Rs. {data.net_profit.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Branch Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No branch records yet</TableCell>
                </TableRow>
              ) : data.branches.map((branch) => (
                <TableRow key={branch.branch_id}>
                  <TableCell className="font-semibold">{branch.branch_name}</TableCell>
                  <TableCell className="text-right text-success">Rs. {branch.income.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">Rs. {branch.expenses.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-semibold ${branch.net_profit >= 0 ? "text-success" : "text-destructive"}`}>
                    Rs. {branch.net_profit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{branch.orders_count}</TableCell>
                  <TableCell className="text-right">{branch.sales_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 6-month chart */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Income vs Expenses — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.monthly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(245,58%,51%)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="hsl(245,58%,51%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0,72%,51%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(0,72%,51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="income" name="Income" stroke="hsl(245,58%,51%)" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(0,72%,51%)" fill="url(#expGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit margin card */}
      <Card className={`print:hidden border-l-4 ${profitPositive ? "border-l-success" : "border-l-destructive"}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Profit Margin</p>
            <p className="text-xs text-muted-foreground">Net profit as % of income</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${profitPositive ? "text-success" : "text-destructive"}`}>
              {data.income > 0 ? `${Math.round((data.net_profit / data.income) * 100)}%` : "—"}
            </p>
            <Badge variant="outline" className={profitPositive ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
              {profitPositive ? "Profitable" : "Loss"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden print:block">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Monthly Finance Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.N.</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount / Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>1</TableCell>
                <TableCell className="font-semibold">Total Income</TableCell>
                <TableCell>Income recorded for the selected month</TableCell>
                <TableCell className="text-right font-semibold">Rs. {data.income.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2</TableCell>
                <TableCell className="font-semibold">Total Expenses</TableCell>
                <TableCell>Expenses recorded for the selected month</TableCell>
                <TableCell className="text-right font-semibold">Rs. {data.expenses.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>3</TableCell>
                <TableCell className="font-semibold">Paid Invoices</TableCell>
                <TableCell>Invoices marked as paid</TableCell>
                <TableCell className="text-right font-semibold">{data.invoices_paid}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>4</TableCell>
                <TableCell className="font-semibold">Open Invoices</TableCell>
                <TableCell>Pending invoices not yet collected</TableCell>
                <TableCell className="text-right font-semibold">{data.invoices_open}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>5</TableCell>
                <TableCell className="font-semibold">Overdue Invoices</TableCell>
                <TableCell>Invoices past due date</TableCell>
                <TableCell className="text-right font-semibold">{data.invoices_overdue}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Net Profit / Loss</TableCell>
                <TableCell className="text-right">Rs. {data.net_profit.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>Profit Margin</TableCell>
                <TableCell className="text-right">{data.income > 0 ? `${Math.round((data.net_profit / data.income) * 100)}%` : "N/A"}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card className="hidden print:block">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Last 6 Months Trend</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthly.map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="font-semibold">{month.month}</TableCell>
                  <TableCell className="text-right">Rs. {month.income.toLocaleString()}</TableCell>
                  <TableCell className="text-right">Rs. {month.expenses.toLocaleString()}</TableCell>
                  <TableCell className="text-right">Rs. {(month.income - month.expenses).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="hidden break-inside-avoid border px-4 py-3 text-[10px] text-slate-700 print:block">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="font-semibold text-slate-900">Prepared By</p>
            <p className="mt-8 border-t pt-1">Name / Signature</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Checked By</p>
            <p className="mt-8 border-t pt-1">Name / Signature</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Authorized By</p>
            <p className="mt-8 border-t pt-1">Name / Signature</p>
          </div>
        </div>
        <p className="mt-3 text-center">Finance statement prepared from business accounting records. Verify entries before tax filing or audit submission.</p>
      </div>
    </div>
  );
};

export default FinanceDashboard;

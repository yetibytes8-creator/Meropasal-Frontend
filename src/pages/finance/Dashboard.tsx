import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { financeSummary, type FinanceSummary } from "@/lib/api";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowRight,
  Banknote,
  BookOpenCheck,
  ClipboardList,
  FileText,
  Landmark,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

const thisMonth = new Date().toISOString().slice(0, 7);

function money(value: number) {
  return `Rs. ${Math.abs(value).toLocaleString()}`;
}

const FinanceDashboard = () => {
  const location = useLocation();
  const [data, setData] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    financeSummary.get(thisMonth).then(setData).catch(console.error);
  }, []);

  const base = location.pathname.startsWith("/inventory")
    ? "/inventory"
    : location.pathname.startsWith("/restaurant")
      ? "/restaurant"
      : "/finance";
  const financeLink = (path: string) => (base === "/finance" ? `/finance/${path}` : `${base}/${path}`);
  const reportsLink = base === "/finance" ? "/finance/reports" : `${base}/finance-reports`;

  if (!data) {
    return (
      <div className="finance-page space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
        <div>
          <h1 className="page-header">Finance</h1>
          <p className="page-description">Loading finance summary...</p>
        </div>
      </div>
    );
  }

  const profitPositive = data.net_profit >= 0;
  const kpis = [
    { label: "This Month Income", value: money(data.income), icon: TrendingUp, tone: "border-green-100 bg-green-50 text-green-700", note: "Sales, receipts and income" },
    { label: "This Month Expense", value: money(data.expenses), icon: TrendingDown, tone: "border-red-100 bg-red-50 text-red-700", note: "Bills, salary and costs" },
    { label: profitPositive ? "Net Profit" : "Net Loss", value: money(data.net_profit), icon: Banknote, tone: profitPositive ? "border-green-100 bg-green-50 text-green-700" : "border-red-100 bg-red-50 text-red-700", note: "Income minus expense" },
    { label: "Open / Overdue Bills", value: `${data.invoices_open}/${data.invoices_overdue}`, icon: FileText, tone: data.invoices_overdue > 0 ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700", note: "To collect or follow up" },
  ];

  const primaryActions = [
    {
      title: "Receive Money",
      helper: "Customer payment, cash sale, bank/QR receipt",
      to: financeLink("accounts"),
      icon: WalletCards,
      tone: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      title: "Pay Money",
      helper: "Supplier payment, expense, salary, cheque",
      to: financeLink("accounts"),
      icon: Banknote,
      tone: "bg-red-600 text-white hover:bg-red-700",
    },
    {
      title: "Daily Ledger",
      helper: "Aaja ko sale, purchase, receipt, payment",
      to: financeLink("day-book"),
      icon: ClipboardList,
      tone: "bg-slate-900 text-white hover:bg-slate-800",
    },
    {
      title: "Print Reports",
      helper: "Trial balance, P&L, balance sheet",
      to: reportsLink,
      icon: FileText,
      tone: "bg-green-50 text-green-800 hover:bg-green-100",
    },
  ];

  const guidedFlow = [
    { step: "1", title: "Setup", text: "Chart of accounts, opening balance, cash/bank and tax rates.", to: financeLink("chart-of-accounts"), icon: Settings },
    { step: "2", title: "Daily Entry", text: "Sales, purchases, receipts, payments, refunds and expenses.", to: financeLink("transactions"), icon: ReceiptText },
    { step: "3", title: "Check Money", text: "Cash counter, bank, QR/card settlement, cheque and transfer match.", to: financeLink("cash-banks"), icon: Landmark },
    { step: "4", title: "Review & Print", text: "Ledger, day book, trial balance, P&L, balance sheet and audit trail.", to: reportsLink, icon: ShieldCheck },
  ];

  const workAreas = [
    {
      title: "Daily Work",
      description: "Cashier/accountant le daily use garne pages.",
      items: [
        { label: "Day Book", to: financeLink("day-book") },
        { label: "Transactions", to: financeLink("transactions") },
        { label: "Income", to: financeLink("income") },
        { label: "Payment In / Out", to: financeLink("accounts") },
        { label: "Refunds & Returns", to: financeLink("refunds-returns") },
      ],
    },
    {
      title: "Accounting Setup",
      description: "Software live garnu agadi accountant le milaucha.",
      items: [
        { label: "Chart of Accounts", to: financeLink("chart-of-accounts") },
        { label: "Opening Balance", to: financeLink("opening-balance") },
        { label: "Journal Voucher", to: financeLink("journal-voucher") },
        { label: "Customer/Supplier Ledger", to: financeLink("customer-supplier-ledger") },
        { label: "Tax & Rates", to: financeLink("tax-rates") },
      ],
    },
    {
      title: "Audit & Control",
      description: "Owner/manager le verify garne area.",
      items: [
        { label: "Cash & Banks", to: financeLink("cash-banks") },
        { label: "Bank Reconciliation", to: financeLink("bank-reconciliation") },
        { label: "Approval Workflow", to: financeLink("approval-workflow") },
        { label: "Document Attachments", to: financeLink("document-attachments") },
        { label: "Report Settings", to: financeLink("settings") },
      ],
    },
  ];

  const postingRules = [
    { transaction: "Cash / QR Sale", debit: "Cash / Bank", credit: "Sales Revenue + VAT Payable", module: "Sales Register", to: financeLink("sales-register") },
    { transaction: "Credit Sale", debit: "Customer Receivable", credit: "Sales Revenue", module: "Customer Ledger", to: financeLink("customer-supplier-ledger") },
    { transaction: "Purchase Bill", debit: "Inventory / Expense", credit: "Supplier Payable / Bank", module: "Purchase Register", to: financeLink("purchase-register") },
    { transaction: "Supplier Payment", debit: "Supplier Payable", credit: "Cash / Bank / Cheque", module: "Payment In / Out", to: financeLink("accounts") },
    { transaction: "Refund / Return", debit: "Sales Return", credit: "Cash / Bank / Customer Ledger", module: "Refunds & Returns", to: financeLink("refunds-returns") },
  ];

  return (
    <div className="finance-page space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <section className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm print:hidden">
        <div className="h-1 bg-gradient-to-r from-green-600 via-green-500 to-red-500" />
        <div className="p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-3 border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
                Simple finance flow
              </Badge>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Finance module, easy way
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Paisa aayo, paisa gayo, bank ma milayo, report print garyo. Finance ko main flow yahi ho. Detail accounting pages tala grouped cha.
              </p>
            </div>
            <Button asChild className="h-11 rounded-xl bg-green-600 text-white hover:bg-green-700">
              <Link to={financeLink("transactions")}>
                Open Ledger <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-2xl border bg-slate-50/70 p-4">
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${kpi.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{kpi.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{kpi.note}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {primaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} to={action.to} className={`rounded-2xl p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${action.tone}`}>
                  <Icon className="h-5 w-5" />
                  <p className="mt-3 text-base font-black">{action.title}</p>
                  <p className="mt-1 text-sm opacity-80">{action.helper}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="hidden print:block">
        <h1 className="page-header">Finance Dashboard</h1>
        <p className="page-description">{new Date().toLocaleString("default", { month: "long", year: "numeric" })} overview</p>
      </div>

      <FinanceStatementHeader
        title="Finance Overview Statement"
        subtitle="Monthly income, expense, invoice, and net result overview"
        periodLabel={new Date().toLocaleString("default", { month: "long", year: "numeric" })}
        reportNo={`FIN-${thisMonth.replace("-", "")}`}
      />

      <Card className="border-green-100 shadow-sm print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Use Finance In 4 Steps</CardTitle>
          <p className="text-sm text-muted-foreground">New staff lai confuse nahune clear process.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-4">
            {guidedFlow.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.step} to={item.to} className="group rounded-2xl border bg-white p-4 transition-colors hover:border-green-200 hover:bg-green-50/60">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-sm font-black text-white">{item.step}</span>
                    <Icon className="h-5 w-5 text-green-700" />
                  </div>
                  <p className="mt-4 font-black text-slate-950 group-hover:text-green-800">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3 print:hidden">
        {workAreas.map((area) => (
          <Card key={area.title} className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{area.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{area.description}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {area.items.map((item) => (
                <Button key={item.label} asChild variant="outline" className="h-11 w-full justify-between rounded-xl border-slate-200 bg-white text-slate-800 hover:border-green-200 hover:bg-green-50 hover:text-green-800">
                  <Link to={item.to}>
                    <span>{item.label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="h-4 w-4 text-green-700" />
            Which Transaction Goes Where?
          </CardTitle>
          <p className="text-sm text-muted-foreground">Accountant ko quick guide. Daily entry garda yo table follow garna milcha.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Open Page</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postingRules.map((rule) => (
                <TableRow key={rule.transaction}>
                  <TableCell className="font-semibold">{rule.transaction}</TableCell>
                  <TableCell>{rule.debit}</TableCell>
                  <TableCell>{rule.credit}</TableCell>
                  <TableCell>
                    <Link to={rule.to} className="font-semibold text-green-700 hover:underline">
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
          <CardTitle className="text-base">Overview Details - Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead>Meaning</TableHead>
                <TableHead className="text-right">Amount / Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Total Income</TableCell>
                <TableCell className="text-muted-foreground">Income recorded for selected month</TableCell>
                <TableCell className="text-right font-semibold text-green-700">{money(data.income)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Total Expenses</TableCell>
                <TableCell className="text-muted-foreground">Expenses recorded for selected month</TableCell>
                <TableCell className="text-right font-semibold text-red-700">{money(data.expenses)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Open Invoices</TableCell>
                <TableCell className="text-muted-foreground">Pending invoices not yet collected</TableCell>
                <TableCell className="text-right font-semibold">{data.invoices_open}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Overdue Invoices</TableCell>
                <TableCell className="text-muted-foreground">Invoices past due date</TableCell>
                <TableCell className="text-right font-semibold text-red-700">{data.invoices_overdue}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Net Profit / Loss</TableCell>
                <TableCell className={`text-right ${profitPositive ? "text-green-700" : "text-red-700"}`}>
                  Rs. {data.net_profit.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
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
                <TableHead>Particulars</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount / Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Total Income</TableCell>
                <TableCell>Income recorded for the selected month</TableCell>
                <TableCell className="text-right font-semibold">Rs. {data.income.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Total Expenses</TableCell>
                <TableCell>Expenses recorded for the selected month</TableCell>
                <TableCell className="text-right font-semibold">Rs. {data.expenses.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Open Invoices</TableCell>
                <TableCell>Pending invoices not yet collected</TableCell>
                <TableCell className="text-right font-semibold">{data.invoices_open}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Overdue Invoices</TableCell>
                <TableCell>Invoices past due date</TableCell>
                <TableCell className="text-right font-semibold">{data.invoices_overdue}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Net Profit / Loss</TableCell>
                <TableCell className="text-right">Rs. {data.net_profit.toLocaleString()}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="hidden break-inside-avoid border px-4 py-3 text-[10px] text-slate-700 print:block">
        <div className="grid grid-cols-3 gap-6">
          {["Prepared By", "Checked By", "Authorized By"].map((label) => (
            <div key={label}>
              <p className="font-semibold text-slate-900">{label}</p>
              <p className="mt-8 border-t pt-1">Name / Signature</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center">Finance statement prepared from business accounting records. Verify entries before tax filing or audit submission.</p>
      </div>
    </div>
  );
};

export default FinanceDashboard;

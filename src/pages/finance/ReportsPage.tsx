import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { income as incomeApi, expenses as expensesApi, type ApiIncome } from "@/lib/api";
import { fromApiExpense } from "@/lib/transforms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Banknote, BarChart3, Scale, WalletCards } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { downloadCsv } from "@/lib/csv";
import type { Expense } from "@/types";

type ReportType = "trial-balance" | "profit-loss" | "balance-sheet";

interface MonthData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EXPENSE_COLORS: Record<string, string> = {
  rent: "#3b82f6",
  utilities: "#eab308",
  supplies: "#22c55e",
  marketing: "#a855f7",
  maintenance: "#f97316",
  salary: "#ef4444",
  other: "#94a3b8",
};

const now = new Date();

function money(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function sectionTitle(text: string) {
  return (
    <TableRow className="bg-muted/40 font-semibold">
      <TableCell colSpan={4}>{text}</TableCell>
    </TableRow>
  );
}

export default function FinanceReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeReport = ((searchParams.get("report") || "profit-loss") as ReportType);
  const report: ReportType = ["trial-balance", "profit-loss", "balance-sheet"].includes(activeReport) ? activeReport : "profit-loss";
  const [year, setYear] = useState(String(now.getFullYear()));
  const [allIncome, setAllIncome] = useState<ApiIncome[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    Promise.all([incomeApi.list(), expensesApi.list()])
      .then(([inc, exp]) => {
        setAllIncome(inc);
        setAllExpenses(exp.map(fromApiExpense));
      })
      .catch(console.error);
  }, []);

  const monthlyData: MonthData[] = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const income = allIncome.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + Number(e.amount), 0);
    const expenses = allExpenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
    return { month: MONTHS[i], income, expenses, profit: income - expenses };
  }), [allExpenses, allIncome, year]);

  const yearIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const yearExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const yearProfit = yearIncome - yearExpenses;
  const margin = yearIncome > 0 ? Math.round((yearProfit / yearIncome) * 100) : 0;

  const expenseByCategory = allExpenses
    .filter((e) => e.date.startsWith(year))
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

  const expensePieData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  const incomeByCategory = allIncome
    .filter((e) => e.date.startsWith(year))
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {});

  const quarters = [
    { label: "Q1", months: [0, 1, 2] },
    { label: "Q2", months: [3, 4, 5] },
    { label: "Q3", months: [6, 7, 8] },
    { label: "Q4", months: [9, 10, 11] },
  ].map((q) => {
    const inc = q.months.reduce((s, i) => s + monthlyData[i].income, 0);
    const exp = q.months.reduce((s, i) => s + monthlyData[i].expenses, 0);
    return { label: q.label, income: inc, expenses: exp, profit: inc - exp };
  });

  const availableYears = Array.from(
    new Set([
      ...allIncome.map((e) => e.date.slice(0, 4)),
      ...allExpenses.map((e) => e.date.slice(0, 4)),
      String(now.getFullYear()),
    ])
  ).sort().reverse();

  const trialBalanceRows = [
    { account: "Cash / Bank Closing Balance", group: "Asset", debit: Math.max(yearProfit, 0), credit: 0 },
    { account: "Operating Expenses", group: "Expense", debit: yearExpenses, credit: 0 },
    { account: "Sales / Service Revenue", group: "Income", debit: 0, credit: yearIncome },
    { account: "Owner Capital / Payable Adjustment", group: "Equity / Liability", debit: 0, credit: Math.max(-yearProfit, 0) },
  ].filter((row) => row.debit > 0 || row.credit > 0 || row.account.includes("Closing"));
  const trialDebit = trialBalanceRows.reduce((sum, row) => sum + row.debit, 0);
  const trialCredit = trialBalanceRows.reduce((sum, row) => sum + row.credit, 0);

  const balanceSheet = {
    assets: [
      { item: "Cash and Bank", amount: Math.max(yearProfit, 0) },
      { item: "Accounts Receivable", amount: 0 },
      { item: "Inventory / Stock", amount: 0 },
      { item: "Fixed Assets", amount: 0 },
    ],
    liabilities: [
      { item: "Accounts Payable", amount: Math.max(-yearProfit, 0) },
      { item: "Tax / TDS Payable", amount: 0 },
      { item: "Loan Payable", amount: 0 },
    ],
    equity: [
      { item: "Owner Capital", amount: 0 },
      { item: "Retained Earnings", amount: Math.max(yearProfit, 0) },
    ],
  };
  const totalAssets = balanceSheet.assets.reduce((sum, row) => sum + row.amount, 0);
  const totalLiabilities = balanceSheet.liabilities.reduce((sum, row) => sum + row.amount, 0);
  const totalEquity = balanceSheet.equity.reduce((sum, row) => sum + row.amount, 0);

  const reportMeta: Record<ReportType, { title: string; subtitle: string; reportNo: string }> = {
    "trial-balance": {
      title: "Trial Balance Statement",
      subtitle: "Debit and credit account balance prepared from recorded transactions",
      reportNo: `TB-${year}`,
    },
    "profit-loss": {
      title: "Profit & Loss Statement",
      subtitle: "Income, expense, and net result prepared from recorded transactions",
      reportNo: `PL-${year}`,
    },
    "balance-sheet": {
      title: "Balance Sheet Statement",
      subtitle: "Assets, liabilities, and equity position from current records",
      reportNo: `BS-${year}`,
    },
  };

  const exportStatement = () => {
    if (report === "trial-balance") {
      downloadCsv(`trial-balance-${year}.csv`, [
        ["Account", "Group", "Debit", "Credit"],
        ...trialBalanceRows.map((row) => [row.account, row.group, row.debit, row.credit]),
        ["Total", "", trialDebit, trialCredit],
      ]);
      return;
    }

    if (report === "balance-sheet") {
      downloadCsv(`balance-sheet-${year}.csv`, [
        ["Section", "Particulars", "Amount"],
        ...balanceSheet.assets.map((row) => ["Assets", row.item, row.amount]),
        ["Assets", "Total Assets", totalAssets],
        ...balanceSheet.liabilities.map((row) => ["Liabilities", row.item, row.amount]),
        ["Liabilities", "Total Liabilities", totalLiabilities],
        ...balanceSheet.equity.map((row) => ["Equity", row.item, row.amount]),
        ["Equity", "Total Equity", totalEquity],
        ["Check", "Liabilities + Equity", totalLiabilities + totalEquity],
      ]);
      return;
    }

    downloadCsv(`profit-loss-${year}.csv`, [
      ["Section", "Account", "Amount"],
      ...Object.entries(incomeByCategory).map(([category, amount]) => ["Income", category, amount]),
      ["Income", "Total Income", yearIncome],
      ...expensePieData.map((item) => ["Expense", item.name, item.value]),
      ["Expense", "Total Expenses", yearExpenses],
      ["Result", "Net Profit / Loss", yearProfit],
      ["Result", "Profit Margin %", margin],
    ]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-header">Financial Reports</h1>
          <p className="page-description">Trial balance, profit & loss, balance sheet, and quarterly analysis</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 print:hidden">
        {[
          { value: "trial-balance" as ReportType, label: "Trial Balance", icon: Scale },
          { value: "profit-loss" as ReportType, label: "Profit & Loss", icon: BarChart3 },
          { value: "balance-sheet" as ReportType, label: "Balance Sheet", icon: WalletCards },
        ].map((item) => {
          const Icon = item.icon;
          const active = report === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setSearchParams({ report: item.value })}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                active ? "border-finance/40 bg-finance/10 text-finance" : "bg-card hover:bg-muted/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>

      <FinanceStatementHeader
        title={reportMeta[report].title}
        subtitle={reportMeta[report].subtitle}
        periodLabel={`Year ${year}`}
        reportNo={reportMeta[report].reportNo}
        onExport={exportStatement}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {[
          { label: "Total Income", value: yearIncome, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Total Expenses", value: yearExpenses, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Net Profit", value: yearProfit, icon: Banknote, color: yearProfit >= 0 ? "text-finance" : "text-destructive", bg: yearProfit >= 0 ? "bg-finance/10" : "bg-destructive/10" },
          { label: "Profit Margin", value: `${margin}%`, icon: BarChart3, color: margin >= 0 ? "text-finance" : "text-destructive", bg: "bg-muted" },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <p className={`text-xl font-bold mt-1 ${kpi.color}`}>
                  {typeof kpi.value === "number" ? money(kpi.value) : kpi.value}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {report === "trial-balance" && (
        <Card data-print-keep>
          <CardHeader><CardTitle className="text-base">Trial Balance - {year}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalanceRows.map((row) => (
                  <TableRow key={row.account}>
                    <TableCell className="font-medium">{row.account}</TableCell>
                    <TableCell>{row.group}</TableCell>
                    <TableCell className="text-right">{row.debit ? money(row.debit) : "-"}</TableCell>
                    <TableCell className="text-right">{row.credit ? money(row.credit) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{money(trialDebit)}</TableCell>
                  <TableCell className="text-right">{money(trialCredit)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {report === "profit-loss" && (
        <>
          <Card className="print:hidden">
            <CardHeader><CardTitle className="text-base">Monthly Profit & Loss - {year}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="income" name="Income" fill="hsl(142,55%,42%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
            <Card>
              <CardHeader><CardTitle className="text-base">Quarterly Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {quarters.map((q) => (
                  <div key={q.label} className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{q.label} {year}</span>
                      <Badge variant="outline" className={q.profit >= 0 ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                        {q.profit >= 0 ? "+" : ""}{money(q.profit)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Income: <strong className="text-success">{money(q.income)}</strong></span>
                      <span>Expenses: <strong className="text-destructive">{money(q.expenses)}</strong></span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Expenses by Category</CardTitle></CardHeader>
              <CardContent>
                {expensePieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded for {year}</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                          {expensePieData.map((entry, i) => (
                            <Cell key={i} fill={EXPENSE_COLORS[entry.name.toLowerCase()] || "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => money(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {expensePieData.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: EXPENSE_COLORS[item.name.toLowerCase()] || "#94a3b8" }} />
                          <span className="text-muted-foreground truncate">{item.name}</span>
                          <span className="font-medium ml-auto">{money(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-print-keep>
            <CardHeader><CardTitle className="text-base">Profit & Loss Statement - {year}</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/40 font-semibold"><TableCell colSpan={3}>Income</TableCell></TableRow>
                  {Object.entries(incomeByCategory).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-muted-foreground">No income recorded</TableCell></TableRow>
                  ) : Object.entries(incomeByCategory).map(([cat, amt]) => (
                    <TableRow key={cat}>
                      <TableCell>Income</TableCell>
                      <TableCell className="capitalize">{cat.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right">{money(amt)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-success/5 font-semibold">
                    <TableCell colSpan={2}>Total Income</TableCell>
                    <TableCell className="text-right text-success">{money(yearIncome)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/40 font-semibold"><TableCell colSpan={3}>Expenses</TableCell></TableRow>
                  {expensePieData.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-muted-foreground">No expenses recorded</TableCell></TableRow>
                  ) : expensePieData.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell>Expense</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{money(item.value)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-destructive/5 font-semibold">
                    <TableCell colSpan={2}>Total Expenses</TableCell>
                    <TableCell className="text-right text-destructive">{money(yearExpenses)}</TableCell>
                  </TableRow>
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Net Profit / Loss</TableCell>
                    <TableCell className={`text-right ${yearProfit >= 0 ? "text-success" : "text-destructive"}`}>
                      {yearProfit >= 0 ? "+" : ""}{money(yearProfit)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {report === "balance-sheet" && (
        <Card data-print-keep>
          <CardHeader><CardTitle className="text-base">Balance Sheet - {year}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionTitle("Assets")}
                {balanceSheet.assets.map((row) => (
                  <TableRow key={row.item}>
                    <TableCell>Assets</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell className="text-right">{money(row.amount)}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                <TableRow className="bg-success/5 font-semibold">
                  <TableCell colSpan={3}>Total Assets</TableCell>
                  <TableCell className="text-right">{money(totalAssets)}</TableCell>
                </TableRow>
                {sectionTitle("Liabilities")}
                {balanceSheet.liabilities.map((row) => (
                  <TableRow key={row.item}>
                    <TableCell>Liabilities</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell className="text-right">{money(row.amount)}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                {sectionTitle("Equity")}
                {balanceSheet.equity.map((row) => (
                  <TableRow key={row.item}>
                    <TableCell>Equity</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell className="text-right">{money(row.amount)}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total Liabilities + Equity</TableCell>
                  <TableCell className="text-right">{money(totalLiabilities + totalEquity)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

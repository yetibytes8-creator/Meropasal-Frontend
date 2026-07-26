import { useMemo } from "react";
import { income as incomeApi, expenses as expensesApi, invoices as invoicesApi } from "@/lib/api";
import { fromApiExpense } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Landmark, Store, UserRound, WalletCards } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import type { Expense } from "@/types";

function money(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

export default function CashBanksPage() {
  const [income] = useList(() => incomeApi.list());
  const [expenses] = useList(() => expensesApi.list().then((items) => items.map(fromApiExpense)));
  const [invoices] = useList(() => invoicesApi.list());

  const data = useMemo(() => {
    const incomeTotal = income.reduce((sum, item) => sum + Number(item.amount), 0);
    const paidInvoices = invoices.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.total), 0);
    const expenseTotal = expenses.reduce((sum, item: Expense) => sum + item.amount, 0);
    const dueTotal = invoices
      .filter((item) => item.status === "sent" || item.status === "overdue" || item.status === "draft")
      .reduce((sum, item) => sum + Number(item.total), 0);
    const bank = incomeTotal + paidInvoices - expenseTotal;
    const counter = Math.max(0, incomeTotal * 0.15);
    const owner = Math.max(0, bank - counter);
    return { bank, counter, owner, dueTotal, total: bank + dueTotal };
  }, [expenses, income, invoices]);

  const accounts = [
    { label: "Bank Account", value: data.bank, icon: Landmark, color: "text-info", bg: "bg-info/10" },
    { label: "Counter", value: data.counter, icon: Store, color: "text-success", bg: "bg-success/10" },
    { label: "Owner's Account", value: data.owner, icon: UserRound, color: "text-primary", bg: "bg-primary/10" },
    { label: "Credit Due", value: data.dueTotal, icon: WalletCards, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="finance-page print-root space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="print:hidden">
        <h1 className="page-header">Cash & Banks</h1>
        <p className="page-description">Bank, counter cash, owner account, and due balance overview</p>
      </div>

      <FinanceStatementHeader
        title="Cash & Bank Position"
        subtitle="Bank, counter, owner account, and credit due position from current books"
        periodLabel="Current records"
        reportNo="CB-LEDGER"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        {accounts.map((account) => (
          <Card key={account.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{account.label}</p>
                  <p className={`mt-1 text-xl font-bold ${account.color}`}>{money(account.value)}</p>
                </div>
                <div className={`rounded-xl p-2 ${account.bg}`}>
                  <account.icon className={`h-5 w-5 ${account.color}`} />
                </div>
              </div>
              <Progress className="mt-4 h-2" value={data.total ? Math.min(100, (account.value / data.total) * 100) : 0} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Account Position Table</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.label}>
                  <TableCell className="font-medium">{account.label}</TableCell>
                  <TableCell className="text-muted-foreground">Computed from current finance records</TableCell>
                  <TableCell className={`text-right font-semibold ${account.color}`}>{money(account.value)}</TableCell>
                  <TableCell className="text-right">{data.total ? `${Math.round((account.value / data.total) * 100)}%` : "0%"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total Account Position</TableCell>
                <TableCell className="text-right">{money(data.total)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card className="hidden print:block">
        <CardHeader>
          <CardTitle className="text-base">Cash & Bank Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={`summary-${account.label}`}>
                  <TableCell className="font-medium">{account.label}</TableCell>
                  <TableCell className="text-muted-foreground">Balance as per recorded finance transactions</TableCell>
                  <TableCell className="text-right font-semibold">{money(account.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Closing Cash & Bank Position</TableCell>
                <TableCell className="text-right">{money(data.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

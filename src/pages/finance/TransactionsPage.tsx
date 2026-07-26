import { useState, useEffect } from "react";
import {
  accountingEntries,
  chartAccounts,
  income as incomeApi,
  expenses as expensesApi,
  type ApiAccountingEntry,
  type ApiChartAccount,
  type ApiIncome,
} from "@/lib/api";
import { fromApiExpense } from "@/lib/transforms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, TrendingUp, TrendingDown, Search, Plus, Save } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import StatCard from "@/components/StatCard";
import { downloadCsv } from "@/lib/csv";
import type { Expense } from "@/types";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: string;
  reference?: string;
  accountName?: string;
  accountType?: string;
  paymentMode?: string;
  bankName?: string;
  chequeNumber?: string;
  partyName?: string;
}

const today = new Date().toISOString().slice(0, 10);

const entryToTransaction = (entry: ApiAccountingEntry): Transaction => ({
  id: `acc-${entry.id}`,
  type: entry.debit > 0 ? "income" : "expense",
  category: entry.account_type,
  description: entry.description,
  amount: Number(entry.debit || entry.credit),
  date: entry.date,
  reference: entry.reference_number,
  accountName: `${entry.account_code} - ${entry.account_name}`,
  accountType: entry.account_type,
  paymentMode: entry.payment_mode,
  bankName: entry.bank_name,
  chequeNumber: entry.cheque_number,
  partyName: entry.party_name,
});

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [accounts, setAccounts] = useState<ApiChartAccount[]>([]);
  const [entryForm, setEntryForm] = useState({
    date: today,
    entry_type: "receipt" as ApiAccountingEntry["entry_type"],
    account_id: "",
    direction: "debit" as "debit" | "credit",
    amount: "",
    payment_mode: "cash" as ApiAccountingEntry["payment_mode"],
    bank_name: "",
    cheque_number: "",
    reference_number: "",
    party_name: "",
    description: "",
  });

  const loadTransactions = () => {
    Promise.all([incomeApi.list(), expensesApi.list(), accountingEntries.list(), chartAccounts.list()])
      .then(([inc, exp, entries, accountList]) => {
        setAccounts(accountList.filter((account) => account.is_active));
        const incTx: Transaction[] = inc.map((i: ApiIncome) => ({
          id: `inc-${i.id}`, type: "income" as const,
          category: i.category, description: i.description,
          amount: Number(i.amount), date: i.date, reference: i.reference,
          accountName: "4000 - Sales Revenue", accountType: "income",
        }));
        const expTx: Transaction[] = exp.map(fromApiExpense).map((e: Expense) => ({
          id: `exp-${e.id}`, type: "expense" as const,
          category: e.category, description: e.description,
          amount: e.amount, date: e.date,
          accountName: "5000 - Operating Expenses", accountType: "expense", paymentMode: e.paidBy,
        }));
        setTransactions([...entries.map(entryToTransaction), ...incTx, ...expTx].sort((a, b) => b.date.localeCompare(a.date)));
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.accountName || "").toLowerCase().includes(q) ||
      (t.bankName || "").toLowerCase().includes(q) ||
      (t.partyName || "").toLowerCase().includes(q) ||
      (t.reference || "").toLowerCase().includes(q);
    const matchType = filterType === "all" || t.type === filterType;
    const matchMonth = !filterMonth || t.date.startsWith(filterMonth);
    return matchSearch && matchType && matchMonth;
  });

  const saveAccountingEntry = async () => {
    const amount = Number(entryForm.amount);
    if (!entryForm.account_id || !entryForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Account, description, and valid amount are required");
      return;
    }

    try {
      await accountingEntries.create({
        date: entryForm.date,
        entry_type: entryForm.entry_type,
        account_id: Number(entryForm.account_id),
        debit: entryForm.direction === "debit" ? amount : 0,
        credit: entryForm.direction === "credit" ? amount : 0,
        payment_mode: entryForm.payment_mode,
        bank_name: entryForm.bank_name,
        cheque_number: entryForm.cheque_number,
        reference_number: entryForm.reference_number,
        party_name: entryForm.party_name,
        description: entryForm.description,
      });
      setEntryForm((form) => ({
        ...form,
        amount: "",
        bank_name: "",
        cheque_number: "",
        reference_number: "",
        party_name: "",
        description: "",
      }));
      toast.success("Accounting entry saved");
      loadTransactions();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  let runningBalance = 0;
  const printRows = [...filtered]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t, index) => {
      runningBalance += t.type === "income" ? t.amount : -t.amount;
      return { ...t, index: index + 1, balance: runningBalance };
    });

  const exportTransactions = () => {
    downloadCsv(`transactions-${filterMonth || "all"}.csv`, [
      ["Date", "Type", "Account", "Description", "Category", "Party", "Payment", "Bank", "Cheque", "Reference", "Amount"],
      ...filtered.map((t) => [
        t.date, t.type, t.accountName ?? "", t.description, t.category, t.partyName ?? "",
        t.paymentMode ?? "", t.bankName ?? "", t.chequeNumber ?? "", t.reference ?? "", t.amount,
      ]),
      ["", "", "", "", "Total Income", totalIncome],
      ["", "", "", "", "Total Expenses", totalExpenses],
      ["", "", "", "", "Net", totalIncome - totalExpenses],
    ]);
  };

  return (
    <div className="finance-page print-root space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0 print:space-y-2 print:pb-0">
      <div>
        <h1 className="page-header">Transactions</h1>
        <p className="page-description">Complete ledger of all income and expenses</p>
      </div>

      <FinanceStatementHeader
        title="Transaction Ledger"
        subtitle="Chronological income and expense register for audit review"
        periodLabel={filterMonth ? `Month ${filterMonth}` : "All periods"}
        reportNo={`TX-${filterMonth ? filterMonth.replace("-", "") : "ALL"}`}
        onExport={exportTransactions}
      />

      <Card className="print:hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">New Accounting Entry</p>
              <p className="text-xs text-muted-foreground">Record receipt, payment, cheque, bank transfer, purchase, refund, asset, liability, equity, income or expense lines</p>
            </div>
            <Badge variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Manual</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Entry Type</Label>
              <Select value={entryForm.entry_type} onValueChange={(value: ApiAccountingEntry["entry_type"]) => setEntryForm((f) => ({ ...f, entry_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["receipt", "payment", "sale", "purchase", "journal", "refund", "transfer", "adjustment"].map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Chart Account</Label>
              <Select value={entryForm.account_id} onValueChange={(value) => setEntryForm((f) => ({ ...f, account_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Choose account head" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.code} - {account.name} ({account.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Debit / Credit</Label>
              <Select value={entryForm.direction} onValueChange={(value: "debit" | "credit") => setEntryForm((f) => ({ ...f, direction: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit / Money In</SelectItem>
                  <SelectItem value="credit">Credit / Money Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input inputMode="decimal" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value.replace(/[^\d.]/g, "") }))} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select value={entryForm.payment_mode} onValueChange={(value: ApiAccountingEntry["payment_mode"]) => setEntryForm((f) => ({ ...f, payment_mode: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "bank", "card", "esewa", "cheque", "credit", "owner", "other"].map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bank</Label>
              <Input value={entryForm.bank_name} onChange={(e) => setEntryForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="Nabil / NIC / Cash" />
            </div>
            <div className="space-y-1">
              <Label>Cheque No.</Label>
              <Input value={entryForm.cheque_number} onChange={(e) => setEntryForm((f) => ({ ...f, cheque_number: e.target.value }))} placeholder="If cheque" />
            </div>
            <div className="space-y-1">
              <Label>Reference</Label>
              <Input value={entryForm.reference_number} onChange={(e) => setEntryForm((f) => ({ ...f, reference_number: e.target.value }))} placeholder="Bill / txn / voucher" />
            </div>
            <div className="space-y-1">
              <Label>Party</Label>
              <Input value={entryForm.party_name} onChange={(e) => setEntryForm((f) => ({ ...f, party_name: e.target.value }))} placeholder="Customer / supplier" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Description</Label>
              <Input value={entryForm.description} onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))} placeholder="What happened?" />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2" onClick={saveAccountingEntry}>
                <Save className="h-4 w-4" />
                Save Entry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="hidden print:block">
        <div className="grid grid-cols-3 gap-2" data-print-keep>
          <div className="rounded border p-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Total Debit / Income</p>
            <p className="mt-1 text-lg font-bold">Rs. {totalIncome.toLocaleString()}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Total Credit / Expense</p>
            <p className="mt-1 text-lg font-bold">Rs. {totalExpenses.toLocaleString()}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Closing Balance</p>
            <p className="mt-1 text-lg font-bold">Rs. {(totalIncome - totalExpenses).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-2 rounded border" data-print-keep>
          <div className="border-b px-2 py-1">
            <p className="text-xs font-bold uppercase tracking-wide">Transaction Register</p>
            <p className="text-[10px] text-slate-600">Debit means income/receipt and credit means expense/payment.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">S.N.</TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-24 text-right">Debit</TableHead>
                <TableHead className="w-24 text-right">Credit</TableHead>
                <TableHead className="w-28 text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No transactions found for the selected period.</TableCell>
                </TableRow>
              ) : printRows.map((t) => (
                <TableRow key={`print-${t.id}`}>
                  <TableCell>{t.index}</TableCell>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{t.description}</span>
                    {t.reference && <span className="block text-[9px] text-slate-600">Ref: {t.reference}</span>}
                    {t.accountName && <span className="block text-[9px] text-slate-600">{t.accountName}</span>}
                  </TableCell>
                  <TableCell className="capitalize">{t.category.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right">{t.type === "income" ? `Rs. ${t.amount.toLocaleString()}` : "-"}</TableCell>
                  <TableCell className="text-right">{t.type === "expense" ? `Rs. ${t.amount.toLocaleString()}` : "-"}</TableCell>
                  <TableCell className="text-right">Rs. {t.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>Grand Total</TableCell>
                <TableCell className="text-right">Rs. {totalIncome.toLocaleString()}</TableCell>
                <TableCell className="text-right">Rs. {totalExpenses.toLocaleString()}</TableCell>
                <TableCell className="text-right">Rs. {(totalIncome - totalExpenses).toLocaleString()}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2" data-print-keep>
          <div className="rounded border p-2">
            <p className="text-xs font-bold uppercase">Notes</p>
            <p className="mt-1 text-[10px] text-slate-600">
              This ledger is prepared from recorded income and expense entries. Verify supporting bills, vouchers, bank entries, TDS/VAT and opening balances before audit or tax submission.
            </p>
          </div>
          <div className="rounded border p-2">
            <div className="grid grid-cols-2 gap-6 text-[10px]">
              <div>
                <p className="font-semibold">Prepared By</p>
                <p className="mt-8 border-t pt-1">Name / Signature</p>
              </div>
              <div>
                <p className="font-semibold">Approved By</p>
                <p className="mt-8 border-t pt-1">Name / Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 print:hidden">
        <StatCard title="Income" value={`Rs. ${totalIncome.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="Expenses" value={`Rs. ${totalExpenses.toLocaleString()}`} icon={<TrendingDown className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard
          title="Net"
          value={`Rs. ${(totalIncome - totalExpenses).toLocaleString()}`}
          icon={<ArrowUpDown className="w-5 h-5" />}
          iconClassName={(totalIncome - totalExpenses) >= 0 ? "bg-finance/10 text-finance" : "bg-destructive/10 text-destructive"}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="sm:w-40" />
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2 print:hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ArrowUpDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No transactions found</p>
          </div>
        ) : filtered.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-success/10" : "bg-destructive/10"}`}>
                {t.type === "income"
                  ? <TrendingUp className="w-4 h-4 text-success" />
                  : <TrendingDown className="w-4 h-4 text-destructive" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.description}</p>
                <p className="text-xs text-muted-foreground">{t.date} · {t.category}</p>
              </div>
              <p className={`font-semibold text-sm shrink-0 ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                {t.type === "income" ? "+" : "-"}Rs. {t.amount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block print:hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment / Bank</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions found</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{t.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={t.type === "income" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium">{t.accountName || "-"}</p>
                    {t.accountType && <p className="text-xs text-muted-foreground capitalize">{t.accountType}</p>}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{t.description}</TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">{t.category.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm">
                    <p className="capitalize">{t.paymentMode || "-"}</p>
                    {(t.bankName || t.chequeNumber || t.partyName) && (
                      <p className="text-xs text-muted-foreground">
                        {[t.bankName, t.chequeNumber ? `Chq ${t.chequeNumber}` : "", t.partyName].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-semibold text-sm ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "-"}Rs. {t.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6}>Total Income</TableCell>
                  <TableCell className="text-right text-success">Rs. {totalIncome.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6}>Total Expenses</TableCell>
                  <TableCell className="text-right text-destructive">Rs. {totalExpenses.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6}>Net Amount</TableCell>
                  <TableCell className={`text-right ${(totalIncome - totalExpenses) >= 0 ? "text-success" : "text-destructive"}`}>
                    Rs. {(totalIncome - totalExpenses).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;

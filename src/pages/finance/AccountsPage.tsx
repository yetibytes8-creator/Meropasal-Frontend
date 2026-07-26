import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { invoices as invoicesApi, income as incomeApi, type ApiIncome, type ApiInvoice } from "@/lib/api";
import { useList } from "@/hooks/use-data";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRightLeft, BookOpenCheck, CheckCircle2, CreditCard, Landmark, ReceiptText, RotateCcw, Scale, Search, WalletCards } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { toast } from "sonner";

const STATUS_COLORS: Record<ApiInvoice["status"], string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-info/10 text-info border-info/20",
  paid: "bg-success/10 text-success border-success/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

type ClientBalance = {
  client: string;
  email: string;
  due: number;
  overdue: number;
  paid: number;
  invoices: number;
};

function formatMoney(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

const accountingChecklist = [
  {
    title: "Customer Receivable",
    use: "Bill baneko तर पैसा आउन बाँकी",
    account: "Assets > Accounts Receivable",
    entry: "Invoice / Accounts",
    icon: WalletCards,
  },
  {
    title: "Supplier Payable",
    use: "Purchase भयो, पैसा पछि तिर्ने",
    account: "Liabilities > Accounts Payable",
    entry: "Purchases / Transactions",
    icon: ReceiptText,
  },
  {
    title: "Refund / Sales Return",
    use: "बढी पैसा आयो वा सामान फर्कियो",
    account: "Contra Sales / Refund Payable",
    entry: "Accounts > Refunds",
    icon: RotateCcw,
  },
  {
    title: "Opening Balance",
    use: "पुरानो cash, bank, stock, loan राख्ने",
    account: "Asset / Liability / Equity",
    entry: "Chart of Accounts",
    icon: Landmark,
  },
  {
    title: "Bank / Cheque",
    use: "कुन bank बाट आयो/गयो, cheque no.",
    account: "Cash & Bank Ledgers",
    entry: "Cash & Banks",
    icon: ArrowRightLeft,
  },
  {
    title: "VAT / TDS",
    use: "Tax collect, payable, TDS काटिएको",
    account: "Tax Payable / TDS Receivable",
    entry: "Tax & Rates",
    icon: Scale,
  },
];

export default function AccountsPage() {
  const location = useLocation();
  const [invoiceList, setInvoiceList] = useList(() => invoicesApi.list());
  const [refunds] = useList(() => incomeApi.list().then((items) => items.filter((i) => i.category === "refund")));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const dueInvoices = useMemo(
    () => invoiceList.filter((i) => i.status === "sent" || i.status === "overdue" || i.status === "draft"),
    [invoiceList]
  );

  const cancelledCredits = useMemo(
    () => invoiceList.filter((i) => i.status === "cancelled"),
    [invoiceList]
  );

  const clientBalances = useMemo<ClientBalance[]>(() => {
    const map = new Map<string, ClientBalance>();
    for (const inv of invoiceList) {
      const key = inv.client_name || "Unknown";
      const current = map.get(key) ?? { client: key, email: inv.client_email, due: 0, overdue: 0, paid: 0, invoices: 0 };
      current.email = current.email || inv.client_email;
      current.invoices += 1;
      if (inv.status === "paid") current.paid += Number(inv.total);
      if (inv.status === "sent" || inv.status === "draft") current.due += Number(inv.total);
      if (inv.status === "overdue") {
        current.due += Number(inv.total);
        current.overdue += Number(inv.total);
      }
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.due - a.due);
  }, [invoiceList]);

  const filteredDue = dueInvoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      inv.client_name.toLowerCase().includes(q) ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.client_email.toLowerCase().includes(q);
    const matchesStatus = status === "all" || inv.status === status;
    return matchesSearch && matchesStatus;
  });

  const totalDue = dueInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalOverdue = dueInvoices.filter((i) => i.status === "overdue" || daysUntil(i.due_date) < 0).reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = invoiceList.filter((i) => i.status === "paid").reduce((sum, inv) => sum + Number(inv.total), 0);
  const refundTotal = refunds.reduce((sum: number, item: ApiIncome) => sum + Number(item.amount), 0);
  const creditTotal = cancelledCredits.reduce((sum, inv) => sum + Number(inv.total), 0);
  const filteredDueTotal = filteredDue.reduce((sum, inv) => sum + Number(inv.total), 0);
  const moduleBase = location.pathname.startsWith("/restaurant")
    ? "/restaurant"
    : location.pathname.startsWith("/inventory")
      ? "/inventory"
      : "/finance";
  const chartOfAccountsPath = moduleBase === "/finance" ? "/finance/chart-of-accounts" : `${moduleBase}/chart-of-accounts`;

  const markPaid = async (inv: ApiInvoice) => {
    try {
      const updated = await invoicesApi.update(inv.id, { status: "paid" });
      setInvoiceList((prev) => prev.map((i) => i.id === inv.id ? updated : i));
      toast.success(`${inv.invoice_number} marked paid`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="finance-page space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Accounts</h1>
        <p className="page-description">Track dues, overdue receivables, collections, refunds, and client balances</p>
      </div>

      <Card className="border-green-200 bg-gradient-to-r from-green-50 via-white to-red-50 print:hidden">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-black text-green-950">Chart of Accounts setup</p>
              <p className="text-sm text-muted-foreground">
                Asset, liability, equity, income, expense group/sub-group र ledger यहीबाट manage गर्नुहोस्.
              </p>
            </div>
          </div>
          <Button asChild className="w-full bg-green-700 hover:bg-green-800 sm:w-auto">
            <Link to={chartOfAccountsPath}>
              <BookOpenCheck className="mr-2 h-4 w-4" />
              Open Chart of Accounts
            </Link>
          </Button>
        </CardContent>
      </Card>

      <FinanceStatementHeader
        title="Accounts Receivable Statement"
        subtitle="Due, overdue, collected, refund, and client balance register"
        periodLabel="Current receivables"
        reportNo="AR-DUE"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Due" value={formatMoney(totalDue)} icon={<WalletCards className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard title="Overdue" value={formatMoney(totalOverdue)} icon={<AlertTriangle className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
        <StatCard title="Collected" value={formatMoney(totalPaid)} icon={<CheckCircle2 className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="Refund/Credit" value={formatMoney(refundTotal + creditTotal)} icon={<RotateCcw className="w-5 h-5" />} iconClassName="bg-finance/10 text-finance" />
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Accountant Checklist</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                कुन transaction कुन account head मा राख्ने भन्ने practical guide.
              </p>
            </div>
            <Badge variant="outline" className="w-fit bg-finance/10 text-finance border-finance/20">
              Receivable + Payable + Tax
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {accountingChecklist.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border bg-card p-4">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-finance/10 text-finance">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.use}</p>
                      <div className="mt-3 space-y-1 text-xs">
                        <p><span className="font-semibold text-foreground">Account:</span> {item.account}</p>
                        <p><span className="font-semibold text-foreground">Enter at:</span> {item.entry}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Due Accounts</CardTitle>
              <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                {filteredDue.length} open
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Search client or invoice..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Open</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No dues found</TableCell>
                  </TableRow>
                ) : filteredDue.map((inv) => {
                  const dayGap = daysUntil(inv.due_date);
                  const isLate = inv.status === "overdue" || dayGap < 0;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{inv.client_name}</p>
                        {inv.client_email && <p className="text-xs text-muted-foreground">{inv.client_email}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{inv.due_date}</p>
                        <p className={cn("text-xs", isLate ? "text-destructive" : "text-muted-foreground")}>
                          {isLate ? `${Math.abs(dayGap)} days late` : `${dayGap} days left`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(Number(inv.total))}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => markPaid(inv)}>
                          <CreditCard className="w-3.5 h-3.5" /> Paid
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {filteredDue.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>Total Open Due</TableCell>
                    <TableCell className="text-right">{formatMoney(filteredDueTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Balances</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientBalances.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No client balances yet</TableCell></TableRow>
                ) : clientBalances.slice(0, 8).map((client) => (
                  <TableRow key={client.client}>
                    <TableCell>
                      <p className="font-medium text-sm">{client.client}</p>
                      {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                    </TableCell>
                    <TableCell className="text-right">{client.invoices}</TableCell>
                    <TableCell className={cn("text-right font-semibold", client.due > 0 ? "text-info" : "text-success")}>{formatMoney(client.due)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatMoney(client.overdue)}</TableCell>
                    <TableCell className="text-right text-success">{formatMoney(client.paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {clientBalances.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{clientBalances.reduce((sum, client) => sum + client.invoices, 0)}</TableCell>
                    <TableCell className="text-right">{formatMoney(clientBalances.reduce((sum, client) => sum + client.due, 0))}</TableCell>
                    <TableCell className="text-right">{formatMoney(clientBalances.reduce((sum, client) => sum + client.overdue, 0))}</TableCell>
                    <TableCell className="text-right">{formatMoney(clientBalances.reduce((sum, client) => sum + client.paid, 0))}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Refunds and Credits</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.length === 0 && cancelledCredits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No refunds or credits recorded</TableCell>
                </TableRow>
              ) : (
                <>
                  {refunds.map((item: ApiIncome) => (
                    <TableRow key={`refund-${item.id}`}>
                      <TableCell className="text-sm">{item.date}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-finance/10 text-finance border-finance/20">refund</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.reference || "-"}</TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(Number(item.amount))}</TableCell>
                    </TableRow>
                  ))}
                  {cancelledCredits.map((inv) => (
                    <TableRow key={`credit-${inv.id}`}>
                      <TableCell className="text-sm">{inv.issue_date}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-muted text-muted-foreground border-border">credit</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</TableCell>
                      <TableCell className="text-sm">Cancelled invoice for {inv.client_name}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(Number(inv.total))}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
            {(refunds.length > 0 || cancelledCredits.length > 0) && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>Total Refunds / Credits</TableCell>
                  <TableCell className="text-right">{formatMoney(refundTotal + creditTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

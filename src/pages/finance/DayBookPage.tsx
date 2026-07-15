import { useMemo, useState } from "react";
import { income as incomeApi, expenses as expensesApi, invoices as invoicesApi } from "@/lib/api";
import { fromApiExpense } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, Clock, FileSpreadsheet } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import type { Expense } from "@/types";

type DayBookRow = {
  label: string;
  cash: number;
  bank: number;
  digital: number;
  total: number;
  remarks?: string;
  strong?: boolean;
};

function money(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function bucketAmount(total: number, method?: string | null, split?: { cash?: number | null; online?: number | null }) {
  if (method === "cash") return { cash: total, bank: 0, digital: 0 };
  if (method === "card") return { cash: 0, bank: total, digital: 0 };
  if (method === "mobile") return { cash: 0, bank: 0, digital: total };
  if (method === "split") {
    const cash = Number(split?.cash ?? 0);
    const digital = Number(split?.online ?? Math.max(total - cash, 0));
    return { cash, bank: Math.max(total - cash - digital, 0), digital };
  }
  return { cash: 0, bank: total, digital: 0 };
}

function combineBuckets(buckets: Array<{ cash: number; bank: number; digital: number }>) {
  return {
    cash: sum(buckets.map((item) => item.cash)),
    bank: sum(buckets.map((item) => item.bank)),
    digital: sum(buckets.map((item) => item.digital)),
  };
}

export default function DayBookPage() {
  const [income] = useList(() => incomeApi.list());
  const [expenses] = useList(() => expensesApi.list().then((items) => items.map(fromApiExpense)));
  const [invoices] = useList(() => invoicesApi.list());
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const dayData = useMemo(() => {
    const incomeInRange = income.filter((item) => item.date <= toDate);
    const expensesInRange = expenses.filter((item: Expense) => item.date <= toDate);
    const invoicesInRange = invoices.filter((item) => item.issue_date <= toDate);

    const paidInvoices = invoicesInRange.filter((item) => item.status === "paid");
    const dueInvoices = invoicesInRange.filter((item) => item.status === "sent" || item.status === "overdue" || item.status === "draft");
    const refunds = incomeInRange.filter((item) => item.category === "refund");
    const salesIncome = incomeInRange.filter((item) => item.category === "sales");
    const otherIncome = incomeInRange.filter((item) => item.category !== "sales" && item.category !== "refund");

    const netSales = sum(salesIncome.map((item) => Number(item.amount))) + sum(paidInvoices.map((item) => Number(item.total)));
    const refundTotal = sum(refunds.map((item) => Number(item.amount)));
    const paymentIn = sum(paidInvoices.map((item) => Number(item.total)));
    const otherIncomeTotal = sum(otherIncome.map((item) => Number(item.amount)));
    const expensesTotal = sum(expensesInRange.map((item: Expense) => item.amount));
    const dueTotal = sum(dueInvoices.map((item) => Number(item.total)));
    const paidInvoiceBuckets = combineBuckets(
      paidInvoices.map((item) => bucketAmount(Number(item.total), "bank")),
    );
    const incomeBuckets = combineBuckets(
      salesIncome.map((item) => bucketAmount(Number(item.amount), "bank")),
    );

    const receipts: DayBookRow[] = [
      { label: "Net Sales", ...incomeBuckets, total: netSales, remarks: dueTotal > 0 ? `Open due: ${money(dueTotal)}` : "-" },
      { label: "Purchase Return", cash: 0, bank: refundTotal, digital: 0, total: refundTotal, remarks: "Return / refund received" },
      { label: "Payment In", ...paidInvoiceBuckets, total: paymentIn, remarks: "Invoice receipts" },
      { label: "Other Income", cash: 0, bank: otherIncomeTotal, digital: 0, total: otherIncomeTotal, remarks: "-" },
      { label: "Balance T/F (IN)", cash: 0, bank: 0, digital: 0, total: 0, remarks: "Brought forward" },
    ];
    receipts.push({
      label: "Total Receipts [A]",
      cash: sum(receipts.map((row) => row.cash)),
      bank: sum(receipts.map((row) => row.bank)),
      digital: sum(receipts.map((row) => row.digital)),
      total: sum(receipts.map((row) => row.total)),
      remarks: "",
      strong: true,
    });

    const payments: DayBookRow[] = [
      { label: "Purchase", cash: 0, bank: 0, digital: 0, total: 0, remarks: "Stock / supplier purchase" },
      { label: "Sales Return", cash: 0, bank: refundTotal, digital: 0, total: refundTotal, remarks: "Customer refund" },
      { label: "Payment Out", cash: 0, bank: 0, digital: 0, total: 0, remarks: "Supplier / party payment" },
      { label: "Expenses", cash: 0, bank: expensesTotal, digital: 0, total: expensesTotal, remarks: "Approved expenses" },
      { label: "Balance T/F (OUT)", cash: 0, bank: 0, digital: 0, total: 0, remarks: "Carried forward" },
    ];
    payments.push({
      label: "Total Payments [B]",
      cash: sum(payments.map((row) => row.cash)),
      bank: sum(payments.map((row) => row.bank)),
      digital: sum(payments.map((row) => row.digital)),
      total: sum(payments.map((row) => row.total)),
      remarks: "",
      strong: true,
    });

    return {
      receipts,
      payments,
      receiptCash: receipts.at(-1)?.cash ?? 0,
      receiptBank: receipts.at(-1)?.bank ?? 0,
      receiptDigital: receipts.at(-1)?.digital ?? 0,
      paymentCash: payments.at(-1)?.cash ?? 0,
      paymentBank: payments.at(-1)?.bank ?? 0,
      paymentDigital: payments.at(-1)?.digital ?? 0,
      receiptTotal: receipts.at(-1)?.total ?? 0,
      paymentTotal: payments.at(-1)?.total ?? 0,
      dueTotal,
    };
  }, [expenses, income, invoices, toDate]);

  const netReceipt = dayData.receiptTotal - dayData.paymentTotal;

  const exportDayBook = () => {
    const rows = [
      ["Section", "Particulars", "Cash", "Bank", "Digital / QR", "Total", "Remarks"],
      ...dayData.receipts.map((row) => ["Receipts", row.label, row.cash, row.bank, row.digital, row.total, row.remarks ?? ""]),
      ...dayData.payments.map((row) => ["Payments", row.label, row.cash, row.bank, row.digital, row.total, row.remarks ?? ""]),
      ["Closing", "Net Receipt [C = A - B]", dayData.receiptCash - dayData.paymentCash, dayData.receiptBank - dayData.paymentBank, dayData.receiptDigital - dayData.paymentDigital, netReceipt, ""],
    ];
    downloadCsv(`day-book-${toDate}.csv`, rows);
  };

  const renderRow = (row: DayBookRow) => (
    <TableRow key={row.label} className={row.strong ? "bg-muted/60 font-semibold" : undefined}>
      <TableCell className={row.strong ? "font-semibold" : "font-medium"}>{row.label}</TableCell>
      <TableCell>{money(row.cash)}</TableCell>
      <TableCell>{money(row.bank)}</TableCell>
      <TableCell>{money(row.digital)}</TableCell>
      <TableCell className="font-semibold">{money(row.total)}</TableCell>
      <TableCell className="text-muted-foreground">{row.remarks || "-"}</TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <h1 className="page-header">Day Book</h1>
          <p className="page-description">Daily receipts, payments, due, and closing balance</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="pl-10 sm:w-48" />
          </div>
          <Button variant="outline" className="h-11 gap-2" onClick={() => toast.info("Sales summary is calculated in the table below.")}>
            <FileSpreadsheet className="h-4 w-4" />
            Sales Summary
          </Button>
          <Button className="h-11 gap-2" onClick={() => toast.success("Day book reviewed for selected date.")}>
            <CheckCircle2 className="h-4 w-4" />
            Close the Day
          </Button>
        </div>
      </div>

      <FinanceStatementHeader
        title="Day Book Statement"
        subtitle="Daily receipts and payments summary in a formal ledger layout"
        periodLabel={`Up to ${toDate}`}
        reportNo={`DB-${toDate.replace(/-/g, "")}`}
        onExport={exportDayBook}
      />

      <div className="grid gap-3 sm:grid-cols-3 print:hidden">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Receipts</p>
            <p className="mt-1 text-2xl font-bold text-success">{money(dayData.receiptTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Payments</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{money(dayData.paymentTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Credit Due</p>
            <p className="mt-1 text-2xl font-bold text-primary">{money(dayData.dueTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card data-print-keep className="daybook-ledger-card print:border print:shadow-none">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="daybook-ledger-table">
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Digital / QR</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="daybook-section-row"><TableCell colSpan={6} className="py-3 text-lg font-bold underline">Receipts</TableCell></TableRow>
              {dayData.receipts.map(renderRow)}
              <TableRow className="daybook-section-row"><TableCell colSpan={6} className="py-3 text-lg font-bold underline">Payments</TableCell></TableRow>
              {dayData.payments.map(renderRow)}
              <TableRow className="daybook-net-row bg-primary/5 font-bold">
                <TableCell>Net Receipt [C = A - B]</TableCell>
                <TableCell>{money(dayData.receiptCash - dayData.paymentCash)}</TableCell>
                <TableCell>{money(dayData.receiptBank - dayData.paymentBank)}</TableCell>
                <TableCell>{money(dayData.receiptDigital - dayData.paymentDigital)}</TableCell>
                <TableCell>{money(netReceipt)}</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="daybook-grand-total">
              <TableRow>
                <TableCell>Grand Total / Closing</TableCell>
                <TableCell>{money(dayData.receiptCash - dayData.paymentCash)}</TableCell>
                <TableCell>{money(dayData.receiptBank - dayData.paymentBank)}</TableCell>
                <TableCell>{money(dayData.receiptDigital - dayData.paymentDigital)}</TableCell>
                <TableCell>{money(netReceipt)}</TableCell>
                <TableCell>{dayData.dueTotal > 0 ? `Due: ${money(dayData.dueTotal)}` : "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>Total Receipts [A]: {money(dayData.receiptTotal)}</TableCell>
                <TableCell colSpan={2}>Total Payments [B]: {money(dayData.paymentTotal)}</TableCell>
                <TableCell>Net: {money(netReceipt)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
        <Clock className="h-4 w-4" />
        <span>Daybook History</span>
        <Badge variant="outline">Live from finance records</Badge>
      </div>
    </div>
  );
}

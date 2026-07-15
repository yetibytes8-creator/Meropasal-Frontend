import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpenCheck } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";

const accounts = [
  { code: "1000", name: "Cash Counter", type: "Asset", normal: "Debit" },
  { code: "1010", name: "Bank Account", type: "Asset", normal: "Debit" },
  { code: "1100", name: "Accounts Receivable", type: "Asset", normal: "Debit" },
  { code: "1110", name: "TDS Receivable", type: "Asset", normal: "Debit" },
  { code: "1200", name: "Inventory Stock", type: "Asset", normal: "Debit" },
  { code: "2000", name: "Accounts Payable", type: "Liability", normal: "Credit" },
  { code: "2100", name: "TDS Payable", type: "Liability", normal: "Credit" },
  { code: "2300", name: "Salary Payable", type: "Liability", normal: "Credit" },
  { code: "2310", name: "Wages Payable", type: "Liability", normal: "Credit" },
  { code: "2320", name: "Staff Advance Payable", type: "Liability", normal: "Credit" },
  { code: "2330", name: "EPF / CIT Payable", type: "Liability", normal: "Credit" },
  { code: "2340", name: "Staff Loan Payable", type: "Liability", normal: "Credit" },
  { code: "3000", name: "Owner's Capital", type: "Equity", normal: "Credit" },
  { code: "4000", name: "Sales Revenue", type: "Income", normal: "Credit" },
  { code: "4100", name: "Service Income", type: "Income", normal: "Credit" },
  { code: "5000", name: "Purchase Expense", type: "Expense", normal: "Debit" },
  { code: "5100", name: "Operating Expenses", type: "Expense", normal: "Debit" },
  { code: "5110", name: "Salary Expense", type: "Expense", normal: "Debit" },
  { code: "5120", name: "Staff Welfare Expense", type: "Expense", normal: "Debit" },
  { code: "5130", name: "Bonus / Incentive Expense", type: "Expense", normal: "Debit" },
  { code: "5200", name: "Tax Expense", type: "Expense", normal: "Debit" },
];

const colorByType: Record<string, string> = {
  Asset: "bg-info/10 text-info border-info/20",
  Liability: "bg-destructive/10 text-destructive border-destructive/20",
  Equity: "bg-primary/10 text-primary border-primary/20",
  Income: "bg-success/10 text-success border-success/20",
  Expense: "bg-warning/10 text-warning border-warning/20",
};

export default function ChartOfAccountsPage() {
  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Charts of Account</h1>
        <p className="page-description">Standard account map for receipts, payments, tax, and reports</p>
      </div>

      <FinanceStatementHeader
        title="Chart of Accounts"
        subtitle="Standard account map used for ledger, day book, and financial reports"
        periodLabel="Active account map"
        reportNo="COA"
        basis="Standardized internal account classification"
      />

      <div className="grid gap-3 sm:grid-cols-5">
        {["Asset", "Liability", "Equity", "Income", "Expense"].map((type) => (
          <Card key={type}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{type}</p>
              <p className="mt-1 text-2xl font-bold">{accounts.filter((account) => account.type === type).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="h-4 w-4" />Account List</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Normal Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.code}>
                  <TableCell className="font-mono text-sm">{account.code}</TableCell>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell><Badge variant="outline" className={colorByType[account.type]}>{account.type}</Badge></TableCell>
                  <TableCell>{account.normal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total Accounts</TableCell>
                <TableCell className="text-right">{accounts.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

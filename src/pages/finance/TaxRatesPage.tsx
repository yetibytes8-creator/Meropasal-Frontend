import { useMemo } from "react";
import { invoices as invoicesApi } from "@/lib/api";
import { useList } from "@/hooks/use-data";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Percent, ReceiptText } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";

function money(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

export default function TaxRatesPage() {
  const { settings } = useSettings();
  const [invoices] = useList(() => invoicesApi.list());

  const totals = useMemo(() => {
    const taxable = invoices.reduce((sum, invoice) => sum + Number(invoice.subtotal), 0);
    const tax = invoices.reduce((sum, invoice) => sum + Number(invoice.tax_amount), 0);
    return { taxable, tax, gross: taxable + tax };
  }, [invoices]);

  const rates = [
    { name: "Default Sales Tax", rate: settings.taxRate, appliesTo: "Invoices, receipts, and billing" },
    { name: "Zero Rated", rate: 0, appliesTo: "Non-taxable goods and service entries" },
    { name: "Manual Override", rate: settings.taxRate, appliesTo: "Invoice line calculation" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Tax & Rates</h1>
        <p className="page-description">Review tax setup and taxable invoice totals</p>
      </div>

      <FinanceStatementHeader
        title="Tax Rate Statement"
        subtitle="Configured tax rates and taxable invoice summary"
        periodLabel="Current tax setup"
        reportNo="TAX-RATE"
        basis="Invoice totals and saved tax configuration"
      />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4" />Configured Rates</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rate Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.name}>
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell>{rate.rate}%</TableCell>
                  <TableCell className="text-muted-foreground">{rate.appliesTo}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-success/10 text-success border-success/20">active</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" />Invoice Tax Summary</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Amount / Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Taxable Amount</TableCell>
                <TableCell className="text-muted-foreground">Invoice subtotal before tax</TableCell>
                <TableCell className="text-right font-semibold">{money(totals.taxable)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Tax Collected</TableCell>
                <TableCell className="text-muted-foreground">Tax amount recorded on invoices</TableCell>
                <TableCell className="text-right font-semibold text-primary">{money(totals.tax)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Default Rate</TableCell>
                <TableCell className="text-muted-foreground">Configured billing tax rate</TableCell>
                <TableCell className="text-right font-semibold text-success">{settings.taxRate}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Effective Rate</TableCell>
                <TableCell className="text-muted-foreground">Tax collected divided by taxable amount</TableCell>
                <TableCell className="text-right font-semibold">{totals.taxable ? Math.round((totals.tax / totals.taxable) * 10000) / 100 : 0}%</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Gross Invoice Value</TableCell>
                <TableCell className="text-right">{money(totals.gross)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

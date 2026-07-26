import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Plus } from "lucide-react";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { toast } from "sonner";

type Transfer = {
  id: number;
  date: string;
  from: string;
  to: string;
  amount: number;
  note: string;
};

const accounts = ["Bank Account", "Counter", "Owner's Account"];

function money(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

export default function BalanceTransferPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    from: "Counter",
    to: "Bank Account",
    amount: "",
    note: "",
  });

  const addTransfer = () => {
    const amount = Number(form.amount);
    if (form.from === form.to) {
      toast.error("From and to account must be different.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a valid transfer amount.");
      return;
    }
    setTransfers((prev) => [{ id: Date.now(), ...form, amount }, ...prev]);
    setForm((prev) => ({ ...prev, amount: "", note: "" }));
    toast.success("Transfer added to this session.");
  };
  const transferTotal = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);

  return (
    <div className="finance-page space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Balance Transfer</h1>
        <p className="page-description">Move balances between counter, bank, and owner accounts</p>
      </div>

      <FinanceStatementHeader
        title="Balance Transfer Register"
        subtitle="Counter, bank, and owner account movement register"
        periodLabel="Current session"
        reportNo="BT-REGISTER"
        basis="Manual balance transfer entries"
      />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="h-4 w-4" />New Transfer</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={form.from} onValueChange={(value) => setForm({ ...form, from: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{accounts.map((account) => <SelectItem key={account} value={account}>{account}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Select value={form.to} onValueChange={(value) => setForm({ ...form, to: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{accounts.map((account) => <SelectItem key={account} value={account}>{account}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          </div>
          <Button className="h-11 gap-2" onClick={addTransfer}><Plus className="h-4 w-4" />Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Transfer History</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">No transfers added yet</TableCell></TableRow>
              ) : transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{transfer.date}</TableCell>
                  <TableCell>{transfer.from}</TableCell>
                  <TableCell>{transfer.to}</TableCell>
                  <TableCell className="text-right font-semibold">{money(transfer.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {transfers.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total Transferred</TableCell>
                  <TableCell className="text-right">{money(transferTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, HandCoins, Landmark, Plus } from "lucide-react";
import { toast } from "sonner";

type Entry = { id: string; type: "deposit" | "withdrawal"; amount: number; account: string; note: string; date: string };
const STORAGE_KEY = "mero-pasal-savings";

function readEntries(): Entry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export default function SavingsPage() {
  const [entries, setEntries] = useState<Entry[]>(readEntries);
  const [form, setForm] = useState({ type: "deposit" as Entry["type"], amount: "", account: "Counter Cash", note: "" });

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)), [entries]);

  const balance = useMemo(() => entries.reduce((sum, e) => sum + (e.type === "deposit" ? e.amount : -e.amount), 0), [entries]);
  const deposits = entries.filter((e) => e.type === "deposit").reduce((sum, e) => sum + e.amount, 0);
  const withdrawals = entries.filter((e) => e.type === "withdrawal").reduce((sum, e) => sum + e.amount, 0);

  const add = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Valid amount required");
      return;
    }
    setEntries((prev) => [{ id: String(Date.now()), type: form.type, amount, account: form.account, note: form.note, date: new Date().toLocaleString() }, ...prev]);
    setForm({ type: "deposit", amount: "", account: "Counter Cash", note: "" });
    toast.success("Savings entry saved");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Savings</h1>
        <p className="text-muted-foreground">Track deposit and withdrawal for cafe reserve cash or owner savings</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Summary title="Savings Balance" value={balance} icon={Landmark} />
        <Summary title="Total Deposit" value={deposits} icon={HandCoins} />
        <Summary title="Total Withdrawal" value={withdrawals} icon={Banknote} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader><CardTitle>Add Entry</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(type: Entry["type"]) => setForm({ ...form, type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="withdrawal">Withdrawal</SelectItem></SelectContent>
              </Select>
            </div>
            <Field label="Amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
            <Field label="Account" value={form.account} onChange={(account) => setForm({ ...form, account })} />
            <Field label="Note" value={form.note} onChange={(note) => setForm({ ...form, note })} />
            <Button className="w-full" onClick={add}><Plus className="mr-2 h-4 w-4" />Save Entry</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Savings Ledger</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No deposit or withdrawal entries yet</div>}
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Badge variant="outline" className={entry.type === "deposit" ? "text-success border-success/30 bg-success/10" : "text-destructive border-destructive/30 bg-destructive/10"}>{entry.type}</Badge>
                  <p className="mt-2 font-medium">{entry.account}</p>
                  <p className="text-sm text-muted-foreground">{entry.note || "No note"} | {entry.date}</p>
                </div>
                <p className={entry.type === "deposit" ? "font-bold text-success" : "font-bold text-destructive"}>{entry.type === "deposit" ? "+" : "-"}Rs. {entry.amount.toFixed(2)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Summary({ title, value, icon: Icon }: { title: string; value: number; icon: React.ElementType }) {
  return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">Rs. {value.toFixed(2)}</p></div><Icon className="h-5 w-5 text-primary" /></CardContent></Card>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

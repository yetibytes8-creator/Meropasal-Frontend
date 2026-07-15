import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Printer, ReceiptText, Save } from "lucide-react";
import { toast } from "sonner";

type PrinterConfig = { counterPrinter: string; kitchenPrinter: string; paper: string; kot: boolean; bot: boolean; receipt: boolean; qr: boolean };
const STORAGE_KEY = "mero-pasal-printer-settings";
const defaults: PrinterConfig = { counterPrinter: "Default Counter Printer", kitchenPrinter: "Kitchen Printer", paper: "80mm", kot: true, bot: false, receipt: true, qr: false };

function readConfig(): PrinterConfig {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return defaults; }
}

export default function PrinterPage() {
  const [config, setConfig] = useState<PrinterConfig>(readConfig);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(config)), [config]);
  const update = <K extends keyof PrinterConfig>(key: K, value: PrinterConfig[K]) => setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Printer</h1>
        <p className="text-muted-foreground">Configure KOT, BOT, receipt, QR and paper settings for billing</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-primary" />Printer Setup</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Counter printer" value={config.counterPrinter} onChange={(v) => update("counterPrinter", v)} />
            <Field label="Kitchen printer" value={config.kitchenPrinter} onChange={(v) => update("kitchenPrinter", v)} />
            <div className="space-y-2">
              <Label>Paper size</Label>
              <Select value={config.paper} onValueChange={(paper) => update("paper", paper)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm</SelectItem>
                  <SelectItem value="80mm">80mm</SelectItem>
                  <SelectItem value="A5">A5</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Automation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Toggle title="Print KOT" checked={config.kot} onCheckedChange={(v) => update("kot", v)} />
            <Toggle title="Print BOT" checked={config.bot} onCheckedChange={(v) => update("bot", v)} />
            <Toggle title="Print receipt on payment" checked={config.receipt} onCheckedChange={(v) => update("receipt", v)} />
            <Toggle title="Print QR in bill" checked={config.qr} onCheckedChange={(v) => update("qr", v)} />
            <Button className="w-full" onClick={() => toast.success("Printer settings saved")}><Save className="mr-2 h-4 w-4" />Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Toggle({ title, checked, onCheckedChange }: { title: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-lg border p-3"><span className="font-medium">{title}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></div>;
}

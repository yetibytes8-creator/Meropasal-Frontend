import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Printer, Banknote, CreditCard, Smartphone, Download, Search, Wallet, CheckCircle2, SplitSquareHorizontal, Receipt, RefreshCcw } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useOrders } from "@/contexts/OrdersContext";
import { useSettings } from "@/contexts/SettingsContext";
import { orders as ordersApi } from "@/lib/api";
import { generateTaxInvoiceHTML, generateThermalInvoiceHTML } from "@/lib/invoiceTemplate";
import { balanceMoneyInput, formatMoneyInput, parseMoneyInput, sanitizeMoneyInput } from "@/lib/moneyInput";
import { postRefundToAccounts, postRestaurantBillToAccounts } from "@/lib/accountingAutoPost";
import type { Order, Table } from "@/types";
import { toast } from "sonner";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useSearchParams } from "react-router-dom";

import type { BusinessSettings } from "@/types";

const invoiceUrl = (order: Order) =>
  `${window.location.origin}/restaurant/billing?invoice=${order.id}`;

const tableLabel = (order: Order, tables: Table[]): string | null => {
  if (!order.tableId) return null;
  const table = tables.find((t) => t.id === order.tableId);
  return table ? `Table ${table.number}` : null;
};

const generateInvoiceHTML = (order: Order, qrDataUrl: string, s: BusinessSettings, tableText: string | null) => {
  const split = order.splitPayment;
  const url = invoiceUrl(order);
  const isPaymentQr = s.paymentQr?.showOnBill && s.paymentQr?.image && (order.paymentMethod === "mobile" || order.paymentMethod === "split");
  return generateTaxInvoiceHTML({
    title: "TAX INVOICE",
    invoiceNo: order.id.slice(1),
    invoiceDate: new Date(order.createdAt).toLocaleString(),
    customerName: order.customerName || "Walk-in Customer",
    orderType: order.type,
    tableText,
    paymentMode: order.paymentMethod
      ? `${order.paymentMethod}${split ? ` (Cash Rs. ${split.cash.toFixed(2)} + Online Rs. ${split.online.toFixed(2)})` : ""}`
      : undefined,
    lines: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      rate: item.price,
      amount: item.quantity * item.price,
    })),
    subtotal: order.total,
    taxPercent: 0,
    taxAmount: 0,
    total: order.total,
    qrDataUrl: isPaymentQr ? s.paymentQr.image! : qrDataUrl,
    qrCaption: isPaymentQr
      ? `Payment QR: ${s.paymentQr.provider}${s.paymentQr.accountName ? ` - ${s.paymentQr.accountName}` : ""}${s.paymentQr.accountNumber ? ` (${s.paymentQr.accountNumber})` : ""}`
      : url,
    note: s.receiptFooter,
}, s);
};

const generateThermalReceiptHTML = (order: Order, qrDataUrl: string, s: BusinessSettings, tableText: string | null) => {
  const split = order.splitPayment;
  const url = invoiceUrl(order);
  const isPaymentQr = s.paymentQr?.showOnBill && s.paymentQr?.image && (order.paymentMethod === "mobile" || order.paymentMethod === "split");
  return generateThermalInvoiceHTML({
    title: "TAX INVOICE",
    invoiceNo: order.id.slice(1),
    invoiceDate: new Date(order.createdAt).toLocaleString(),
    customerName: order.customerName || "Walk-in Customer",
    orderType: order.type,
    tableText,
    paymentMode: order.paymentMethod
      ? `${order.paymentMethod}${split ? ` (Cash Rs. ${split.cash.toFixed(2)} + Online Rs. ${split.online.toFixed(2)})` : ""}`
      : undefined,
    lines: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      rate: item.price,
      amount: item.quantity * item.price,
    })),
    subtotal: order.total,
    taxPercent: 0,
    taxAmount: 0,
    total: order.total,
    qrDataUrl: isPaymentQr ? s.paymentQr.image! : qrDataUrl,
    qrCaption: isPaymentQr
      ? `Payment QR: ${s.paymentQr.provider}${s.paymentQr.accountNumber ? ` ${s.paymentQr.accountNumber}` : ""}`
      : url,
    note: s.receiptFooter,
  }, s);
};

const methodIcon = (m?: string) => m === "cash" ? <Banknote className="w-3 h-3" /> : m === "card" ? <CreditCard className="w-3 h-3" /> : m === "split" ? <SplitSquareHorizontal className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />;

const BillingPage = () => {
  const { allOrders, setAllOrders, allTables } = useOrders();
  const { settings } = useSettings();

  const handlePrint = async (order: Order) => {
    const qr = await QRCode.toDataURL(invoiceUrl(order), { margin: 1, width: 220 });
    const w = window.open("", "_blank", "width=450,height=600");
    if (!w) return;
    w.document.write(generateThermalReceiptHTML(order, qr, settings, tableLabel(order, allTables)));
    w.document.close();
    w.setTimeout(() => { w.print(); }, 400);
  };

  const handleDownload = async (order: Order) => {
    const invoice = settings.printSettings.invoice;
    const qr = await QRCode.toDataURL(invoiceUrl(order), { margin: 1, width: 220 });
    const doc = new jsPDF({ unit: "mm", format: [80, 220] });
    const split = order.splitPayment;
    const tableText = tableLabel(order, allTables);
    let y = 6;
    if (settings.logo && invoice.showLogo) {
      doc.addImage(settings.logo, 20, y, 40, 14);
      y += 17;
    }
    if (invoice.showBusinessName) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text(settings.businessName, 40, y, { align: "center" }); y += 4;
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    if (invoice.showAddress && settings.address) { doc.text(settings.address, 40, y, { align: "center" }); y += 3; }
    const contact = [invoice.showPhone ? settings.phone : "", invoice.showEmail ? settings.email : ""].filter(Boolean).join("  ");
    if (contact) { doc.text(contact, 40, y, { align: "center" }); y += 3; }
    if (settings.taxNumber) { doc.text(`PAN/VAT: ${settings.taxNumber}`, 40, y, { align: "center" }); y += 3; }
    if (invoice.headerText) { doc.text(invoice.headerText, 40, y, { align: "center" }); y += 3; }
    doc.text("--------------------------------", 40, y, { align: "center" }); y += 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(invoice.title || "INVOICE", 40, y, { align: "center" }); y += 3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    if (invoice.showInvoiceNo) { doc.text(`#${order.id.slice(1)}`, 40, y, { align: "center" }); y += 4; }
    doc.text("--------------------------------", 40, y, { align: "center" }); y += 4;
    if (invoice.showDate) { doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 4, y); y += 4; }
    if (order.customerName) { doc.text(`Customer: ${order.customerName}`, 4, y); y += 4; }
    if (invoice.showOrderType) { doc.text(`Type: ${order.type}${invoice.showTable && tableText ? ` (${tableText})` : ""}`, 4, y); y += 4; }
    if (invoice.showPaymentMode && order.paymentMethod) { doc.text(`Payment: ${order.paymentMethod}`, 4, y); y += 4; }
    if (invoice.showPaymentMode && split) { doc.text(`Cash: Rs ${split.cash.toFixed(2)}  Online: Rs ${split.online.toFixed(2)}`, 4, y); y += 4; }
    doc.text("--------------------------------", 40, y, { align: "center" }); y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Item", 4, y); doc.text("Qty", 44, y); doc.text("Total", 76, y, { align: "right" }); y += 4;
    doc.setFont("helvetica", "normal");
    order.items.forEach(i => {
      const name = i.name.length > 22 ? i.name.slice(0, 22) : i.name;
      doc.text(name, 4, y); doc.text(String(i.quantity), 44, y);
      doc.text(`Rs ${(i.quantity * i.price).toFixed(2)}`, 76, y, { align: "right" }); y += 4;
    });
    doc.text("--------------------------------", 40, y, { align: "center" }); y += 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("TOTAL", 4, y); doc.text(`Rs ${order.total.toFixed(2)}`, 76, y, { align: "right" }); y += 6;
    const paymentQr = settings.paymentQr?.showOnBill && settings.paymentQr?.image && (order.paymentMethod === "mobile" || order.paymentMethod === "split");
    if (invoice.showQr) {
      doc.addImage(paymentQr ? settings.paymentQr.image! : qr, "PNG", 27, y, 26, 26); y += 28;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(paymentQr ? `Scan to pay: ${settings.paymentQr.provider}` : "Scan to view invoice", 40, y, { align: "center" }); y += 4;
      if (paymentQr && settings.paymentQr.accountNumber) { doc.text(settings.paymentQr.accountNumber, 40, y, { align: "center" }); y += 4; }
    }
    doc.setFontSize(8);
    if (invoice.footerTitle) { doc.text(invoice.footerTitle, 40, y, { align: "center" }); y += 4; }
    doc.text(invoice.footerMessage || settings.receiptFooter || "Thank you for your visit!", 40, y, { align: "center" });
    doc.save(`invoice-${order.id.slice(1)}.pdf`);
  };

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("unpaid");
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payStep, setPayStep] = useState<"preview" | "payment">("preview");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "mobile" | "split">("cash");
  const [splitCash, setSplitCash] = useState("");
  const [splitOnline, setSplitOnline] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const id = params.get("invoice");
    if (id) {
      const o = allOrders.find(x => x.id === id);
      if (o) setDetailOrder(o);
    }
  }, [params, allOrders]);

  const completedOrders = allOrders.filter((o) => o.status === "completed" && !!o.paymentMethod);
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const unpaidOrders = allOrders.filter((o) => o.status !== "cancelled" && o.status !== "refunded" && !o.paymentMethod);
  const cashTotal = completedOrders.reduce((s, o) => s + (o.splitPayment?.cash ?? (o.paymentMethod === "cash" ? o.total : 0)), 0);
  const onlineTotal = completedOrders.reduce((s, o) => s + (o.splitPayment?.online ?? (o.paymentMethod && o.paymentMethod !== "cash" && o.paymentMethod !== "split" ? o.total : 0)), 0);

  const list = useMemo(() => {
    const base = tab === "unpaid" ? unpaidOrders : tab === "paid" ? completedOrders : allOrders.filter(o => o.status !== "cancelled");
    const q = search.trim().toLowerCase();
    return q ? base.filter((o) => {
      const tableText = tableLabel(o, allTables)?.toLowerCase() ?? "";
      return o.id.toLowerCase().includes(q)
        || tableText.includes(q)
        || (o.customerName?.toLowerCase().includes(q) ?? false);
    }) : base;
  }, [tab, search, allOrders, unpaidOrders, completedOrders, allTables]);

  const openPay = (o: Order) => {
    setPayOrder(o);
    setPayStep("preview");
    setPayMethod("cash");
    setSplitCash(formatMoneyInput(o.total / 2));
    setSplitOnline(formatMoneyInput(o.total / 2));
  };

  const confirmPayment = () => {
    if (!payOrder) return;
    let splitPayment: Order["splitPayment"];
    if (payMethod === "split") {
      const c = parseMoneyInput(splitCash);
      const o = parseMoneyInput(splitOnline);
      if (Math.abs(c + o - payOrder.total) > 0.01) {
        toast.error(`Cash + Online must equal Rs. ${payOrder.total.toFixed(2)}`);
        return;
      }
      splitPayment = { cash: c, online: o };
    }
    const paidOrder: Order = { ...payOrder, status: "completed", paymentMethod: payMethod, splitPayment };
    setAllOrders(prev => prev.map(o => o.id === payOrder.id ? paidOrder : o));
    postRestaurantBillToAccounts(paidOrder).catch(() => toast.warning("Payment saved, finance auto-entry pending"));
    toast.success("Payment recorded");
    setPayOrder(null);
  };

  const handleRefund = async (order: Order) => {
    if (!window.confirm(`Refund bill #${order.id.slice(1)} for Rs. ${order.total.toFixed(2)}?`)) return;
    try {
      const refunded = await ordersApi.refund(Number(order.id));
      setAllOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status: refunded.status, paymentMethod: undefined, splitPayment: undefined } : item
        )
      );
      postRefundToAccounts({
        reference: `REST-${order.id}`,
        amount: order.total,
        method: order.paymentMethod,
        party: order.customerName,
        description: `Restaurant refund: ${order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}`,
      }).catch(() => toast.warning("Refund saved, finance auto-entry pending"));
      toast.success("Refund recorded in finance ledger");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="page-header">Billing & Payments</h1>
        <p className="page-description">Generate invoices and process payments</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={`Rs. ${totalRevenue.toFixed(2)}`} icon={<Banknote className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="Cash" value={`Rs. ${cashTotal.toFixed(2)}`} icon={<Wallet className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard title="Online" value={`Rs. ${onlineTotal.toFixed(2)}`} icon={<Smartphone className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard title="Pending Bills" value={unpaidOrders.length} icon={<CreditCard className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="flex flex-col justify-between gap-3 border-b bg-card/70 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div>
            <CardTitle className="text-base">Invoices</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Review bills, collect payments, and print receipts</p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by #, table, or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-lg bg-background pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-10 w-full justify-start rounded-lg bg-muted/70 p-1 sm:w-auto">
              <TabsTrigger value="unpaid" className="flex-1 sm:flex-none">Unpaid ({unpaidOrders.length})</TabsTrigger>
              <TabsTrigger value="paid" className="flex-1 sm:flex-none">Paid ({completedOrders.length})</TabsTrigger>
              <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <div className="space-y-3">
                {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No invoices found</p>}
                {list.map((order) => (
                  <div key={order.id} className="rounded-lg border bg-card p-3 transition hover:border-primary/20 hover:bg-muted/20 sm:p-4">
                    {/* Top row — ID, badges */}
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_360px] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm">#{order.id.slice(1)}</span>
                          <Badge variant="outline" className="h-6 rounded-md text-xs">{order.type}</Badge>
                          {tableLabel(order, allTables) && (
                            <Badge variant="outline" className="h-6 rounded-md border-info/20 bg-info/10 text-xs text-info">
                              {tableLabel(order, allTables)}
                            </Badge>
                          )}
                          <Badge variant={order.status === "completed" ? "default" : order.status === "refunded" ? "destructive" : "secondary"} className="h-6 rounded-md text-xs">{order.status}</Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{order.items.length} items</span>
                          <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                          {order.customerName && <span className="truncate">{order.customerName}</span>}
                        </div>
                        {order.paymentMethod && (
                          <Badge variant="outline" className="mt-2 flex h-6 w-fit items-center gap-1 rounded-md text-xs capitalize">
                            {methodIcon(order.paymentMethod)}{order.paymentMethod}
                          </Badge>
                        )}
                        {order.splitPayment && (
                          <p className="text-xs text-info mt-1">Cash Rs. {order.splitPayment.cash.toFixed(2)} • Online Rs. {order.splitPayment.online.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="min-w-0 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground lg:bg-transparent lg:px-0 lg:py-0">
                        <p className="truncate font-medium text-foreground">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</p>
                        <p className="mt-1">Ready for {order.status === "completed" ? "receipt" : "payment"}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
                        <span className="text-lg font-bold sm:mr-2 lg:min-w-28 lg:text-right">Rs. {order.total.toFixed(2)}</span>
                        <div className="grid grid-cols-3 gap-2 sm:flex">
                          {order.status !== "completed" && order.status !== "refunded" && (
                            <Button className="h-10 rounded-lg px-4 text-sm font-semibold shadow-none" onClick={() => openPay(order)}>
                              <Receipt className="mr-1.5 h-3.5 w-3.5 shrink-0" />Preview
                            </Button>
                          )}
                          {order.status === "completed" && (
                            <Button variant="outline" className="h-10 rounded-lg px-3 text-destructive shadow-none hover:text-destructive" onClick={() => handleRefund(order)}>
                              <RefreshCcw className="h-3.5 w-3.5 shrink-0 sm:mr-1.5" />
                              <span className="hidden sm:inline">Refund</span>
                            </Button>
                          )}
                          <Button variant="outline" className="h-10 rounded-lg px-3 shadow-none" onClick={() => handlePrint(order)}>
                            <Printer className="h-3.5 w-3.5 shrink-0 sm:mr-1.5" />
                            <span className="hidden sm:inline">Print</span>
                          </Button>
                          <Button variant="outline" className="h-10 rounded-lg px-3 shadow-none" onClick={() => handleDownload(order)}>
                            <Download className="h-3.5 w-3.5 shrink-0 sm:mr-1.5" />
                            <span className="hidden sm:inline">PDF</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!payOrder} onOpenChange={(o) => !o && setPayOrder(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:w-full overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{payStep === "preview" ? "Bill Preview" : "Process Payment"}</DialogTitle></DialogHeader>
          {payOrder && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tax Invoice Preview</p>
                    <h3 className="mt-1 text-xl font-bold">{settings.businessName || "My Business"}</h3>
                    <p className="text-xs text-muted-foreground">{settings.address || "Business address"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[settings.phone, settings.email].filter(Boolean).join(" | ") || "Phone / Email"}
                    </p>
                    <p className="text-xs text-muted-foreground">PAN/VAT: {settings.taxNumber || "Not set"}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold">#{payOrder.id.slice(1)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(payOrder.createdAt).toLocaleString()}</p>
                    <Badge variant="outline" className="mt-2 capitalize">{payOrder.type}</Badge>
                  </div>
                </div>
                <div className="grid gap-3 border-b p-4 sm:grid-cols-2">
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{payOrder.customerName || "Walk-in Customer"}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Order Type / Table</p>
                    <p className="font-medium capitalize">{payOrder.type}{tableLabel(payOrder, allTables) ? ` - ${tableLabel(payOrder, allTables)}` : ""}</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {payOrder.items.map((item, index) => (
                      <div key={`${item.menuItemId}-${index}`} className="grid grid-cols-[1fr_52px_92px] gap-2 rounded-md border p-3 text-sm">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Rate Rs. {item.price.toFixed(2)}</p>
                        </div>
                        <p className="text-center text-muted-foreground">x {item.quantity}</p>
                        <p className="text-right font-semibold">Rs. {(item.quantity * item.price).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="ml-auto mt-4 max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {payOrder.total.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">VAT / Tax</span><span>Rs. 0.00</span></div>
                    <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>Rs. {payOrder.total.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              {payStep === "payment" && (
                <>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="mobile">Mobile / Online</SelectItem>
                        <SelectItem value="split">Split (Cash + Online)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {payMethod === "split" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Cash (Rs. )</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.]?[0-9]*"
                          autoComplete="off"
                          autoFocus
                          value={splitCash}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const value = sanitizeMoneyInput(e.target.value);
                            setSplitCash(value);
                            setSplitOnline(balanceMoneyInput(payOrder.total, value));
                          }}
                          onBlur={(e) => {
                            const value = formatMoneyInput(parseMoneyInput(e.target.value));
                            setSplitCash(value);
                            setSplitOnline(balanceMoneyInput(payOrder.total, value));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Online (Rs. )</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.]?[0-9]*"
                          autoComplete="off"
                          value={splitOnline}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const value = sanitizeMoneyInput(e.target.value);
                            setSplitOnline(value);
                            setSplitCash(balanceMoneyInput(payOrder.total, value));
                          }}
                          onBlur={(e) => {
                            const value = formatMoneyInput(parseMoneyInput(e.target.value));
                            setSplitOnline(value);
                            setSplitCash(balanceMoneyInput(payOrder.total, value));
                          }}
                        />
                      </div>
                      <p className="col-span-2 text-xs text-muted-foreground">Total must equal Rs. {payOrder.total.toFixed(2)}</p>
                    </div>
                  )}
                </>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => handlePrint(payOrder)}>
                  <Printer className="w-4 h-4 mr-2" />Print Preview
                </Button>
                {payStep === "preview" ? (
                  <Button className="h-11 rounded-xl" onClick={() => setPayStep("payment")}>
                    Continue to Payment
                  </Button>
                ) : (
                  <Button className="h-11 rounded-xl" onClick={confirmPayment}><CheckCircle2 className="w-4 h-4 mr-2" />Confirm Payment</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailOrder} onOpenChange={(o) => { if (!o) { setDetailOrder(null); params.delete("invoice"); setParams(params, { replace: true }); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full overflow-y-auto max-h-[85vh]">
          <DialogHeader><DialogTitle>Invoice #{detailOrder?.id.slice(1)}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(detailOrder.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{detailOrder.type}{tableLabel(detailOrder, allTables) ? ` (${tableLabel(detailOrder, allTables)})` : ""}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={detailOrder.status === "completed" ? "default" : "secondary"}>{detailOrder.status}</Badge></div>
              {detailOrder.customerName && <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{detailOrder.customerName}</span></div>}
              {detailOrder.paymentMethod && <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{detailOrder.paymentMethod}</span></div>}
              {detailOrder.splitPayment && <div className="flex justify-between text-info"><span>Split</span><span>Cash Rs. {detailOrder.splitPayment.cash.toFixed(2)} • Online Rs. {detailOrder.splitPayment.online.toFixed(2)}</span></div>}
              <div className="border-t pt-3 space-y-1.5">
                {detailOrder.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>Rs. {(i.price * i.quantity).toFixed(2)}</span></div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>Rs. {detailOrder.total.toFixed(2)}</span></div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2" onClick={() => handlePrint(detailOrder)}>
                  <Printer className="w-4 h-4 shrink-0" /><span>Print</span>
                </Button>
                <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2" onClick={() => handleDownload(detailOrder)}>
                  <Download className="w-4 h-4 shrink-0" /><span>PDF</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingPage;

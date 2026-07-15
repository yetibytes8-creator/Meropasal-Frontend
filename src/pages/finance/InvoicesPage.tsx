import { useState } from "react";
import { invoices as invoicesApi, type ApiInvoice, type ApiInvoiceItem } from "@/lib/api";
import { useList } from "@/hooks/use-data";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, FileText, Search, X } from "lucide-react";
import StatCard from "@/components/StatCard";

const STATUS_COLORS: Record<ApiInvoice["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/10 text-info border-info/20",
  paid: "bg-success/10 text-success border-success/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
};

type ItemForm = { description: string; quantity: string; rate: string };

const emptyItem = (): ItemForm => ({ description: "", quantity: "1", rate: "" });

const InvoicesPage = () => {
  const [invoiceList, setInvoiceList] = useList(() => invoicesApi.list());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<ApiInvoice | null>(null);
  const [editItem, setEditItem] = useState<ApiInvoice | null>(null);

  const [form, setForm] = useState({
    invoice_number: "", client_name: "", client_email: "", client_address: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "", status: "draft" as ApiInvoice["status"], notes: "", tax_rate: "0",
  });
  const [lineItems, setLineItems] = useState<ItemForm[]>([emptyItem()]);

  const filtered = invoiceList.filter((inv) => {
    const matchSearch = inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    return (filterStatus === "all" || inv.status === filterStatus) && matchSearch;
  });

  const totalOwed = invoiceList.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoiceList.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
  const overdueCount = invoiceList.filter((i) => i.status === "overdue").length;
  const filteredTotal = filtered.reduce((s, i) => s + Number(i.total), 0);

  const openAdd = () => {
    setEditItem(null);
    const nextNum = `INV-${String(invoiceList.length + 1).padStart(3, "0")}`;
    setForm({ invoice_number: nextNum, client_name: "", client_email: "", client_address: "", issue_date: new Date().toISOString().split("T")[0], due_date: "", status: "draft", notes: "", tax_rate: "0" });
    setLineItems([emptyItem()]);
    setDialogOpen(true);
  };

  const openEdit = (inv: ApiInvoice) => {
    setEditItem(inv);
    setForm({
      invoice_number: inv.invoice_number, client_name: inv.client_name, client_email: inv.client_email,
      client_address: inv.client_address, issue_date: inv.issue_date, due_date: inv.due_date,
      status: inv.status, notes: inv.notes, tax_rate: String(inv.tax_rate),
    });
    setLineItems(inv.items.map((i) => ({ description: i.description, quantity: String(i.quantity), rate: String(i.rate) })));
    setDialogOpen(true);
  };

  const subtotal = lineItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0), 0);
  const taxAmt = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
  const total = subtotal + taxAmt;

  const handleSave = async () => {
    if (!form.client_name.trim()) { toast.error("Client name is required"); return; }
    if (!form.due_date) { toast.error("Due date is required"); return; }
    if (lineItems.every((i) => !i.description.trim())) { toast.error("Add at least one line item"); return; }
    const validItems = lineItems.filter((i) => i.description.trim());
    try {
      const payload = {
        invoice_number: form.invoice_number, client_name: form.client_name.trim(),
        client_email: form.client_email.trim(), client_address: form.client_address.trim(),
        issue_date: form.issue_date, due_date: form.due_date, status: form.status,
        notes: form.notes.trim(), tax_rate: parseFloat(form.tax_rate) || 0,
        items: validItems.map((i) => ({ description: i.description.trim(), quantity: parseFloat(i.quantity) || 1, rate: parseFloat(i.rate) || 0 })),
      };
      if (editItem) {
        const updated = await invoicesApi.update(editItem.id, payload);
        setInvoiceList((prev) => prev.map((inv) => inv.id === editItem.id ? updated : inv));
        toast.success("Invoice updated");
      } else {
        const created = await invoicesApi.create(payload);
        setInvoiceList((prev) => [created, ...prev]);
        toast.success("Invoice created");
      }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleDelete = async (id: number) => {
    try {
      await invoicesApi.delete(id);
      setInvoiceList((prev) => prev.filter((i) => i.id !== id));
      toast.success("Invoice deleted");
    } catch (err) { toast.error((err as Error).message); }
  };

  const quickStatus = async (inv: ApiInvoice, newStatus: ApiInvoice["status"]) => {
    try {
      const updated = await invoicesApi.update(inv.id, { status: newStatus });
      setInvoiceList((prev) => prev.map((i) => i.id === inv.id ? updated : i));
      if (viewInvoice?.id === inv.id) setViewInvoice(updated);
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Invoices</h1>
          <p className="page-description">Create and track client invoices</p>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Invoice</span>
        </Button>
      </div>

      <FinanceStatementHeader
        title="Invoice Register"
        subtitle="Client invoices, receivable status, and collection totals"
        periodLabel="Current invoice records"
        reportNo="INV-REGISTER"
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Receivable" value={`Rs. ${totalOwed.toLocaleString()}`} icon={<FileText className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
        <StatCard title="Collected" value={`Rs. ${totalPaid.toLocaleString()}`} icon={<FileText className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="Overdue" value={overdueCount} icon={<FileText className="w-5 h-5" />} iconClassName="bg-destructive/10 text-destructive" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No invoices found</p></div>
        ) : filtered.map((inv) => (
          <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewInvoice(inv)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</p>
                  <p className="font-medium text-sm">{inv.client_name}</p>
                  <p className="text-xs text-muted-foreground">Due {inv.due_date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">Rs. {Number(inv.total).toLocaleString()}</p>
                  <Badge variant="outline" className={`text-xs mt-1 ${STATUS_COLORS[inv.status]}`}>{inv.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{inv.invoice_number}</TableCell>
                  <TableCell className="font-medium text-sm">{inv.client_name}</TableCell>
                  <TableCell className="text-sm">{inv.issue_date}</TableCell>
                  <TableCell className="text-sm">{inv.due_date}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${STATUS_COLORS[inv.status]}`}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">Rs. {Number(inv.total).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewInvoice(inv)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(inv)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(inv.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>Total Invoice Value</TableCell>
                  <TableCell className="text-right">Rs. {filteredTotal.toLocaleString()}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Invoice detail dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
          {viewInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="font-mono">{viewInvoice.invoice_number}</span>
                  <Badge variant="outline" className={STATUS_COLORS[viewInvoice.status]}>{viewInvoice.status}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-sm">{viewInvoice.client_name}</p>
                  {viewInvoice.client_email && <p className="text-xs text-muted-foreground">{viewInvoice.client_email}</p>}
                  {viewInvoice.client_address && <p className="text-xs text-muted-foreground">{viewInvoice.client_address}</p>}
                </div>
                <div className="flex gap-6 text-sm">
                  <div><p className="text-xs text-muted-foreground">Issued</p><p>{viewInvoice.issue_date}</p></div>
                  <div><p className="text-xs text-muted-foreground">Due</p><p>{viewInvoice.due_date}</p></div>
                </div>
                <Separator />
                <div className="space-y-2">
                  {viewInvoice.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.description} <span className="text-muted-foreground text-xs">×{item.quantity}</span></span>
                      <span>Rs. {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {Number(viewInvoice.subtotal).toLocaleString()}</span></div>
                  {Number(viewInvoice.tax_rate) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({viewInvoice.tax_rate}%)</span><span>Rs. {Number(viewInvoice.tax_amount).toLocaleString()}</span></div>}
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span>Rs. {Number(viewInvoice.total).toLocaleString()}</span></div>
                </div>
                {viewInvoice.notes && <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">{viewInvoice.notes}</p>}
                {viewInvoice.status === "draft" && (
                  <Button className="w-full" onClick={() => quickStatus(viewInvoice, "sent")}>Mark as Sent</Button>
                )}
                {viewInvoice.status === "sent" && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => quickStatus(viewInvoice, "paid")}>Mark Paid</Button>
                    <Button variant="outline" className="flex-1 text-destructive" onClick={() => quickStatus(viewInvoice, "overdue")}>Mark Overdue</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Invoice #</Label>
                <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ApiInvoice["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft","sent","paid","overdue","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Client Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Company or person name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Client Email</Label>
                <Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tax Rate (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Issue Date</Label>
                <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Due Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Line Items</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setLineItems([...lineItems, emptyItem()])}>
                  <Plus className="w-3 h-3" />Add Item
                </Button>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input className="flex-1" placeholder="Description" value={item.description} onChange={(e) => setLineItems(lineItems.map((li, i) => i === idx ? { ...li, description: e.target.value } : li))} />
                  <Input className="w-16" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => setLineItems(lineItems.map((li, i) => i === idx ? { ...li, quantity: e.target.value } : li))} />
                  <Input className="w-24" type="number" min="0" step="0.01" placeholder="Rate" value={item.rate} onChange={(e) => setLineItems(lineItems.map((li, i) => i === idx ? { ...li, rate: e.target.value } : li))} />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-1">
                <span>Total: Rs. {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                {Number(form.tax_rate) > 0 && <span className="text-muted-foreground text-xs">incl. {form.tax_rate}% tax</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea placeholder="Payment terms, thank you note…" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave}>{editItem ? "Save Changes" : "Create Invoice"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;

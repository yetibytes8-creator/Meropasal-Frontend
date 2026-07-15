import { useState } from "react";
import { income as incomeApi, type ApiIncome } from "@/lib/api";
import { useList } from "@/hooks/use-data";
import StatCard from "@/components/StatCard";
import FinanceStatementHeader from "@/components/FinanceStatementHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, TrendingUp, Banknote, Search } from "lucide-react";

const CATEGORY_LABELS: Record<ApiIncome["category"], string> = {
  sales: "Sales Revenue", service: "Service Income", rental: "Rental Income",
  investment: "Investment", refund: "Refund Received", other: "Other",
};

const CATEGORY_COLORS: Record<ApiIncome["category"], string> = {
  sales: "bg-success/10 text-success border-success/20",
  service: "bg-info/10 text-info border-info/20",
  rental: "bg-finance/10 text-finance border-finance/20",
  investment: "bg-warning/10 text-warning border-warning/20",
  refund: "bg-primary/10 text-primary border-primary/20",
  other: "bg-muted text-muted-foreground",
};

const emptyForm = { category: "sales" as ApiIncome["category"], description: "", amount: "", date: new Date().toISOString().split("T")[0], reference: "" };

const IncomePage = () => {
  const [entries, setEntries] = useList(() => incomeApi.list());
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ApiIncome | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = entries.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || e.reference.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = entries.filter((e) => e.date.startsWith(thisMonth)).reduce((s, e) => s + Number(e.amount), 0);
  const total = entries.reduce((s, e) => s + Number(e.amount), 0);
  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: ApiIncome) => {
    setEditItem(e);
    setForm({ category: e.category, description: e.description, amount: String(e.amount), date: e.date, reference: e.reference });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      if (editItem) {
        const updated = await incomeApi.update(editItem.id, {
          category: form.category, description: form.description.trim(),
          amount: parseFloat(form.amount), date: form.date, reference: form.reference.trim(),
        });
        setEntries((prev) => prev.map((e) => e.id === editItem.id ? updated : e));
        toast.success("Income updated");
      } else {
        const created = await incomeApi.create({
          category: form.category, description: form.description.trim(),
          amount: parseFloat(form.amount), date: form.date, reference: form.reference.trim(),
        });
        setEntries((prev) => [created, ...prev]);
        toast.success("Income added");
      }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await incomeApi.delete(deleteId);
      setEntries((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success("Entry deleted");
    } catch (err) { toast.error((err as Error).message); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Income</h1>
          <p className="page-description">Track all income sources and receipts</p>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Income</span>
        </Button>
      </div>

      <FinanceStatementHeader
        title="Income Register"
        subtitle="Income receipts and source-wise collection details"
        periodLabel="Current income records"
        reportNo="INC-REGISTER"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard title="This Month" value={`Rs. ${monthTotal.toLocaleString()}`} icon={<Banknote className="w-5 h-5" />} iconClassName="bg-finance/10 text-finance" />
        <StatCard title="All Time" value={`Rs. ${total.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search income…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No income entries found</p>
          </div>
        ) : filtered.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.date}{e.reference && ` · ${e.reference}`}</p>
                  <Badge variant="outline" className={`mt-1 text-xs ${CATEGORY_COLORS[e.category]}`}>{CATEGORY_LABELS[e.category]}</Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-success">+Rs. {Number(e.amount).toLocaleString()}</p>
                  <div className="flex gap-1 mt-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
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
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No income entries found</TableCell></TableRow>
              ) : filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.date}</TableCell>
                  <TableCell className="font-medium text-sm">{e.description}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[e.category]}`}>{CATEGORY_LABELS[e.category]}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.reference || "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-success">+Rs. {Number(e.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>Total Income</TableCell>
                  <TableCell className="text-right text-success">Rs. {filteredTotal.toLocaleString()}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} Income</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ApiIncome["category"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description <span className="text-destructive">*</span></Label>
              <Textarea placeholder="What was this income for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Amount (Rs. ) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reference / Invoice #</Label>
              <Input placeholder="INV-001, Receipt #123…" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave}>{editItem ? "Save Changes" : "Add Income"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete income entry?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IncomePage;

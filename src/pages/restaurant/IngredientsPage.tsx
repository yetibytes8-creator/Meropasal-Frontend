import { useState } from "react";
import { ingredients as ingredientsApi } from "@/lib/api";
import { fromApiIngredient } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, PackagePlus, Boxes, Save, AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Ingredient } from "@/types";

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

const getStockStatus = (item: Ingredient): Exclude<StockFilter, "all"> => {
  if (item.stock <= 0) return "out_of_stock";
  if (item.stock <= item.minStock) return "low_stock";
  return "in_stock";
};

const stockLabel: Record<Exclude<StockFilter, "all">, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const IngredientsPage = () => {
  const [ingredients, setIngredients] = useList(() =>
    ingredientsApi.list().then((r) => r.map(fromApiIngredient))
  );

  const [search, setSearch] = useState("");
  const [filterStockStatus, setFilterStockStatus] = useState<StockFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Ingredient | null>(null);
  const [form, setForm] = useState({ name: "", unit: "", stock: "", minStock: "" });

  const [restockItem, setRestockItem] = useState<Ingredient | null>(null);
  const [restockQty, setRestockQty] = useState("");

  const filtered = ingredients.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesStock = filterStockStatus === "all" || getStockStatus(i) === filterStockStatus;
    return matchesSearch && matchesStock;
  });
  const stockSummary = {
    total: ingredients.length,
    inStock: ingredients.filter((i) => getStockStatus(i) === "in_stock").length,
    lowStock: ingredients.filter((i) => getStockStatus(i) === "low_stock").length,
    outOfStock: ingredients.filter((i) => getStockStatus(i) === "out_of_stock").length,
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", unit: "", stock: "", minStock: "" });
    setDialogOpen(true);
  };

  const openEdit = (i: Ingredient) => {
    setEditItem(i);
    setForm({ name: i.name, unit: i.unit, stock: String(i.stock), minStock: String(i.minStock) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.unit.trim()) { toast.error("Unit is required"); return; }
    if (form.stock === "" || parseFloat(form.stock) < 0) { toast.error("Stock must be 0 or more"); return; }
    if (form.minStock === "" || parseFloat(form.minStock) < 0) { toast.error("Min stock must be 0 or more"); return; }
    try {
      if (editItem) {
        const updated = await ingredientsApi.update(Number(editItem.id), {
          name: form.name, unit: form.unit,
          stock: parseFloat(form.stock), min_stock: parseFloat(form.minStock),
        });
        setIngredients((prev) => prev.map((i) => i.id === editItem.id ? fromApiIngredient(updated) : i));
        toast.success("Ingredient updated");
      } else {
        const created = await ingredientsApi.create({
          name: form.name, unit: form.unit,
          stock: parseFloat(form.stock), min_stock: parseFloat(form.minStock),
        });
        setIngredients((prev) => [...prev, fromApiIngredient(created)]);
        toast.success("Ingredient added");
      }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await ingredientsApi.delete(Number(id));
      setIngredients((prev) => prev.filter((i) => i.id !== id));
      toast.success("Ingredient deleted");
    } catch (err) { toast.error((err as Error).message); }
  };

  const openRestock = (i: Ingredient) => {
    setRestockItem(i);
    setRestockQty("");
  };

  const confirmRestock = async () => {
    if (!restockItem) return;
    const qty = parseFloat(restockQty);
    if (!restockQty || qty <= 0) { toast.error("Enter a quantity greater than 0"); return; }
    try {
      const updated = await ingredientsApi.update(Number(restockItem.id), { stock: restockItem.stock + qty });
      setIngredients((prev) => prev.map((i) => i.id === restockItem.id ? fromApiIngredient(updated) : i));
      toast.success(`Added ${qty} ${restockItem.unit} to ${restockItem.name}`);
      setRestockItem(null);
    } catch (err) { toast.error((err as Error).message); }
  };

  const stockBadge = (i: Ingredient) => {
    const status = getStockStatus(i);
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs",
          status === "out_of_stock" && "bg-destructive/10 text-destructive border-destructive/20",
          status === "low_stock" && "bg-warning/10 text-warning border-warning/20",
          status === "in_stock" && "bg-success/10 text-success border-success/20",
        )}
      >
        {stockLabel[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Restaurant Stock</h1>
          <p className="page-description">Manage ingredient inventory, restock levels, and low-stock alerts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="lg" className="shrink-0 px-4 sm:px-8">
              <Plus className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Add Stock Item</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
            <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} Stock Item</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Milk" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Unit <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. litre, kg, pcs" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Current Stock</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Min Stock</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleSave}>
                  <Save className="w-4 h-4" />{editItem ? "Save Changes" : "Add Stock Item"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Stock Items</p>
              <p className="mt-1 text-2xl font-bold">{stockSummary.total}</p>
            </div>
            <Boxes className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">In Stock</p>
              <p className="mt-1 text-2xl font-bold text-success">{stockSummary.inStock}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
              <p className="mt-1 text-2xl font-bold text-warning">{stockSummary.lowStock}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Out of Stock</p>
              <p className="mt-1 text-2xl font-bold text-destructive">{stockSummary.outOfStock}</p>
            </div>
            <CircleX className="h-5 w-5 text-destructive" />
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search stock items..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Select value={filterStockStatus} onValueChange={(value) => setFilterStockStatus(value as StockFilter)}>
        <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stock</SelectItem>
          <SelectItem value="in_stock">In Stock</SelectItem>
          <SelectItem value="low_stock">Low Stock</SelectItem>
          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
        </SelectContent>
      </Select>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No stock items found</p>
          </div>
        ) : filtered.map((i) => (
          <Card key={i.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{i.name}</p>
                  <p className="text-xs text-muted-foreground">Stock: {i.stock} {i.unit} · Min: {i.minStock} {i.unit}</p>
                </div>
                {stockBadge(i)}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openRestock(i)}>
                  <PackagePlus className="w-3.5 h-3.5" />Add Stock
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(i)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => handleDelete(i.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
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
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Min Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No stock items found
                  </TableCell>
                </TableRow>
              ) : filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium text-sm">{i.name}</TableCell>
                  <TableCell className="text-right text-sm">{i.stock} {i.unit}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{i.minStock} {i.unit}</TableCell>
                  <TableCell>{stockBadge(i)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openRestock(i)} title="Add stock">
                      <PackagePlus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openEdit(i)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => handleDelete(i.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!restockItem} onOpenChange={(o) => !o && setRestockItem(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full">
          <DialogHeader><DialogTitle>Add Stock — {restockItem?.name}</DialogTitle></DialogHeader>
          {restockItem && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Current stock: {restockItem.stock} {restockItem.unit}</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Quantity to add ({restockItem.unit})</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} autoFocus />
              </div>
              <Button className="w-full gap-2" onClick={confirmRestock}>
                <PackagePlus className="w-4 h-4" />Add Stock
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IngredientsPage;

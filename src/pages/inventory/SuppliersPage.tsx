import { useState } from "react";
import { suppliers as suppliersApi } from "@/lib/api";
import { fromApiSupplier } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import type { Supplier } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Phone, Mail, MapPin, Pencil, Trash2, Search, Package, Save, X } from "lucide-react";

const emptyForm = { name: "", phone: "", email: "", address: "" };

const SuppliersPage = () => {
  const [suppliersList, setSuppliersList] = useList(() =>
    suppliersApi.list().then((r) => r.map(fromApiSupplier))
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = suppliersList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Supplier name is required"); return; }
    if (!form.phone.trim() && !form.email.trim()) { toast.error("At least phone or email is required"); return; }
    try {
      if (editItem) {
        const updated = await suppliersApi.update(Number(editItem.id), {
          name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(),
        });
        setSuppliersList((prev) => prev.map((s) => s.id === editItem.id ? fromApiSupplier(updated) : s));
        toast.success(`${form.name} updated`);
      } else {
        const created = await suppliersApi.create({
          name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(),
        });
        setSuppliersList((prev) => [fromApiSupplier(created), ...prev]);
        toast.success(`${form.name} added`);
      }
    } catch (err) { toast.error((err as Error).message); return; }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const s = suppliersList.find((x) => x.id === deleteId)!;
    try { await suppliersApi.delete(Number(deleteId)); } catch { /* ignore */ }
    setSuppliersList((prev) => prev.filter((x) => x.id !== deleteId));
    toast.success(`${s.name} removed`);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Suppliers</h1>
          <p className="page-description">Manage your product suppliers and contacts</p>
        </div>
        <Button className="h-11 shrink-0 rounded-xl px-4 font-semibold shadow-sm sm:px-5" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Supplier cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No suppliers found</p>
          <p className="text-sm mt-1">Add your first supplier to get started.</p>
          <Button className="mt-4 h-11 rounded-xl gap-2 px-5" onClick={openAdd}>
            <Plus className="w-4 h-4" />Add Supplier
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{supplier.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Package className="w-3 h-3 mr-1" />
                    {supplier.products.length} product{supplier.products.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2 text-sm">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                    <span className="line-clamp-1">{supplier.address}</span>
                  </div>
                )}
                {!supplier.phone && !supplier.email && !supplier.address && (
                  <p className="text-xs text-muted-foreground italic">No contact info</p>
                )}
              </CardContent>

              <CardFooter className="pt-3 border-t flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 flex-1 rounded-xl gap-2"
                  onClick={() => openEdit(supplier)}
                >
                  <Pencil className="w-3.5 h-3.5" />Edit
                </Button>
                <Button
                  variant="outline"
                  className="h-10 flex-1 rounded-xl gap-2 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                  onClick={() => setDeleteId(supplier.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {editItem ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. ABC Traders"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-muted-foreground" />Phone
                </Label>
                <Input
                  placeholder="+977-98XXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-muted-foreground" />Email
                </Label>
                <Input
                  type="email"
                  placeholder="supplier@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-muted-foreground" />Address
              </Label>
              <Input
                placeholder="City, Street…"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto gap-2">
                <X className="w-4 h-4" />Cancel
              </Button>
              <Button onClick={handleSave} className="w-full sm:flex-1 gap-2">
                <Save className="w-4 h-4" />
                {editItem ? "Save Changes" : "Add Supplier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{suppliersList.find((s) => s.id === deleteId)?.name}</strong> will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuppliersPage;

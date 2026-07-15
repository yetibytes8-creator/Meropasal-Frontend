import { useState } from "react";
import { customers as customersApi } from "@/lib/api";
import { fromApiCustomer } from "@/lib/transforms";
import { useList } from "@/hooks/use-data";
import type { Customer } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatCard from "@/components/StatCard";
import { toast } from "sonner";
import { Search, Users, Crown, Star, TrendingUp, Plus, Pencil, Trash2, Save, X, UserPlus } from "lucide-react";

const tierColors: Record<Customer["tier"], string> = {
  bronze: "bg-orange-100 text-orange-700 border-orange-200",
  silver: "bg-muted text-muted-foreground",
  gold: "bg-warning/10 text-warning border-warning/20",
  platinum: "bg-primary/10 text-primary border-primary/20",
};

const emptyForm = { name: "", email: "", phone: "", tier: "bronze" as Customer["tier"] };

const CustomersPage = () => {
  const [customersList, setCustomersList] = useList(() =>
    customersApi.list().then((r) => r.map(fromApiCustomer))
  );
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = customersList.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? "").toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search);
    const matchTier = filterTier === "all" || c.tier === filterTier;
    return matchSearch && matchTier;
  });

  const totalCustomers = customersList.length;
  const totalRevenue = customersList.reduce((s, c) => s + c.totalSpent, 0);
  const totalPoints = customersList.reduce((s, c) => s + c.loyaltyPoints, 0);
  const platinumCount = customersList.filter((c) => c.tier === "platinum").length;

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditItem(c);
    setForm({ name: c.name, email: c.email, phone: c.phone, tier: c.tier });
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    const today = new Date().toISOString().split("T")[0];
    try {
      if (editItem) {
        const updated = await customersApi.update(Number(editItem.id), {
          name: form.name.trim(), email: form.email.trim(),
          phone: form.phone.trim(), tier: form.tier,
        });
        setCustomersList((prev) => prev.map((c) => c.id === editItem.id ? fromApiCustomer(updated) : c));
        toast.success(`${form.name} updated`);
      } else {
        const created = await customersApi.create({
          name: form.name.trim(), email: form.email.trim(),
          phone: form.phone.trim(), tier: form.tier,
          total_spent: 0, total_orders: 0, loyalty_points: 0,
          join_date: today, last_visit: today,
        });
        setCustomersList((prev) => [fromApiCustomer(created), ...prev]);
        toast.success(`${form.name} added`);
      }
    } catch (err) { toast.error((err as Error).message); return; }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const c = customersList.find((x) => x.id === deleteId)!;
    try {
      await customersApi.delete(Number(deleteId));
      setCustomersList((prev) => prev.filter((x) => x.id !== deleteId));
      toast.success(`${c.name} removed`);
    } catch (err) { toast.error((err as Error).message); }
    setDeleteId(null);
    if (selectedCustomer?.id === deleteId) setSelectedCustomer(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Customers</h1>
          <p className="page-description">Customer database, loyalty tracking, and insights</p>
        </div>
        <Button className="h-11 shrink-0 rounded-xl px-4 font-semibold shadow-sm sm:px-5" onClick={openAdd}>
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Customers" value={totalCustomers} icon={<Users className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard title="Total Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="Loyalty Points" value={totalPoints.toLocaleString()} icon={<Star className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Platinum Members" value={platinumCount} icon={<Crown className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No customers found</p>
            <Button variant="outline" className="mt-4 h-11 rounded-xl gap-2 px-5" onClick={openAdd}>
              <Plus className="w-4 h-4" />Add Customer
            </Button>
          </div>
        ) : filtered.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{c.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0" onClick={() => setSelectedCustomer(c)}>
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`${tierColors[c.tier]} text-xs`}>{c.tier}</Badge>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">Rs. {c.totalSpent.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{c.totalOrders} orders</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2" onClick={() => openEdit(c)}>
                  <Pencil className="w-3.5 h-3.5" />Edit
                </Button>
                <Button variant="outline" className="h-10 flex-1 rounded-xl gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />Delete
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
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No customers found
                  </TableCell>
                </TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{c.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.phone}</TableCell>
                  <TableCell><Badge variant="outline" className={tierColors[c.tier]}>{c.tier}</Badge></TableCell>
                  <TableCell className="text-right font-semibold text-sm">Rs. {c.totalSpent.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm">{c.totalOrders}</TableCell>
                  <TableCell className="text-right text-sm">{c.loyaltyPoints.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{c.lastVisit}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          {selectedCustomer && (
            <>
              <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 sm:w-16 sm:h-16 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">{selectedCustomer.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">{selectedCustomer.name}</h3>
                    <Badge variant="outline" className={tierColors[selectedCustomer.tier]}>{selectedCustomer.tier} member</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium text-xs sm:text-sm break-all">{selectedCustomer.email}</p></div>
                  <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium text-xs sm:text-sm">{selectedCustomer.phone || "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Member Since</p><p className="font-medium text-xs sm:text-sm">{selectedCustomer.joinDate}</p></div>
                  <div><p className="text-muted-foreground text-xs">Last Visit</p><p className="font-medium text-xs sm:text-sm">{selectedCustomer.lastVisit}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-xs text-muted-foreground">Spent</p><p className="font-bold text-sm sm:text-lg">Rs. {selectedCustomer.totalSpent.toLocaleString()}</p></CardContent></Card>
                  <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-xs text-muted-foreground">Orders</p><p className="font-bold text-sm sm:text-lg">{selectedCustomer.totalOrders}</p></CardContent></Card>
                  <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-xs text-muted-foreground">Points</p><p className="font-bold text-sm sm:text-lg">{selectedCustomer.loyaltyPoints.toLocaleString()}</p></CardContent></Card>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => openEdit(selectedCustomer)}>
                    <Pencil className="w-4 h-4" />Edit
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => { setDeleteId(selectedCustomer.id); setSelectedCustomer(null); }}>
                    <Trash2 className="w-4 h-4" />Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {editItem ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Ramesh Shrestha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <Input placeholder="+977-98XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Loyalty Tier</Label>
              <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v as Customer["tier"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto gap-2">
                <X className="w-4 h-4" />Cancel
              </Button>
              <Button onClick={handleSave} className="w-full sm:flex-1 gap-2">
                <Save className="w-4 h-4" />
                {editItem ? "Save Changes" : "Add Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove customer?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{customersList.find((c) => c.id === deleteId)?.name}</strong> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomersPage;


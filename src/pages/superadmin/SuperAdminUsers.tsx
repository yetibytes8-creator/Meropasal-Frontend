import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { superAdmin, type SuperAdminClient } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus, Search, Users, UserCheck, UserX, Shield,
  Pencil, Trash2, Eye, Ban, CheckCircle2, Building2,
  Mail, Calendar, RefreshCw, Coffee, Package, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

const planIcon: Record<string, React.ElementType> = { cafe: Coffee, inventory: Package, combo: LayoutGrid };

const statusColor: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  trial:     "bg-green-500/15 text-green-400 border-green-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
  expired:   "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-slate-600/30 text-slate-400 border-slate-600/40",
};

export default function SuperAdminUsers() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<SuperAdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [viewClient, setViewClient] = useState<SuperAdminClient | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setClients(await superAdmin.listClients());
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      const matchSearch = !q || c.business_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.contact_person || "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || c.status === filterStatus;
      const matchModule = filterModule === "all" || c.plan_module === filterModule;
      return matchSearch && matchStatus && matchModule;
    });
  }, [clients, search, filterStatus, filterModule]);

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    trial: clients.filter((c) => c.status === "trial").length,
    inactive: clients.filter((c) => ["suspended", "expired", "cancelled"].includes(c.status)).length,
  };

  const toggleStatus = async (client: SuperAdminClient) => {
    const next = client.status === "active" ? "suspended" : "active";
    try {
      const updated = await superAdmin.updateClient(client.id, { status: next });
      setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      if (viewClient?.id === updated.id) setViewClient(updated);
      toast.success(`${client.business_name} is now ${next}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const c = clients.find((x) => x.id === deleteId)!;
    try {
      await superAdmin.deleteClient(deleteId);
      setClients((prev) => prev.filter((x) => x.id !== deleteId));
      toast.success(`${c.business_name} removed`);
      if (viewClient?.id === deleteId) setViewClient(null);
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setDeleteId(null);
    }
  };

  const initials = (c: SuperAdminClient) =>
    (c.contact_person || c.business_name).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Clients</h1>
          <p className="text-slate-400 mt-1 text-sm">All registered client companies on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={load} className="text-slate-400 hover:text-white hover:bg-slate-800">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => navigate("/super-admin/companies")} className="bg-green-600 hover:bg-green-500 text-white gap-2 shrink-0" size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Client</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Clients", value: stats.total, color: "text-green-400", bg: "bg-green-500/10", icon: Users },
          { label: "Active", value: stats.active, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: UserCheck },
          { label: "Trial", value: stats.trial, color: "text-green-400", bg: "bg-green-500/10", icon: Shield },
          { label: "Inactive", value: stats.inactive, color: "text-slate-400", bg: "bg-slate-700/50", icon: UserX },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg} shrink-0`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, or contact…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-green-500"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 sm:w-36 bg-slate-900 border-slate-700 text-slate-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="flex-1 sm:w-36 bg-slate-900 border-slate-700 text-slate-300">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="cafe">Restaurant</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="combo">Combo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-slate-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No clients found</p></div>
        ) : filtered.map((c) => {
          const Icon = planIcon[c.plan_module ?? ""] ?? Building2;
          return (
            <Card key={c.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-600/20 flex items-center justify-center shrink-0 text-sm font-bold text-green-400">
                    {initials(c)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{c.business_name}</p>
                        <p className="text-xs text-slate-400 truncate">{c.email}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0 border capitalize", statusColor[c.status] ?? "")}>{c.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-400 capitalize">{c.plan_name ?? c.plan_module}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setViewClient(c)}><Eye className="w-3.5 h-3.5" />View</Button>
                  <Button size="sm" variant="outline" className={cn("h-8 text-xs", c.status === "active" ? "border-red-800/50 text-red-400 hover:bg-red-500/10" : "border-emerald-800/50 text-emerald-400 hover:bg-emerald-500/10")} onClick={() => toggleStatus(c)}>
                    {c.status === "active" ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-red-900/50 text-red-400 hover:bg-red-500/10" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Company</TableHead>
              <TableHead className="text-slate-400">Contact</TableHead>
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Expires</TableHead>
              <TableHead className="text-slate-400">Users</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-12"><RefreshCw className="w-6 h-6 mx-auto animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-12"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" />No clients found</TableCell></TableRow>
            ) : filtered.map((c) => {
              const Icon = planIcon[c.plan_module ?? ""] ?? Building2;
              return (
                <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center shrink-0 text-xs font-bold text-green-400">{initials(c)}</div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm">{c.business_name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{c.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-300">{c.contact_person || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[120px]">{c.plan_name ?? c.plan_module}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-xs capitalize border", statusColor[c.status] ?? "")}>{c.status}</Badge></TableCell>
                  <TableCell className="text-sm text-slate-400">{c.expires_at ? c.expires_at.split("T")[0] : "—"}</TableCell>
                  <TableCell className="text-sm text-slate-400">{c.active_users}/{c.max_users}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => setViewClient(c)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => navigate("/super-admin/companies")}><Pencil className="w-3.5 h-3.5" /></Button>
                      {c.status === "active" ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Suspend" onClick={() => toggleStatus(c)}><Ban className="w-3.5 h-3.5" /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" title="Activate" onClick={() => toggleStatus(c)}><CheckCircle2 className="w-3.5 h-3.5" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewClient} onOpenChange={(o) => !o && setViewClient(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Client Details</DialogTitle></DialogHeader>
          {viewClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-600/20 flex items-center justify-center text-xl font-bold text-green-400 shrink-0">
                  {initials(viewClient)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{viewClient.business_name}</h3>
                  <Badge variant="outline" className={cn("text-xs capitalize border mt-1", statusColor[viewClient.status] ?? "")}>{viewClient.status}</Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { icon: Mail, label: viewClient.email },
                  { icon: Building2, label: viewClient.contact_person || "No contact" },
                  { icon: Calendar, label: `Created: ${viewClient.created_at?.split("T")[0] ?? "—"}` },
                  { icon: Calendar, label: `Expires: ${viewClient.expires_at?.split("T")[0] ?? "—"}` },
                ].map(({ icon: Icon, label }, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-300">
                    <Icon className="w-4 h-4 text-slate-500 shrink-0" /><span className="truncate">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                {viewClient.status === "active" ? (
                  <Button variant="outline" className="border-red-800/50 text-red-400 hover:bg-red-500/10 gap-2" onClick={() => toggleStatus(viewClient)}>
                    <Ban className="w-4 h-4" />Suspend
                  </Button>
                ) : (
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2" onClick={() => toggleStatus(viewClient)}>
                    <CheckCircle2 className="w-4 h-4" />Activate
                  </Button>
                )}
                <Button variant="outline" className="border-red-900/50 text-red-400 hover:bg-red-500/10 gap-2" onClick={() => { setDeleteId(viewClient.id); setViewClient(null); }}>
                  <Trash2 className="w-4 h-4" />Remove Client
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove client?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently remove <strong className="text-white">{clients.find((c) => c.id === deleteId)?.business_name}</strong> and all their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-0">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


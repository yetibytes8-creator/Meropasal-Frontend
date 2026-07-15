import { useEffect, useMemo, useState } from "react";
import { users as usersApi, logs as logsApi, type ApiProfile } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, ShieldCheck, ShieldOff } from "lucide-react";

type SortKey = "full_name" | "role" | "created_at";

export default function AdminUsers() {
  const [userList, setUserList] = useState<ApiProfile[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = () => usersApi.list().then(setUserList).catch(() => toast.error("Failed to load users"));
  useEffect(() => { load(); }, []);

  const toggleRole = async (u: ApiProfile) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await usersApi.update(u.id, { role: newRole });
      await logsApi.create({
        action_type: newRole === "admin" ? "promote_to_admin" : "demote_to_user",
        entity_type: "profile", entity_id: String(u.id),
        target_user_id: u.user_id, target_user_name: u.full_name,
        old_value: u.role, new_value: newRole, details: null,
      });
      toast.success(`Role updated to ${newRole}`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = userList.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (u.full_name || "").toLowerCase().includes(q) || String(u.user_id).includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return rows;
  }, [userList, search, roleFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">{filtered.length} of {userList.length} users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or user ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="flex-1 sm:w-36 sm:flex-none"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="flex-1 sm:w-28 sm:flex-none"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        {paged.length === 0
          ? <p className="text-center text-muted-foreground py-8">No users match your filters</p>
          : paged.map((u) => (
            <div key={u.id} className="rounded-lg border bg-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                {(u.full_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{String(u.user_id).slice(0, 12)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => toggleRole(u)}>
                  {u.role === "admin" ? <ShieldOff className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  {u.role === "admin" ? "Demote" : "Promote"}
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("full_name")}>Name<SortIcon k="full_name" /></TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("role")}>Role<SortIcon k="role" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>Joined<SortIcon k="created_at" /></TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0
              ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users match your filters</TableCell></TableRow>
              : paged.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toggleRole(u)}>
                      {u.role === "admin"
                        ? <><ShieldOff className="w-3.5 h-3.5 shrink-0" /><span>Demote</span></>
                        : <><ShieldCheck className="w-3.5 h-3.5 shrink-0" /><span>Promote</span></>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={(e) => { e.preventDefault(); setPage(Math.max(1, currentPage - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
            <PaginationItem><PaginationLink isActive>{currentPage} / {totalPages}</PaginationLink></PaginationItem>
            <PaginationItem>
              <PaginationNext onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, currentPage + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

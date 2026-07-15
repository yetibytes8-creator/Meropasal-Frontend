import { useEffect, useMemo, useState } from "react";
import { payments as paymentsApi, type ApiPayment } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_STATUSES = ["pending", "succeeded", "paid", "failed", "refunded", "cancelled"];
type SortKey = "created_at" | "amount" | "status" | "provider";

export default function AdminPayments() {
  const [paymentList, setPaymentList] = useState<ApiPayment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = () => paymentsApi.list().then(setPaymentList).catch(() => toast.error("Failed to load payments"));
  useEffect(() => { load(); }, []);

  const providers = useMemo(() => Array.from(new Set(paymentList.map((p) => p.provider))).filter(Boolean), [paymentList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = paymentList.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (providerFilter !== "all" && p.provider !== providerFilter) return false;
      if (!q) return true;
      return String(p.user_id).includes(q) || p.provider.toLowerCase().includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const av = sortKey === "amount" ? Number(a[sortKey]) : String(a[sortKey]);
      const bv = sortKey === "amount" ? Number(b[sortKey]) : String(b[sortKey]);
      // @ts-expect-error mixed types
      return sortDir === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
    return rows;
  }, [paymentList, search, statusFilter, providerFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const updateStatus = async (p: ApiPayment, v: string) => {
    try {
      await paymentsApi.update(p.id, { status: v });
      toast.success("Payment status updated");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">{filtered.length} of {paymentList.length} payment records</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by user ID or provider..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 min-w-[110px] sm:w-36 sm:flex-none"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="flex-1 min-w-[110px] sm:w-36 sm:flex-none"><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {providers.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="flex-1 min-w-[90px] sm:w-28 sm:flex-none"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>Date<SortIcon k="created_at" /></TableHead>
              <TableHead>User</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("provider")}>Provider<SortIcon k="provider" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("amount")}>Amount<SortIcon k="amount" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>Status<SortIcon k="status" /></TableHead>
              <TableHead className="text-right">Change status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0
              ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments match your filters</TableCell></TableRow>
              : paged.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">{String(p.user_id).slice(0, 8)}...</TableCell>
                  <TableCell className="capitalize">{p.provider}</TableCell>
                  <TableCell>{p.currency} {Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "succeeded" || p.status === "paid" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={p.status} onValueChange={(v) => updateStatus(p, v)}>
                      <SelectTrigger className="w-[140px] ml-auto"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

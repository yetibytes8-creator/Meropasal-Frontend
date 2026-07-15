import { useEffect, useMemo, useState } from "react";
import { logs as logsApi, type ApiLog } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ArrowUpDown, CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SortKey = "created_at" | "admin_name" | "action_type" | "entity_type" | "target_user_name";

export default function AdminActivityLogs() {
  const [logList, setLogList] = useState<ApiLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = () => logsApi.list().then(setLogList).catch(() => {/* ignore */});
  useEffect(() => { load(); }, []);

  const actions = useMemo(() => Array.from(new Set(logList.map((l) => l.action_type))), [logList]);
  const entities = useMemo(() => Array.from(new Set(logList.map((l) => l.entity_type))), [logList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)).getTime() : null;
    const toMs = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)).getTime() : null;
    let rows = logList.filter((l) => {
      if (actionFilter !== "all" && l.action_type !== actionFilter) return false;
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      const t = new Date(l.created_at).getTime();
      if (fromMs && t < fromMs) return false;
      if (toMs && t > toMs) return false;
      if (!q) return true;
      return (
        (l.admin_name || "").toLowerCase().includes(q) ||
        (l.target_user_name || "").toLowerCase().includes(q) ||
        (l.action_type || "").toLowerCase().includes(q)
      );
    });
    rows = [...rows].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return rows;
  }, [logList, search, actionFilter, entityFilter, fromDate, toDate, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}<ArrowUpDown className={cn("h-3 w-3", sortKey === k ? "text-foreground" : "text-muted-foreground/50")} />
    </button>
  );

  const actionVariant = (a: string): "default" | "secondary" | "destructive" | "outline" => {
    if (a.includes("promote") || a.includes("create")) return "default";
    if (a.includes("delete") || a.includes("demote")) return "destructive";
    if (a.includes("update") || a.includes("change")) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground">{filtered.length} of {logList.length} admin actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search admin, action, entity…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="flex-1 min-w-[120px] sm:w-44 sm:flex-none"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="flex-1 min-w-[100px] sm:w-36 sm:flex-none"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="flex-1 min-w-[90px] sm:w-28 sm:flex-none"><SelectValue /></SelectTrigger>
              <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2 font-normal", !fromDate && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 shrink-0" />{fromDate ? format(fromDate, "PPP") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2 font-normal", !toDate && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 shrink-0" />{toDate ? format(toDate, "PPP") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(undefined); setToDate(undefined); }} className="gap-1.5">
              <X className="h-4 w-4 shrink-0" /> Clear dates
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortBtn k="created_at" label="When" /></TableHead>
              <TableHead><SortBtn k="admin_name" label="Admin" /></TableHead>
              <TableHead><SortBtn k="action_type" label="Action" /></TableHead>
              <TableHead><SortBtn k="entity_type" label="Entity" /></TableHead>
              <TableHead><SortBtn k="target_user_name" label="Target" /></TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0
              ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No activity logged yet</TableCell></TableRow>
              : paged.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="font-medium">{l.admin_name || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{String(l.admin_id).slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell><Badge variant={actionVariant(l.action_type)}>{l.action_type}</Badge></TableCell>
                  <TableCell>
                    <div className="capitalize">{l.entity_type}</div>
                    {l.entity_id && <div className="text-xs text-muted-foreground font-mono">{l.entity_id.slice(0, 8)}...</div>}
                  </TableCell>
                  <TableCell>{l.target_user_name || (l.target_user_id ? <span className="font-mono text-xs">{String(l.target_user_id).slice(0, 8)}...</span> : "—")}</TableCell>
                  <TableCell>
                    {l.old_value || l.new_value
                      ? <span className="text-xs"><span className="text-muted-foreground line-through">{l.old_value || "—"}</span><span className="mx-1">→</span><span className="font-medium">{l.new_value || "—"}</span></span>
                      : <span className="text-xs text-muted-foreground">{JSON.stringify(l.details ?? {})}</span>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={(e) => { e.preventDefault(); setPage(Math.max(1, currentPage - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
            <PaginationItem><PaginationLink isActive>{currentPage} / {totalPages}</PaginationLink></PaginationItem>
            <PaginationItem><PaginationNext onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, currentPage + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

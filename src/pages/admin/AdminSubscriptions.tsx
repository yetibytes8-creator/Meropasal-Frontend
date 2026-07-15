import { useEffect, useState } from "react";
import { subscriptions as subsApi, type AdminSub } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_OPTIONS = ["trial", "active", "expired", "cancelled", "payment_pending"] as const;
type SubStatus = typeof STATUS_OPTIONS[number];

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "active") return "default";
  if (s === "trial") return "secondary";
  if (s === "expired" || s === "cancelled") return "destructive";
  return "outline";
}

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<AdminSub[]>([]);

  const load = () => subsApi.list().then(setSubs).catch(() => toast.error("Failed to load subscriptions"));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: SubStatus) => {
    try {
      await subsApi.update(id, { status });
      toast.success("Subscription updated");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">{subs.length} subscriptions</p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>End date</TableHead>
              <TableHead className="text-right">Change status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.length === 0
              ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions yet</TableCell></TableRow>
              : subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{String(s.user_id).slice(0, 8)}...</TableCell>
                  <TableCell>{s.plan?.name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{s.plan?.module_access}</Badge></TableCell>
                  <TableCell><Badge variant={statusVariant(s.status)}>{s.status}</Badge></TableCell>
                  <TableCell>{s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Select value={s.status} onValueChange={(v) => updateStatus(s.id, v as SubStatus)}>
                      <SelectTrigger className="w-[160px] ml-auto"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

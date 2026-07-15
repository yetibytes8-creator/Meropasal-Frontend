import { useEffect, useMemo, useState } from "react";
import { superAdmin, type ApiLog } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Building2, UserPlus, RefreshCw, Ban, Trash2, Banknote, Search, RotateCw } from "lucide-react";
import { toast } from "sonner";

const typeColor: Record<string, string> = {
  create_client:             "text-emerald-400 bg-emerald-500/10",
  delete_client:             "text-red-400 bg-red-500/10",
  change_subscription_status:"text-blue-400 bg-blue-500/10",
  change_payment_status:    "text-green-400 bg-green-500/10",
};

const typeIcon: Record<string, React.ElementType> = {
  create_client:             UserPlus,
  delete_client:             Trash2,
  change_subscription_status:RefreshCw,
  change_payment_status:    Banknote,
};

const typeLabels: Record<string, string> = {
  create_client:             "Client Created",
  delete_client:             "Client Deleted",
  change_subscription_status:"Subscription Updated",
  change_payment_status:    "Payment Updated",
};

const actionLabel = (entry: ApiLog) => typeLabels[entry.action_type] ?? entry.action_type;

export default function SuperAdminActivity() {
  const [activityLog, setActivityLog] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const load = () => {
    setLoading(true);
    superAdmin.activityLog().then(setActivityLog).catch(() => toast.error("Failed to load activity log")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return activityLog.filter((e) => {
      const matchSearch = !q || actionLabel(e).toLowerCase().includes(q) || (e.target_user_name ?? "").toLowerCase().includes(q);
      const matchType = filterType === "all" || e.action_type === filterType;
      return matchSearch && matchType;
    });
  }, [search, filterType, activityLog]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Activity Log</h1>
        <p className="text-slate-400 mt-1 text-sm">All super admin actions across companies</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by action or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="sm:w-44 bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="all">All Types</SelectItem>
            {Object.keys(typeLabels).map((t) => (
              <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={load} className="text-slate-400 hover:text-white hover:bg-slate-800 shrink-0">
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <p className="text-xs text-slate-600">{filtered.length} of {activityLog.length} entries</p>

      <div className="space-y-2">
        {!loading && filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No activity matches your filters</p>
          </div>
        ) : filtered.map((entry) => {
          const Icon = typeIcon[entry.action_type] ?? Activity;
          return (
            <Card key={entry.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor[entry.action_type] ?? "text-slate-400 bg-slate-500/10"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-white">{actionLabel(entry)}</p>
                        {entry.target_user_name && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {entry.target_user_name}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">by {entry.admin_name ?? "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                        <Badge variant="outline" className={`text-[10px] mt-1 border-0 capitalize ${typeColor[entry.action_type] ?? "text-slate-400 bg-slate-500/10"}`}>
                          {actionLabel(entry)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

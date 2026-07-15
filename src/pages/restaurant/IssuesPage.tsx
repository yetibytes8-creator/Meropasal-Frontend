import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";

type Issue = { id: string; title: string; area: string; priority: "low" | "medium" | "high"; status: "open" | "resolved"; description: string; date: string };
const STORAGE_KEY = "mero-pasal-issues";

function readIssues(): Issue[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>(readIssues);
  const [form, setForm] = useState({ title: "", area: "Kitchen", priority: "medium" as Issue["priority"], description: "" });

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(issues)), [issues]);

  const add = () => {
    if (!form.title || !form.description) {
      toast.error("Issue title and description required");
      return;
    }
    setIssues((prev) => [{ id: String(Date.now()), ...form, status: "open", date: new Date().toLocaleString() }, ...prev]);
    setForm({ title: "", area: "Kitchen", priority: "medium", description: "" });
    toast.success("Issue added");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
        <p className="text-muted-foreground">Track cafe problems, maintenance, customer complaints, and internal follow-ups</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-primary" />Add Issue</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Pick label="Area" value={form.area} onChange={(area) => setForm({ ...form, area })} items={["Kitchen", "Counter", "Delivery", "Table", "Stock", "Staff", "Customer"]} />
              <Pick label="Priority" value={form.priority} onChange={(priority: Issue["priority"]) => setForm({ ...form, priority })} items={["low", "medium", "high"]} />
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button className="w-full" onClick={add}><Plus className="mr-2 h-4 w-4" />Create Issue</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Issue List</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {issues.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No issues found</div>}
            {issues.map((issue) => (
              <div key={issue.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{issue.title}</h3>
                      <Badge variant="outline">{issue.area}</Badge>
                      <PriorityBadge priority={issue.priority} />
                      <Badge variant="secondary">{issue.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{issue.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{issue.date}</p>
                  </div>
                  {issue.status === "open" && <Button size="sm" variant="outline" onClick={() => setIssues((prev) => prev.map((item) => item.id === issue.id ? { ...item, status: "resolved" } : item))}><CheckCircle2 className="mr-1 h-4 w-4" />Resolve</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Pick<T extends string>({ label, value, onChange, items }: { label: string; value: T; onChange: (value: T) => void; items: T[] }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Issue["priority"] }) {
  const cls = priority === "high" ? "bg-destructive/10 text-destructive border-destructive/20" : priority === "medium" ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20";
  return <Badge variant="outline" className={cls}>{priority}</Badge>;
}

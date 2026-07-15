import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Branch = { id: string; location: string; admin: string; email: string; province: string; district: string; phone: string };
const STORAGE_KEY = "mero-pasal-branches";

function readBranches(): Branch[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return data.length ? data : [{ id: "primary", location: "Primary Branch", admin: "Owner", email: "", province: "Bagmati", district: "Kathmandu", phone: "" }];
  } catch {
    return [];
  }
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>(readBranches);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ location: "", admin: "", email: "", province: "", district: "", phone: "" });

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(branches)), [branches]);

  const addBranch = () => {
    if (!form.location || !form.admin || !form.email || !form.province || !form.district || !form.phone) {
      toast.error("All branch fields are required");
      return;
    }
    setBranches((prev) => [{ id: String(Date.now()), ...form }, ...prev]);
    setForm({ location: "", admin: "", email: "", province: "", district: "", phone: "" });
    setOpen(false);
    toast.success("Branch added");
  };

  const filtered = branches.filter((b) => `${b.location} ${b.admin} ${b.district}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">Add branches and track admin, contact, and location details</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Branch</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Branch</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <Field label="Branch Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
              <Field label="Branch Admin" value={form.admin} onChange={(v) => setForm({ ...form, admin: v })} />
              <Field label="Email ID" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Pick label="Province" value={form.province} onChange={(province) => setForm({ ...form, province })} items={["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"]} />
                <Field label="District" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
              </div>
              <Field label="Contact Number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={addBranch}>Add</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search branch..." className="pl-9" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((branch) => (
          <Card key={branch.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{branch.location}</span>
                {branch.id === "primary" && <Badge>Primary</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Admin:</span> {branch.admin}</p>
              <p><span className="text-muted-foreground">Email:</span> {branch.email || "Not set"}</p>
              <p><span className="text-muted-foreground">Phone:</span> {branch.phone || "Not set"}</p>
              <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{branch.district}, {branch.province}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label} *</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Pick({ label, value, onChange, items }: { label: string; value: string; onChange: (value: string) => void; items: string[] }) {
  return (
    <div className="space-y-2">
      <Label>{label} *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>{items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

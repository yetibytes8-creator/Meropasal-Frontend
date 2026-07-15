import { useState } from "react";
import type { Staff } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatCard from "@/components/StatCard";
import { Plus, Search, Users, UserCheck, UserX, Banknote, Pencil, Trash2, Save, X, Eye, EyeOff, KeyRound, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { ROLE_META, type StaffRole } from "@/lib/rbac";

type FormState = {
  name: string; email: string; phone: string;
  role: Staff["role"]; department: Staff["department"];
  salary: string; status: Staff["status"];
  password: string; confirmPassword: string;
};

const emptyForm: FormState = {
  name: "", email: "", phone: "",
  role: "staff", department: "both",
  salary: "", status: "active",
  password: "", confirmPassword: "",
};

const passwordStrength = (pw: string): { label: string; color: string; width: string } => {
  if (!pw) return { label: "", color: "", width: "0%" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "bg-destructive", width: "25%" };
  if (score === 2) return { label: "Fair", color: "bg-warning", width: "50%" };
  if (score === 3) return { label: "Good", color: "bg-info", width: "75%" };
  return { label: "Strong", color: "bg-success", width: "100%" };
};

const StaffPage = () => {
  const { allStaff: staff, addStaff, updateStaff, removeStaff } = useStaffAuth();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const filtered = staff.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || s.role === filterRole;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = staff.filter((s) => s.status === "active").length;
  const onLeaveCount = staff.filter((s) => s.status === "on-leave").length;
  const totalSalary = staff.filter((s) => s.status === "active").reduce((s, m) => s + m.salary, 0);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowPassword(false);
    setShowConfirm(false);
    setDialogOpen(true);
  };

  const openEdit = (m: Staff) => {
    setEditingId(m.id);
    setForm({ name: m.name, email: m.email, phone: m.phone, role: m.role, department: m.department, salary: String(m.salary), status: m.status, password: "", confirmPassword: "" });
    setSelectedStaff(null);
    setShowPassword(false);
    setShowConfirm(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || !form.salary) {
      toast.error("Name, email, and salary are required");
      return;
    }
    if (parseFloat(form.salary) <= 0) {
      toast.error("Salary must be greater than 0");
      return;
    }
    // Password is required for new staff; optional on edit (blank = keep existing)
    if (!editingId && !form.password) {
      toast.error("Password is required for new staff");
      return;
    }
    if (form.password) {
      if (form.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }
    if (editingId) {
      const existing = staff.find((s) => s.id === editingId)!;
      const updated: Staff = { ...existing, name: form.name, email: form.email, phone: form.phone, role: form.role, department: form.department, salary: parseFloat(form.salary), status: form.status };
      if (form.password) updated.password = form.password;
      updateStaff(updated);
      toast.success("Staff member updated");
    } else {
      const member: Staff = {
        id: `st${Date.now()}`,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        department: form.department,
        joinDate: new Date().toISOString().split("T")[0],
        salary: parseFloat(form.salary),
        status: form.status,
        password: form.password,
      };
      addStaff(member);
      toast.success("Staff member added");
    }
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    removeStaff(deleteId);
    toast.success("Staff member removed");
    setDeleteId(null);
    setSelectedStaff(null);
  };

  const statusBadge = (status: Staff["status"]) => {
    const styles: Record<string, string> = {
      active: "bg-success/10 text-success border-success/20",
      "on-leave": "bg-warning/10 text-warning border-warning/20",
      inactive: "bg-muted text-muted-foreground",
    };
    return <Badge variant="outline" className={styles[status]}>{status}</Badge>;
  };

  const roleBadge = (role: Staff["role"]) => {
    const meta = ROLE_META[role as StaffRole];
    const label = role === "staff" ? "Inv. Staff" : meta?.label ?? role;
    return <Badge variant="outline" className={meta?.color ?? "bg-secondary text-secondary-foreground"}>{label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Staff Management</h1>
          <p className="page-description">Manage employees, roles, and departments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="h-11 shrink-0 rounded-xl px-4 font-semibold shadow-sm sm:px-5">
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
            <DialogHeader><DialogTitle>{editingId ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+977-98..." /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Staff["role"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="staff">Inventory Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.role && (
                    <p className="text-xs text-muted-foreground">{ROLE_META[form.role as StaffRole]?.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v as Staff["department"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Salary (Rs. )</Label><Input type="number" inputMode="numeric" min="1" step="1" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="0" /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Staff["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Login credentials */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Login Credentials</p>
                  {editingId && <span className="text-xs text-muted-foreground">(leave blank to keep existing password)</span>}
                </div>
                <div className="space-y-2">
                  <Label>{editingId ? "New Password" : "Password"} {!editingId && <span className="text-destructive">*</span>}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingId ? "Enter new password to change" : "Min. 8 characters"}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && (() => {
                    const s = passwordStrength(form.password);
                    return (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${s.color}`} style={{ width: s.width }} />
                        </div>
                        <p className="text-xs text-muted-foreground">Strength: <span className="font-medium">{s.label}</span></p>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password {!editingId && <span className="text-destructive">*</span>}</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                  {form.password && form.confirmPassword && form.password === form.confirmPassword && (
                    <p className="text-xs text-success flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Passwords match</p>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto gap-2">
                  <X className="w-4 h-4 shrink-0" />Cancel
                </Button>
                <Button onClick={handleSave} className="w-full sm:w-auto gap-2">
                  <Save className="w-4 h-4 shrink-0" />{editingId ? "Save Changes" : "Add Staff Member"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Staff" value={staff.length} icon={<Users className="w-5 h-5" />} iconClassName="bg-primary/10 text-primary" />
        <StatCard title="Active" value={activeCount} icon={<UserCheck className="w-5 h-5" />} iconClassName="bg-success/10 text-success" />
        <StatCard title="On Leave" value={onLeaveCount} icon={<UserX className="w-5 h-5" />} iconClassName="bg-warning/10 text-warning" />
        <StatCard title="Monthly Payroll" value={`Rs. ${totalSalary.toLocaleString()}`} icon={<Banknote className="w-5 h-5" />} iconClassName="bg-info/10 text-info" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="kitchen">Kitchen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-leave">On Leave</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filtered.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12 cursor-pointer" onClick={() => setSelectedStaff(member)}>
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{member.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedStaff(member)}>
                  <p className="font-semibold text-sm truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {roleBadge(member.role)}
                    {statusBadge(member.status)}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>{member.department}</span>
                    <span className="font-medium text-foreground">Rs. {member.salary.toLocaleString()}/mo</span>
                  </div>
                  {member.hasLogin && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-success">
                      <ShieldCheck className="w-3.5 h-3.5" />Login enabled
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" className="h-10 flex-1 rounded-xl" onClick={() => openEdit(member)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" className="h-10 flex-1 rounded-xl text-destructive hover:text-destructive" onClick={() => setDeleteId(member.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Detail Dialog */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full">
          {selectedStaff && (
            <>
              <DialogHeader><DialogTitle>{selectedStaff.name}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">{selectedStaff.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex gap-2">{roleBadge(selectedStaff.role)}{statusBadge(selectedStaff.status)}</div>
                    <p className="text-sm text-muted-foreground mt-1">{selectedStaff.department} department</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selectedStaff.email}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedStaff.phone}</p></div>
                  <div><p className="text-muted-foreground">Join Date</p><p className="font-medium">{selectedStaff.joinDate}</p></div>
                  <div><p className="text-muted-foreground">Monthly Salary</p><p className="font-medium">Rs. {selectedStaff.salary.toLocaleString()}</p></div>
                </div>
                {/* Permissions info */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Lock className="w-3.5 h-3.5" />Access Permissions
                  </p>
                  <p className="text-xs text-muted-foreground">{ROLE_META[selectedStaff.role as StaffRole]?.description}</p>
                </div>

                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${selectedStaff.hasLogin ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {selectedStaff.hasLogin
                    ? <><ShieldCheck className="w-4 h-4 shrink-0" /><span>Login enabled — <strong>{selectedStaff.email}</strong></span></>
                    : <><KeyRound className="w-4 h-4 shrink-0" /><span>No login credentials — edit to add a password</span></>
                  }
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => openEdit(selectedStaff)} className="w-full sm:w-auto gap-2">
                    <Pencil className="w-4 h-4 shrink-0" /><span>Edit</span>
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteId(selectedStaff.id)} className="w-full sm:w-auto gap-2">
                    <Trash2 className="w-4 h-4 shrink-0" /><span>Delete</span>
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No staff members found</p>}
    </div>
  );
};

export default StaffPage;



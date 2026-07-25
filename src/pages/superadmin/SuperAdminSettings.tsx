import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { platformSettings, superAdminAccounts, type PlatformSettings, type SuperAdminAccount } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Save, Globe, Mail, Shield, Bell, Plus, Trash2, KeyRound } from "lucide-react";

const emptyForm: Omit<PlatformSettings, "id"> = {
  name: "", tagline: "", support_email: "", website: "",
  trial_days: 14, max_trial_companies: 100,
  notify_new_company: true, notify_trial_expiring: true,
  notify_payment_failed: true, notify_company_deleted: false,
};

export default function SuperAdminSettings() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [accounts, setAccounts] = useState<SuperAdminAccount[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", full_name: "", password: "" });
  const [generatedPassword, setGeneratedPassword] = useState<{ email: string; password: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    platformSettings.get().then((d) => setPlatform(d)).catch(() => toast.error("Failed to load platform settings"));
    superAdminAccounts.list().then(setAccounts).catch(() => toast.error("Failed to load super admin accounts"));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await platformSettings.update(platform);
      setPlatform(updated);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = async () => {
    if (!addForm.email.trim()) { toast.error("Email is required"); return; }
    if (!addForm.full_name.trim()) { toast.error("Full name is required"); return; }
    try {
      const { account, generated_password } = await superAdminAccounts.create({
        email: addForm.email.trim().toLowerCase(),
        full_name: addForm.full_name.trim(),
        password: addForm.password.trim() || undefined,
      });
      setAccounts((prev) => [account, ...prev]);
      setAddOpen(false);
      setAddForm({ email: "", full_name: "", password: "" });
      setGeneratedPassword({ email: account.email, password: generated_password });
      toast.success("Super admin account created");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await superAdminAccounts.delete(deleteId);
      setAccounts((prev) => prev.filter((a) => a.id !== deleteId));
      toast.success("Super admin account removed");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Platform Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Global configuration for Mero Pasal platform</p>
      </div>

      {/* Platform info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-400" />Platform Information
          </CardTitle>
          <CardDescription className="text-slate-500">Basic details shown to companies and on login</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Platform Name</Label>
              <Input
                value={platform.name}
                onChange={(e) => setPlatform({ ...platform, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Support Email</Label>
              <Input
                type="email"
                value={platform.support_email}
                onChange={(e) => setPlatform({ ...platform, support_email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white focus-visible:ring-green-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Tagline</Label>
            <Textarea
              value={platform.tagline}
              onChange={(e) => setPlatform({ ...platform, tagline: e.target.value })}
              rows={2}
              className="bg-slate-800 border-slate-700 text-white resize-none focus-visible:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Default Trial Days</Label>
              <Input
                type="number"
                min={1}
                value={platform.trial_days}
                onChange={(e) => setPlatform({ ...platform, trial_days: Number(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-white focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Max Trial Companies</Label>
              <Input
                type="number"
                min={1}
                value={platform.max_trial_companies}
                onChange={(e) => setPlatform({ ...platform, max_trial_companies: Number(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-white focus-visible:ring-green-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Bell className="w-4 h-4 text-green-400" />Admin Notifications
          </CardTitle>
          <CardDescription className="text-slate-500">Choose which events trigger super admin alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "notify_new_company" as const, label: "New Company Registration", desc: "Alert when a new company signs up or is added" },
            { key: "notify_trial_expiring" as const, label: "Trial Expiring (7 days)", desc: "Alert when a trial company is about to expire" },
            { key: "notify_payment_failed" as const, label: "Payment Failed", desc: "Alert when a subscription payment fails" },
            { key: "notify_company_deleted" as const, label: "Company Deleted", desc: "Alert when a company is removed from the platform" },
          ].map((item) => (
            <div key={item.key} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-300">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <Switch
                checked={platform[item.key]}
                onCheckedChange={(v) => setPlatform({ ...platform, [item.key]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security / Super admin accounts */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />Super Admin Accounts
            </CardTitle>
            <CardDescription className="text-slate-500">Who can access this platform-level panel</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-green-600 hover:bg-green-500 text-white gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Account</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.length === 0 && <p className="text-xs text-slate-500">No super admin accounts found.</p>}
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-300 truncate">{a.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{a.email}</p>
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                disabled={a.email === user?.email}
                title={a.email === user?.email ? "You cannot remove your own account" : "Remove account"}
                onClick={() => setDeleteId(a.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-slate-600 pt-1">Only super admin accounts can access this panel. You cannot remove your own account or the last remaining one.</p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-500 text-white gap-2 w-full sm:w-auto">
        <Save className="w-4 h-4" />{saving ? "Saving…" : "Save Settings"}
      </Button>

      {/* Add account dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Add Super Admin Account</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Full Name</Label>
              <Input value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Email</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Password (optional - temporary password if left blank)</Label>
              <Input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <Button onClick={handleAddAccount} className="w-full bg-green-600 hover:bg-green-500 text-white gap-2">
              <Plus className="w-4 h-4" />Create Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated password dialog */}
      <Dialog open={!!generatedPassword} onOpenChange={(o) => !o && setGeneratedPassword(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-green-400" />Account Created</DialogTitle>
          </DialogHeader>
          {generatedPassword && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Share these credentials securely. The password will not be shown again.</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-500" /><span className="text-slate-300">{generatedPassword.email}</span></div>
                <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-500" /><span className="font-mono text-slate-300">{generatedPassword.password}</span></div>
              </div>
              <Button onClick={() => setGeneratedPassword(null)} className="w-full bg-green-600 hover:bg-green-500 text-white">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove super admin account?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently remove <strong className="text-white">{accounts.find((a) => a.id === deleteId)?.full_name}</strong>'s access to the super admin panel.
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


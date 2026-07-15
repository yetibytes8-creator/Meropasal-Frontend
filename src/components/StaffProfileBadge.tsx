import { useState } from "react";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { ROLE_META, type StaffRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, KeyRound, Eye, EyeOff, ChevronDown, LogOut } from "lucide-react";

interface Props {
  onSignOut: () => void;
}

export default function StaffProfileBadge({ onSignOut }: Props) {
  const { staffUser, updateStaffPassword } = useStaffAuth();
  const [open, setOpen] = useState(false);
  const [pwDialog, setPwDialog] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);

  if (!staffUser) return null;

  const meta = ROLE_META[staffUser.role as StaffRole];
  const initials = staffUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handlePasswordChange = async () => {
    if (!currentPw) { toast.error("Enter your current password"); return; }
    if (!newPw || newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    try {
      await updateStaffPassword(staffUser.id, currentPw, newPw);
      toast.success("Password changed successfully");
      setPwDialog(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent transition-colors">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{staffUser.name}</p>
              <p className={`text-[10px] font-medium capitalize ${meta?.color?.split(" ")[1] ?? "text-muted-foreground"}`}>{meta?.label ?? staffUser.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          {/* Identity */}
          <div className="px-2 py-2 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{staffUser.name}</p>
                <Badge variant="outline" className={`text-[10px] mt-0.5 border capitalize ${meta?.color}`}>
                  {meta?.label ?? staffUser.role}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 truncate">{staffUser.email}</p>
          </div>

          <div className="border-t my-1" />

          <button
            onClick={() => { setOpen(false); setPwDialog(true); }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
          >
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            Change Password
          </button>

          <div className="border-t my-1" />

          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </PopoverContent>
      </Popover>

      {/* Change Password Dialog */}
      <Dialog open={pwDialog} onOpenChange={setPwDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Your current password" />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showNew ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 8 characters" className="pr-10" />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
              {newPw && confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
            <Button className="w-full gap-2" onClick={handlePasswordChange}>
              <KeyRound className="w-4 h-4" />Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

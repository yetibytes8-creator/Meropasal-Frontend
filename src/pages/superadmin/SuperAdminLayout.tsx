import { ReactNode, useState } from "react";
import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Building2, Banknote, Settings, LogOut,
  Menu, Shield, Activity, Users, CreditCard, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [{ to: "/super-admin", label: "Command Center", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Clients",
    items: [
      { to: "/super-admin/companies", label: "Companies", icon: Building2 },
      { to: "/super-admin/users", label: "Users & Staff", icon: Users },
      { to: "/super-admin/system-config", label: "System Configuration", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Platform Finance",
    items: [
      { to: "/super-admin/revenue", label: "Revenue & Dues", icon: Banknote },
      { to: "/super-admin/plans", label: "Plans & Pricing", icon: CreditCard },
    ],
  },
  {
    label: "Control",
    items: [
      { to: "/super-admin/activity", label: "Audit Activity", icon: Activity },
      { to: "/super-admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-red-600 text-white shadow-lg shadow-red-950/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="p-5 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-slate-800 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/30">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Mero Pasal HQ</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Owner control room</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-red-300" />
          Client, finance, access, and audit control
        </div>
      </div>
    </div>
  );
}

function SidebarFooter({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="p-3 border-t border-white/10">
      <button
        onClick={onSignOut}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-red-300 transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign Out
      </button>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }
  if (!profile || profile.role !== "superadmin") return <Navigate to="/access-denied" replace />;

  const handleSignOut = () => { signOut(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(30,64,175,0.12),transparent_30%),#020617] text-slate-100 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 border-r border-white/10 bg-slate-950/85 backdrop-blur">
        <SidebarBrand />
        <SidebarNav />
        <SidebarFooter onSignOut={handleSignOut} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 flex items-center justify-between border-b border-white/10 px-4 bg-slate-950/90 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-slate-950 border-r border-white/10 flex flex-col">
                <SidebarBrand />
                <SidebarNav onNavClick={() => setMobileOpen(false)} />
                <SidebarFooter onSignOut={handleSignOut} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-blue-800 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white">Super Admin</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-slate-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 min-w-0 overflow-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}

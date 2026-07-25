import { ReactNode, useState } from "react";
import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Building2, Banknote, Settings, LogOut,
  Menu, Shield, Activity, Users, CreditCard, SlidersHorizontal, Sparkles,
  Bell, Search, LifeBuoy,
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
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-green-700">
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-green-600 text-white shadow-sm shadow-green-900/10"
                      : "text-slate-700 hover:bg-green-50 hover:text-green-700"
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
    <div className="border-b border-green-100 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-green-900 shadow-sm">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-base font-extrabold leading-tight text-green-950">Mero Pasal HQ</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform control room</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-3">
        <div className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-700">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
          Client setup, subscriptions, access, finance and audit.
        </div>
      </div>
    </div>
  );
}

function SidebarFooter({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="border-t border-green-100 p-3">
      <button className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700">
        <LifeBuoy className="h-4 w-4 shrink-0" />
        Support
      </button>
      <button
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700"
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
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="animate-pulse text-green-800">Loading...</div>
      </div>
    );
  }
  if (!profile || profile.role !== "superadmin") return <Navigate to="/access-denied" replace />;

  const handleSignOut = () => { signOut(); navigate("/"); };

  return (
    <div className="super-admin-shell flex min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ecfdf5_0%,#f8fafc_34%,#ffffff_100%)] text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-green-100 bg-white/95 shadow-[8px_0_30px_rgba(15,23,42,0.04)] backdrop-blur lg:flex">
        <SidebarBrand />
        <SidebarNav />
        <SidebarFooter onSignOut={handleSignOut} />
      </aside>

      <div className="flex min-w-0 max-w-full flex-1 flex-col">
        {/* Desktop Top Bar */}
        <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center justify-between border-b border-green-100 bg-white/90 px-6 backdrop-blur lg:flex">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-green-700">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-green-950">Super Admin Console</p>
              <p className="truncate text-xs text-slate-500">YetiBytes platform operations and client configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-10 min-w-72 items-center gap-2 rounded-lg border border-green-100 bg-green-50/60 px-3 text-sm text-slate-500 xl:flex">
              <Search className="h-4 w-4" />
              Quick search clients, modules, invoices
            </div>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-green-50 hover:text-green-700">
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="gap-2 text-slate-700 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-green-100 bg-white/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-green-950/70 hover:bg-green-50 hover:text-green-700">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col border-r border-green-100 bg-white p-0">
                <SidebarBrand />
                <SidebarNav onNavClick={() => setMobileOpen(false)} />
                <SidebarFooter onSignOut={handleSignOut} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-green-900">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-green-950">Super Admin</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-emerald-950/70 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="app-workspace min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1920px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


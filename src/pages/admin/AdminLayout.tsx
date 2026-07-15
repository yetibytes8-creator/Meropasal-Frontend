import { ReactNode, useState } from "react";
import { NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LayoutDashboard, Users, CreditCard, Receipt, Package, LogOut, ArrowLeft, Activity, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/payments", label: "Payments", icon: Receipt },
  { to: "/admin/plans", label: "Plans", icon: Package },
  { to: "/admin/activity", label: "Activity Logs", icon: Activity },
];

const navGroups = [
  { label: "Dashboard", items: [navItems[0]] },
  { label: "Accounts", items: [navItems[1], navItems[2], navItems[4]] },
  { label: "Billing", items: [navItems[3]] },
  { label: "System", items: [navItems[5]] },
];

// Bottom nav: first 3 are always visible, the rest live in the "More" sheet
const mobilePrimary = navItems.slice(0, 3);
const mobileMore = navItems.slice(3);

function AdminMobileBottomNav({ onBack }: { onBack: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const isItemActive = (item: typeof navItems[number]) =>
    item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(item.to + "/");

  const isMoreActive = mobileMore.some(isItemActive);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch h-16">
          {mobilePrimary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              isMoreActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="lg:hidden rounded-t-2xl max-h-[75vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-base font-semibold text-left">More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pb-4">
            {mobileMore.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                  )
                }
              >
                <item.icon className="w-6 h-6 shrink-0" />
                <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
              </NavLink>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setMoreOpen(false); onBack(); }}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to App
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Dashboard: true,
    Accounts: true,
    Billing: false,
    System: false,
  });

  const isItemActive = (item: typeof navItems[number]) =>
    item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(item.to + "/");

  return (
    <nav className="flex-1 p-4 space-y-3">
      {navGroups.map((group) => {
        const isOpen = openGroups[group.label];
        const isActive = group.items.some(isItemActive);

        return (
          <div key={group.label} className="space-y-1">
            <button
              type="button"
              onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{group.label}</span>
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {isOpen && group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavClick}
                className={({ isActive }) =>
                  cn(
                    "ml-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onBack, onSignOut }: { onBack: () => void; onSignOut: () => void }) {
  return (
    <div className="p-4 border-t space-y-2">
      <Button variant="outline" size="sm" className="w-full justify-start" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to App
      </Button>
      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!profile || profile.role !== "admin") return <Navigate to="/access-denied" replace />;

  const handleBack = () => navigate("/modules");
  const handleSignOut = () => { signOut(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-background overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-card flex-col shrink-0">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-primary">Mero Pasal</h2>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
        <SidebarNav />
        <SidebarFooter onBack={handleBack} onSignOut={handleSignOut} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Mobile / Tablet Header */}
        <header className="lg:hidden h-14 flex items-center justify-between border-b px-4 bg-card shrink-0">
          <div>
            <p className="text-sm font-bold text-primary leading-tight">Mero Pasal</p>
            <p className="text-xs text-muted-foreground leading-tight">Admin Panel</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 min-w-0 overflow-auto overflow-x-hidden">
          <div className="min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
        </main>
      </div>

      <AdminMobileBottomNav onBack={handleBack} />
    </div>
  );
}

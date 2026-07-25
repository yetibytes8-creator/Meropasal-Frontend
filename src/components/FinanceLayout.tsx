import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarProvider, useSidebar,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MoreHorizontal, Wallet } from "lucide-react";
import { useState } from "react";
import cafeLogo from "@/assets/cafe-logo.png";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import FinanceSidebarMenu from "@/components/FinanceSidebarMenu";
import { getFinanceNav } from "@/lib/financeNav";
import AppTopBar from "@/components/AppTopBar";

const financeNav = getFinanceNav("/finance");

function FinanceSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { settings } = useSettings();

  return (
    <Sidebar collapsible="icon" className="hidden md:flex border-r-0 print:hidden">
      <SidebarContent className="bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.28),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--destructive)/0.12),transparent_38%),linear-gradient(180deg,hsl(151_42%_13%),hsl(151_42%_9%))] text-white">
        <div className="m-3 rounded-2xl border border-white/10 bg-white/8 p-3 shadow-sm backdrop-blur flex items-center gap-3">
          {settings.logo
            ? <img src={settings.logo} alt={settings.businessName} className="w-9 h-9 rounded-xl object-contain shrink-0 bg-white/90 p-1" />
            : <img src={cafeLogo} alt="Finance" width={32} height={32} className="shrink-0 drop-shadow-sm" />
          }
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold text-white">
                Finance
              </span>
              <span className="block truncate text-[11px] text-white/65">
                Ledger, bank, tax & reports
              </span>
            </div>
          )}
        </div>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-white/60">Finance Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <FinanceSidebarMenu base="/finance" />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function FinanceMobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const primary = financeNav.slice(0, 3);
  const more = financeNav.slice(3);
  const isMoreActive = more.some((i) => location.pathname === i.url);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-green-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur print:hidden">
        <div className="flex items-stretch h-16">
          {primary.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/finance"}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              activeClassName="text-green-700"
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-medium leading-none">{item.title}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              isMoreActive ? "text-green-700" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl max-h-[60vh]">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-base font-semibold text-left">More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 pb-4">
            {more.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                    isActive ? "bg-green-50 text-green-700" : "bg-muted/50 text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Wallet className="w-6 h-6 shrink-0" />
                  <span className="text-[11px] font-medium text-center leading-tight">{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <>
      <SidebarProvider>
        <div className="h-dvh min-h-dvh flex w-full overflow-hidden print:block print:h-auto print:min-h-0 print:overflow-visible">
          <FinanceSidebarContent />
          <div className="flex-1 flex min-h-0 flex-col min-w-0 max-w-full print:block">
            <AppTopBar module="finance" onSignOut={signOut} />
            <main className="app-workspace print-root flex-1 min-h-0 min-w-0 max-w-full bg-gradient-to-b from-green-50/45 via-white to-white p-3 sm:p-4 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 overflow-y-auto overflow-x-hidden overscroll-contain print:block print:overflow-visible print:bg-white print:p-0 print:pb-0">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      <FinanceMobileBottomNav />
    </>
  );
}

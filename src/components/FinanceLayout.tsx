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
      <SidebarContent className="bg-sidebar">
        <div className="p-4 flex items-center gap-3">
          {settings.logo
            ? <img src={settings.logo} alt={settings.businessName} className="w-8 h-8 rounded object-contain shrink-0" />
            : <img src={cafeLogo} alt="Finance" width={32} height={32} className="shrink-0 drop-shadow-sm" />
          }
          {!collapsed && (
            <span className="font-display font-semibold text-sidebar-foreground text-sm truncate">
              Finance
            </span>
          )}
        </div>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Finance Menu</SidebarGroupLabel>}
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)] print:hidden">
        <div className="flex items-stretch h-16">
          {primary.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/finance"}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              activeClassName="text-finance"
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-medium leading-none">{item.title}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              isMoreActive ? "text-finance" : "text-muted-foreground"
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
                    isActive ? "bg-finance/10 text-finance" : "bg-muted/50 text-muted-foreground hover:bg-accent"
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
        <div className="min-h-screen flex w-full overflow-x-hidden print:block print:min-h-0">
          <FinanceSidebarContent />
          <div className="flex-1 flex flex-col min-w-0 max-w-full print:block">
            <AppTopBar module="finance" onSignOut={signOut} />
            <main className="print-root flex-1 min-w-0 max-w-full p-3 sm:p-4 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 overflow-auto overflow-x-hidden print:block print:overflow-visible print:p-0 print:pb-0">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      <FinanceMobileBottomNav />
    </>
  );
}

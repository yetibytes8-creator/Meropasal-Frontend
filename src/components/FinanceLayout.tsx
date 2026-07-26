import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarProvider, useSidebar,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  ArrowRightLeft,
  Banknote,
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  FileText,
  Landmark,
  MoreHorizontal,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  type LucideIcon,
  Wallet,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import cafeLogo from "@/assets/cafe-logo.png";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import FinanceSidebarMenu from "@/components/FinanceSidebarMenu";
import { getFinanceNav } from "@/lib/financeNav";
import AppTopBar from "@/components/AppTopBar";

const financeNav = getFinanceNav("/finance");

const financeIconMap: Record<string, LucideIcon> = {
  Dashboard: Wallet,
  Transactions: ReceiptText,
  "Journal Voucher": BookOpenCheck,
  "Day Book": ClipboardList,
  Income: Banknote,
  "Payment In / Out": WalletCards,
  "Cash & Banks": Landmark,
  "Bank Reconciliation": ArrowRightLeft,
  "Balance Transfer": ArrowRightLeft,
  "Chart of Accounts": BookOpenCheck,
  "Refunds & Returns": RotateCcw,
  "Report & Signature Settings": Settings,
  Reports: FileText,
  "Financial Statements": BarChart3,
  "Approval Workflow": ShieldCheck,
};

const mobileFinanceGroups = [
  {
    title: "Daily Work",
    hint: "Cashier/accountant ko daily entry",
    items: ["Dashboard", "Day Book", "Transactions", "Income", "Payment In / Out", "Refunds & Returns"],
  },
  {
    title: "Setup",
    hint: "Live garnu agadi accountant setup",
    items: ["Chart of Accounts", "Opening Balance", "Journal Voucher", "Customer/Supplier Ledger", "Report & Signature Settings"],
  },
  {
    title: "Bank & Tax",
    hint: "Bank, cheque, VAT/TDS, transfer",
    items: ["Cash & Banks", "Bank Reconciliation", "Cheque Management", "Tax & Rates", "Balance Transfer"],
  },
  {
    title: "Reports",
    hint: "Owner/audit report print",
    items: ["Reports", "Sales Register", "Purchase Register", "Financial Statements", "Approval Workflow", "Document Attachments", "Audit Trail"],
  },
];

function iconFor(title: string) {
  return financeIconMap[title] ?? Wallet;
}

function FinanceSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { settings } = useSettings();

  return (
    <Sidebar collapsible="icon" className="hidden md:flex border-r-0 print:hidden">
      <SidebarContent className="bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.28),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--destructive)/0.12),transparent_38%),linear-gradient(180deg,hsl(151_42%_13%),hsl(151_42%_9%))] text-white">
        <div className="m-3 rounded-2xl border border-white/10 bg-white/8 p-3 shadow-sm backdrop-blur flex items-center gap-3">
          {settings.logo
            ? <img src={settings.logo} alt={settings.businessName} className="w-9 h-9 rounded-xl object-contain shrink-0 bg-white/90 p-1" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cafeLogo; }} />
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
  const [query, setQuery] = useState("");
  const location = useLocation();

  const primaryTitles = ["Dashboard", "Transactions", "Payment In / Out"];
  const primary = primaryTitles
    .map((title) => financeNav.find((item) => item.title === title))
    .filter(Boolean) as typeof financeNav;
  const more = financeNav.filter((item) => !primaryTitles.includes(item.title));
  const isMoreActive = more.some((i) => location.pathname === i.url);
  const visibleGroups = mobileFinanceGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((title) => financeNav.find((item) => item.title === title))
        .filter(Boolean)
        .filter((item) => item!.title.toLowerCase().includes(query.trim().toLowerCase())) as typeof financeNav,
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-green-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur print:hidden">
        <div className="flex items-stretch h-16">
          {primary.map((item) => {
            const Icon = iconFor(item.title);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/finance"}
                className="flex-1 flex flex-col items-center justify-center gap-1 px-1 text-muted-foreground transition-colors"
                activeClassName="text-green-700"
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="max-w-full truncate text-[11px] font-semibold leading-none">{item.title === "Payment In / Out" ? "Pay/Receive" : item.title}</span>
              </NavLink>
            );
          })}
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
        <SheetContent side="bottom" className="md:hidden max-h-[82dvh] overflow-hidden rounded-t-3xl p-0">
          <SheetHeader className="border-b bg-gradient-to-b from-green-50 to-white px-4 py-4 text-left">
            <SheetTitle className="text-base font-black text-green-950">Finance Menu</SheetTitle>
            <p className="text-xs text-muted-foreground">Daily work, setup, bank/tax and reports grouped cha.</p>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search finance page..."
                className="h-11 rounded-2xl pl-9"
              />
            </div>
            {visibleGroups.map((group) => (
              <section key={group.title} className="space-y-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-green-800">{group.title}</p>
                  <p className="text-[11px] text-muted-foreground">{group.hint}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const Icon = iconFor(item.title);
                    const isActive = location.pathname === item.url;
                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                          isActive ? "border-green-200 bg-green-50 text-green-800" : "border-border bg-card text-foreground hover:border-green-200 hover:bg-green-50/70"
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 text-xs font-bold leading-snug">{item.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            ))}
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
            <main className="app-workspace finance-workspace print-root flex-1 min-h-0 min-w-0 max-w-full bg-gradient-to-b from-green-50/45 via-white to-white p-3 sm:p-4 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 overflow-y-auto overflow-x-hidden overscroll-contain print:block print:overflow-visible print:bg-white print:p-0 print:pb-0">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      <FinanceMobileBottomNav />
    </>
  );
}

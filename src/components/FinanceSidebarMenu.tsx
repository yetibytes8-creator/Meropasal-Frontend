import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, Wallet } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { getFinanceNav, getPinnedFinanceReports, type FinanceBase } from "@/lib/financeNav";
import { cn } from "@/lib/utils";

const moduleFinancePaths = [
  "finance",
  "day-book",
  "income",
  "invoices",
  "accounts",
  "budget",
  "transactions",
  "journal-voucher",
  "sales-register",
  "purchase-register",
  "refunds-returns",
  "payroll-payables",
  "cash-banks",
  "bank-reconciliation",
  "cheque-management",
  "tax-rates",
  "tds-compliance",
  "vat-tds-reconciliation",
  "balance-transfer",
  "chart-of-accounts",
  "opening-balance",
  "customer-supplier-ledger",
  "stock-valuation",
  "branch-reporting",
  "cash-flow",
  "mis-reporting",
  "financial-statements",
  "ratio-analysis",
  "provisional-report",
  "five-year-projection",
  "approval-workflow",
  "document-attachments",
  "audit-trail",
  "fiscal-year-closing",
  "finance-reports",
];

function isFinancePath(pathname: string, base: FinanceBase) {
  if (base === "/finance") return pathname.startsWith("/finance");
  return moduleFinancePaths.some((path) => pathname === `${base}/${path}`);
}

function overviewPath(base: FinanceBase) {
  return base === "/finance" ? "/finance" : `${base}/finance`;
}

const financeGroups = [
  {
    title: "Overview",
    items: ["Dashboard", "Day Book", "Transactions"],
  },
  {
    title: "Accounting Setup",
    items: ["Chart of Accounts", "Opening Balance", "Journal Voucher", "Customer/Supplier Ledger"],
  },
  {
    title: "Sales & Purchases",
    items: ["Income", "Sales Register", "Purchase Register", "Refunds & Returns", "Payroll & Payables", "Payment In / Out"],
  },
  {
    title: "Bank, Tax & Branch",
    items: [
      "Cash & Banks",
      "Bank Reconciliation",
      "Cheque Management",
      "Balance Transfer",
      "Tax & Rates",
      "TDS Compliance",
      "VAT & TDS Reconciliation",
      "Stock Valuation",
      "Branch Reporting",
    ],
  },
  {
    title: "Reports & Control",
    items: [
      "Cash Flow",
      "MIS Dashboard",
      "Financial Statements",
      "Ratio Analysis",
      "Provisional Report",
      "5 Year Projection",
      "Reports",
      "Approval Workflow",
      "Document Attachments",
      "Audit Trail",
      "Fiscal Year Closing",
    ],
  },
];

export default function FinanceSidebarMenu({ base }: { base: FinanceBase }) {
  const location = useLocation();
  const open = isFinancePath(location.pathname, base);
  const nav = getFinanceNav(base).filter((item) => item.title !== "Expenses");
  const pinned = getPinnedFinanceReports(base);
  const groupedNav = useMemo(
    () =>
      financeGroups.map((group) => ({
        ...group,
        items: group.items.map((title) => nav.find((item) => item.title === title)).filter(Boolean) as typeof nav,
      })),
    [nav],
  );
  const activeGroup = useMemo(() => {
    const current = `${location.pathname}${location.search}`;
    const match = groupedNav.find((group) =>
      group.items.some((item) => location.pathname === item.url || current === item.url) ||
      (group.title === "Reports & Control" && pinned.some((item) => current === item.url)),
    );
    return match?.title || "Overview";
  }, [groupedNav, location.pathname, location.search, pinned]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([activeGroup]));

  useEffect(() => {
    setOpenGroups((current) => {
      if (current.has(activeGroup)) return current;
      const next = new Set(current);
      next.add(activeGroup);
      return next;
    });
  }, [activeGroup]);

  const toggleGroup = (title: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={open}>
          <NavLink
            to={overviewPath(base)}
            end
            className="hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <Wallet className="w-4 h-4 mr-2" />
            <span>Finance</span>
          </NavLink>
        </SidebarMenuButton>
        {open && (
          <SidebarMenuSub className="mt-1">
            {groupedNav.map((group) => (
              <SidebarMenuSubItem key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    activeGroup === group.title && "bg-sidebar-accent/70 text-sidebar-primary",
                  )}
                >
                  <span className="truncate">{group.title}</span>
                  <span className="ml-auto mr-1 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] text-sidebar-foreground/70">
                    {group.items.length}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", openGroups.has(group.title) && "rotate-180")} />
                </button>
                {openGroups.has(group.title) && (
                  <SidebarMenuSub className="ml-2 mt-1 border-l border-sidebar-border/60 pl-2">
                    {group.items.map((item) => (
                      <SidebarMenuSubItem key={item.url}>
                        <SidebarMenuSubButton asChild isActive={location.pathname === item.url} size="sm">
                          <NavLink to={item.url} end={item.end}>
                            <span className="truncate text-[12px]">{item.title}</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                    {group.title === "Reports & Control" && (
                      <>
                        <SidebarMenuSubItem>
                          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/45">
                            Pinned
                          </div>
                        </SidebarMenuSubItem>
                        {pinned.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild isActive={`${location.pathname}${location.search}` === item.url} size="sm">
                              <NavLink to={item.url}>
                                <span className="truncate text-[12px]">{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

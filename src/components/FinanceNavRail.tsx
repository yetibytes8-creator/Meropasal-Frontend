import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { getFinanceNav, getPinnedFinanceReports, type FinanceBase, type FinanceNavItem } from "@/lib/financeNav";

function TimelineLink({ item }: { item: FinanceNavItem }) {
  const location = useLocation();
  const current = `${location.pathname}${location.search}`;
  const active = item.end ? location.pathname === item.url : current === item.url || location.pathname === item.url;

  return (
    <NavLink
      to={item.url}
      end={item.end}
      className={cn(
        "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 pl-10 text-[15px] font-medium text-sidebar-foreground/78 transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-primary/10 text-primary"
      )}
      activeClassName="bg-primary/10 text-primary"
    >
      <span
        className={cn(
          "absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-sidebar-foreground/45 ring-4 ring-sidebar",
          active && "bg-primary"
        )}
      />
      <span className="absolute left-[1.125rem] top-[calc(50%+0.5rem)] h-[1.65rem] w-px bg-sidebar-border group-last:hidden" />
      <span className="truncate">{item.title}</span>
    </NavLink>
  );
}

export default function FinanceNavRail({ base, compact = false }: { base: FinanceBase; compact?: boolean }) {
  const nav = getFinanceNav(base);
  const pinned = getPinnedFinanceReports(base);

  if (compact) {
    return (
      <div className="space-y-1">
        {nav.slice(0, 7).map((item) => (
          <TimelineLink key={item.url} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="px-2 pb-5">
      <div className="space-y-1">
        {nav.map((item) => (
          <TimelineLink key={item.url} item={item} />
        ))}
      </div>
      <div className="mt-5 px-3 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/55">
        Pinned Reports
      </div>
      <div className="mt-1.5 space-y-0.5">
        {pinned.map((item) => (
          <TimelineLink key={item.url} item={item} />
        ))}
      </div>
    </div>
  );
}

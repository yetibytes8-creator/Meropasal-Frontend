import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, type FeatureKey } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, BarChart3,
  ArrowLeft, LogOut, Receipt, UserCog, Heart, Bell, Settings,
  ChevronDown, ChevronRight, Warehouse, GitBranch, ClipboardList,
} from "lucide-react";
import cafeLogo from "@/assets/cafe-logo.png";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useSettings } from "@/contexts/SettingsContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import StaffProfileBadge from "@/components/StaffProfileBadge";
import { canAccessRoute, type StaffRole } from "@/lib/rbac";
import AppTopBar from "@/components/AppTopBar";
import { getBusinessProfileFromSystemConfig } from "@/lib/businessProfiles";

const inventoryNav = [
  { title: "Dashboard", url: "/inventory", icon: LayoutDashboard },
  { title: "Products", url: "/inventory/products", icon: Package },
  { title: "Stock Control", url: "/inventory/stock-control", icon: Warehouse },
  { title: "Operations Hub", url: "/inventory/operations", icon: ClipboardList },
  { title: "Branches", url: "/inventory/branches", icon: GitBranch },
  { title: "Sales (POS)", url: "/inventory/sales", icon: ShoppingCart },
  { title: "Purchases", url: "/inventory/purchases", icon: Truck },
  { title: "Suppliers", url: "/inventory/suppliers", icon: Users },
  { title: "Expenses", url: "/inventory/expenses", icon: Receipt },
  { title: "Customers", url: "/inventory/customers", icon: Heart },
  { title: "Staff", url: "/inventory/staff", icon: UserCog },
  { title: "Reports", url: "/inventory/reports", icon: BarChart3 },
  { title: "Alerts", url: "/inventory/alerts", icon: Bell },
  { title: "Settings", url: "/inventory/settings", icon: Settings },
];

const inventoryFeatureByUrl: Partial<Record<string, FeatureKey>> = {
  "/inventory/branches": "branches",
  "/inventory/sales": "billing",
  "/inventory/staff": "staff",
  "/inventory/customers": "customers",
  "/inventory/reports": "reports",
};

const inventoryNavGroups = [
  { title: "Overview", icon: LayoutDashboard, items: ["Dashboard", "Alerts"] },
  { title: "Stock", icon: Package, items: ["Products", "Stock Control", "Operations Hub", "Branches", "Purchases", "Suppliers"] },
  { title: "Sales", icon: ShoppingCart, items: ["Sales (POS)", "Customers"] },
  { title: "Accounts", icon: Receipt, items: ["Expenses", "Reports"] },
  { title: "Team", icon: UserCog, items: ["Staff"] },
  { title: "System", icon: Settings, items: ["Settings"] },
].map((group) => ({
  ...group,
  items: group.items.map((title) => inventoryNav.find((item) => item.title === title)).filter(Boolean) as typeof inventoryNav,
}));
const INVENTORY_PANEL_FALLBACK_LABEL = "Inventory Panel";

function InventorySidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { settings } = useSettings();
  const { staffUser } = useStaffAuth();
  const { canAccessFeature, systemConfig, subscription } = useAuth();
  const businessProfile = getBusinessProfileFromSystemConfig(systemConfig, subscription?.plan?.module_access);
  const panelLabel = businessProfile.moduleLabel ? `${businessProfile.moduleLabel} Panel` : INVENTORY_PANEL_FALLBACK_LABEL;
  const displayTitle = (title: string) => {
    if (title === "Products") return businessProfile.productLabel;
    if (title === "Stock Control") return businessProfile.stockLabel;
    if (title === "Purchases") return businessProfile.purchaseLabel;
    if (title === "Sales (POS)") return businessProfile.salesLabel;
    return title;
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Stock: true,
    Sales: true,
    Accounts: false,
    Team: false,
    System: false,
  });

  const roleFilteredNav = staffUser
    ? inventoryNav.filter((item) => canAccessRoute(staffUser.role as StaffRole, item.url))
    : inventoryNav;
  const visibleNav = roleFilteredNav.filter((item) => {
    const feature = inventoryFeatureByUrl[item.url];
    return !feature || canAccessFeature(feature);
  });
  const visibleUrls = new Set(visibleNav.map((item) => item.url));
  const visibleGroups = inventoryNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => visibleUrls.has(item.url)) }))
    .filter((group) => group.items.length > 0);

  return (
    // hidden on mobile — bottom nav handles navigation there
    <Sidebar collapsible="icon" className="hidden md:flex border-r-0 print:hidden">
      <SidebarContent className="bg-sidebar bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.26),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--destructive)/0.11),transparent_38%),linear-gradient(180deg,hsl(var(--sidebar-background)),hsl(151_42%_9%))] border-r border-sidebar-border/70">
        <div className="p-4 flex items-center gap-3">
          {settings.logo
            ? <img src={settings.logo} alt={settings.businessName} className="w-8 h-8 rounded object-contain shrink-0" />
            : <img src={cafeLogo} alt="Mero Pasal" width={32} height={32} className="shrink-0 drop-shadow-sm" />
          }
          {!collapsed && (
            <span className="font-display font-semibold text-sidebar-foreground text-sm truncate">
              {settings.businessName || "Inventory"}
            </span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>{panelLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {collapsed ? (
                visibleNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="w-4 h-4 mr-2" />
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                visibleGroups.map((group) => {
                  const open = openGroups[group.title] ?? false;
                  const active = group.items.some((item) => location.pathname === item.url);
                  return (
                    <SidebarMenuItem key={group.title}>
                      <SidebarMenuButton
                        type="button"
                        isActive={active}
                        onClick={() => setOpenGroups((prev) => ({ ...prev, [group.title]: !open }))}
                        className="hover:bg-sidebar-accent"
                      >
                        <group.icon className="w-4 h-4 mr-2" />
                        <span className="flex-1">{group.title}</span>
                        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </SidebarMenuButton>
                      {open && (
                        <SidebarMenuSub className="mt-1">
                          {group.items.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild isActive={location.pathname === item.url} size="sm">
                                <NavLink to={item.url} end>
                                  <span>{displayTitle(item.title)}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function InventoryLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { staffUser, staffSignOut } = useStaffAuth();
  const navigate = useNavigate();
  const [showLegacyHeader] = useState(false);

  const handleSignOut = () => {
    if (staffUser) staffSignOut();
    else signOut();
  };

  return (
    <>
      <SidebarProvider>
        <div className="h-dvh min-h-dvh flex w-full overflow-hidden print:block print:h-auto print:min-h-0 print:overflow-visible">
          <InventorySidebarContent />
          <div className="flex-1 flex min-h-0 flex-col min-w-0 max-w-full print:block">
            <AppTopBar
              module="inventory"
              onSignOut={handleSignOut}
              rightContent={staffUser ? <StaffProfileBadge onSignOut={handleSignOut} /> : undefined}
            />
            {showLegacyHeader && (
            <header className="h-14 flex items-center justify-between border-b px-3 sm:px-4 bg-card shrink-0">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Sidebar toggle — desktop only */}
                <SidebarTrigger className="hidden md:flex" />
                {!staffUser && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/modules")} className="text-muted-foreground px-2 sm:px-3">
                    <ArrowLeft className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Modules</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {staffUser ? (
                  <StaffProfileBadge onSignOut={handleSignOut} />
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground font-display hidden md:inline">Mero Pasal</span>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="px-2 sm:px-3">
                      <LogOut className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Sign Out</span>
                    </Button>
                  </>
                )}
              </div>
            </header>
            )}
            {/* pb-20 on mobile reserves space above the fixed bottom nav */}
            <main className="app-workspace print-root flex-1 min-h-0 min-w-0 max-w-full p-3 sm:p-4 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 overflow-y-auto overflow-x-hidden overscroll-contain print:block print:overflow-visible print:p-0 print:pb-0">{children}</main>
          </div>
        </div>
      </SidebarProvider>

      {/* Outside SidebarProvider so `fixed` positioning works against the viewport */}
      <MobileBottomNav module="inventory" />
    </>
  );
}

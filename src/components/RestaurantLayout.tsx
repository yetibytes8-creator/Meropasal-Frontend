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
  LayoutDashboard, UtensilsCrossed, ClipboardList, Grid3X3, ChefHat, Receipt,
  ArrowLeft, LogOut, Heart, UserCog, Bell, Settings, Boxes, QrCode, ConciergeBell,
  ChevronDown, ChevronRight, Bike, Landmark, GitBranch, AlertCircle, Printer,
  Truck,
} from "lucide-react";
import cafeLogo from "@/assets/cafe-logo.png";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useSettings } from "@/contexts/SettingsContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import StaffProfileBadge from "@/components/StaffProfileBadge";
import { canAccessRoute, type StaffRole } from "@/lib/rbac";
import AppTopBar from "@/components/AppTopBar";
import FinanceSidebarMenu from "@/components/FinanceSidebarMenu";

const restaurantNav = [
  { title: "Dashboard", url: "/restaurant", icon: LayoutDashboard },
  { title: "Menu", url: "/restaurant/menu", icon: UtensilsCrossed },
  { title: "Stock", url: "/restaurant/stock", icon: Boxes },
  { title: "Purchases", url: "/restaurant/purchases", icon: Truck },
  { title: "Services", url: "/restaurant/services", icon: ConciergeBell },
  { title: "Orders", url: "/restaurant/orders", icon: ClipboardList },
  { title: "Tables", url: "/restaurant/tables", icon: Grid3X3 },
  { title: "QR Codes", url: "/restaurant/qr-codes", icon: QrCode },
  { title: "Kitchen", url: "/restaurant/kitchen", icon: ChefHat },
  { title: "Billing", url: "/restaurant/billing", icon: Receipt },
  { title: "Delivery", url: "/restaurant/delivery", icon: Bike },
  { title: "Savings", url: "/restaurant/savings", icon: Landmark },
  { title: "Branches", url: "/restaurant/branches", icon: GitBranch },
  { title: "Issues", url: "/restaurant/issues", icon: AlertCircle },
  { title: "Printer", url: "/restaurant/printer", icon: Printer },
  { title: "Customers", url: "/restaurant/customers", icon: Heart },
  { title: "Staff", url: "/restaurant/staff", icon: UserCog },
  { title: "Alerts", url: "/restaurant/alerts", icon: Bell },
  { title: "Settings", url: "/restaurant/settings", icon: Settings },
];

const restaurantFeatureByUrl: Partial<Record<string, FeatureKey>> = {
  "/restaurant/qr-codes": "qrMenu",
  "/restaurant/billing": "billing",
  "/restaurant/delivery": "delivery",
  "/restaurant/branches": "branches",
  "/restaurant/staff": "staff",
  "/restaurant/customers": "customers",
};

const restaurantNavGroups = [
  { title: "Overview", icon: LayoutDashboard, items: ["Dashboard", "Alerts"] },
  { title: "Catalog", icon: UtensilsCrossed, items: ["Menu", "Stock", "Purchases", "Services"] },
  { title: "Operations", icon: ClipboardList, items: ["Orders", "Tables", "QR Codes", "Kitchen", "Billing", "Delivery"] },
  { title: "People", icon: UserCog, items: ["Customers", "Staff"] },
  { title: "Business", icon: GitBranch, items: ["Branches", "Savings", "Issues", "Printer"] },
  { title: "System", icon: Settings, items: ["Settings"] },
].map((group) => ({
  ...group,
  items: group.items.map((title) => restaurantNav.find((item) => item.title === title)).filter(Boolean) as typeof restaurantNav,
}));

function RestaurantSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { settings } = useSettings();
  const { staffUser } = useStaffAuth();
  const { canAccessFeature } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Catalog: true,
    Operations: true,
    People: false,
    Business: false,
    System: false,
  });

  const roleFilteredNav = staffUser
    ? restaurantNav.filter((item) => canAccessRoute(staffUser.role as StaffRole, item.url))
    : restaurantNav;
  const visibleNav = roleFilteredNav.filter((item) => {
    const feature = restaurantFeatureByUrl[item.url];
    return !feature || canAccessFeature(feature);
  });
  const visibleUrls = new Set(visibleNav.map((item) => item.url));
  const visibleGroups = restaurantNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => visibleUrls.has(item.url)) }))
    .filter((group) => group.items.length > 0);

  return (
    // hidden on mobile — bottom nav handles navigation there
    <Sidebar collapsible="icon" className="hidden md:flex border-r-0 print:hidden">
      <SidebarContent className="bg-sidebar bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.24),transparent_42%),linear-gradient(180deg,hsl(var(--sidebar-background)),hsl(4_38%_11%))] border-r border-sidebar-border/70">
        <div className="p-4 flex items-center gap-3">
          {settings.logo
            ? <img src={settings.logo} alt={settings.businessName} className="w-8 h-8 rounded object-contain shrink-0" />
            : <img src={cafeLogo} alt="Mero Pasal" width={32} height={32} className="shrink-0 drop-shadow-sm" />
          }
          {!collapsed && (
            <span className="font-display font-semibold text-sidebar-foreground text-sm truncate">
              {settings.businessName || "Cafe"}
            </span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Restaurant Panel</SidebarGroupLabel>
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
                                  <span>{item.title}</span>
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
        {!collapsed && canAccessFeature("finance") && (
          <SidebarGroup>
            <SidebarGroupLabel>Finance</SidebarGroupLabel>
            <SidebarGroupContent>
              <FinanceSidebarMenu base="/restaurant" />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export default function RestaurantLayout({ children }: { children: ReactNode }) {
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
        <div className="min-h-screen flex w-full overflow-x-hidden print:block print:min-h-0">
          <RestaurantSidebarContent />
          <div className="flex-1 flex flex-col min-w-0 max-w-full print:block">
            <AppTopBar
              module="restaurant"
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
            <main className="print-root flex-1 min-w-0 max-w-full p-3 sm:p-4 md:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 overflow-auto overflow-x-hidden print:block print:overflow-visible print:p-0 print:pb-0">{children}</main>
          </div>
        </div>
      </SidebarProvider>

      {/* Outside SidebarProvider so `fixed` positioning works against the viewport */}
      <MobileBottomNav module="restaurant" />
    </>
  );
}

import { useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { useAuth, type FeatureKey } from "@/contexts/AuthContext";
import { canAccessRoute, type StaffRole } from "@/lib/rbac";
import { getBusinessProfileFromSystemConfig } from "@/lib/businessProfiles";
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Grid3X3, ChefHat, Receipt,
  Heart, UserCog, Bell, Settings, Package, ShoppingCart, Truck, Users, BarChart3,
  MoreHorizontal, QrCode, Warehouse, ConciergeBell, Bike, Landmark, GitBranch, AlertCircle, Printer, Wallet,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  end?: boolean;
}

// Restaurant
const restaurantPrimary: NavItem[] = [
  { title: "Dashboard", url: "/restaurant", icon: LayoutDashboard, end: true },
  { title: "Orders", url: "/restaurant/orders", icon: ClipboardList },
  { title: "Billing", url: "/restaurant/billing", icon: Receipt },
];
const restaurantMore: NavItem[] = [
  { title: "Menu", url: "/restaurant/menu", icon: UtensilsCrossed },
  { title: "Stock", url: "/restaurant/stock", icon: Warehouse },
  { title: "Purchases", url: "/restaurant/purchases", icon: Truck },
  { title: "Services", url: "/restaurant/services", icon: ConciergeBell },
  { title: "Tables", url: "/restaurant/tables", icon: Grid3X3 },
  { title: "QR Codes", url: "/restaurant/qr-codes", icon: QrCode },
  { title: "Kitchen", url: "/restaurant/kitchen", icon: ChefHat },
  { title: "Delivery", url: "/restaurant/delivery", icon: Bike },
  { title: "Customers", url: "/restaurant/customers", icon: Heart },
  { title: "Staff", url: "/restaurant/staff", icon: UserCog },
  { title: "Branches", url: "/restaurant/branches", icon: GitBranch },
  { title: "Finance", url: "/restaurant/finance", icon: Wallet },
  { title: "Savings", url: "/restaurant/savings", icon: Landmark },
  { title: "Issues", url: "/restaurant/issues", icon: AlertCircle },
  { title: "Printer", url: "/restaurant/printer", icon: Printer },
  { title: "Alerts", url: "/restaurant/alerts", icon: Bell },
  { title: "Settings", url: "/restaurant/settings", icon: Settings },
];

// Inventory
const inventoryPrimary: NavItem[] = [
  { title: "Dashboard", url: "/inventory", icon: LayoutDashboard, end: true },
  { title: "Products", url: "/inventory/products", icon: Package },
  { title: "Sales", url: "/inventory/sales", icon: ShoppingCart },
];
const inventoryMore: NavItem[] = [
  { title: "Stock Control", url: "/inventory/stock-control", icon: Warehouse },
  { title: "Purchases", url: "/inventory/purchases", icon: Truck },
  { title: "Suppliers", url: "/inventory/suppliers", icon: Users },
  { title: "Expenses", url: "/inventory/expenses", icon: Receipt },
  { title: "Customers", url: "/inventory/customers", icon: Heart },
  { title: "Staff", url: "/inventory/staff", icon: UserCog },
  { title: "Reports", url: "/inventory/reports", icon: BarChart3 },
  { title: "Finance", url: "/inventory/finance", icon: Wallet },
  { title: "Alerts", url: "/inventory/alerts", icon: Bell },
  { title: "Settings", url: "/inventory/settings", icon: Settings },
];

const restaurantFeatureByUrl: Partial<Record<string, FeatureKey>> = {
  "/restaurant/billing": "billing",
  "/restaurant/qr-codes": "qrMenu",
  "/restaurant/delivery": "delivery",
  "/restaurant/customers": "customers",
  "/restaurant/staff": "staff",
  "/restaurant/branches": "branches",
  "/restaurant/finance": "finance",
};

const inventoryFeatureByUrl: Partial<Record<string, FeatureKey>> = {
  "/inventory/sales": "billing",
  "/inventory/expenses": "finance",
  "/inventory/customers": "customers",
  "/inventory/staff": "staff",
  "/inventory/reports": "reports",
  "/inventory/finance": "finance",
};

interface MobileBottomNavProps {
  module: "restaurant" | "inventory";
}

export default function MobileBottomNav({ module }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { staffUser } = useStaffAuth();
  const { canAccessFeature, systemConfig, subscription } = useAuth();
  const businessProfile = getBusinessProfileFromSystemConfig(systemConfig, subscription?.plan?.module_access);
  const displayTitle = (title: string) => {
    if (module !== "inventory") return title;
    if (title === "Products") return businessProfile.productLabel;
    if (title === "Stock Control") return businessProfile.stockLabel;
    if (title === "Purchases") return businessProfile.purchaseLabel;
    if (title === "Sales") return businessProfile.salesLabel;
    return title;
  };

  const filterByRole = (items: NavItem[]) =>
    staffUser ? items.filter((i) => canAccessRoute(staffUser.role as StaffRole, i.url)) : items;
  const filterByFeature = (items: NavItem[]) => {
    const map = module === "restaurant" ? restaurantFeatureByUrl : inventoryFeatureByUrl;
    return items.filter((item) => {
      const feature = map[item.url];
      return !feature || canAccessFeature(feature);
    });
  };

  const primary = filterByFeature(filterByRole(module === "restaurant" ? restaurantPrimary : inventoryPrimary));
  const more = filterByFeature(filterByRole(module === "restaurant" ? restaurantMore : inventoryMore));

  const isMoreActive = more.some(
    (item) => item.end
      ? location.pathname === item.url
      : location.pathname === item.url || location.pathname.startsWith(item.url + "/")
  );

  return (
    <>
      {/* Fixed bottom navigation bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur print:hidden">
        <div className="flex h-16 items-stretch">
          {primary.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              activeClassName="text-primary"
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-medium leading-none">{displayTitle(item.title)}</span>
            </NavLink>
          ))}

          {/* More button */}
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

      {/* More — bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl max-h-[75vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-base font-semibold text-left">More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 pb-4">
            {more.map((item) => {
              const isActive = item.end
                ? location.pathname === item.url
                : location.pathname === item.url || location.pathname.startsWith(item.url + "/");
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end={item.end}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="w-6 h-6 shrink-0" />
                  <span className="text-[11px] font-medium text-center leading-tight">{displayTitle(item.title)}</span>
                </NavLink>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

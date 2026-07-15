import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, Grid3X3, HelpCircle, Home, LogOut, MapPin, Package, Search, ShieldQuestion,
  UtensilsCrossed, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { branches as branchesApi, getSelectedBranchId, setSelectedBranchId, type ApiBranch } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppModule = "restaurant" | "inventory" | "finance";

const moduleLabels: Record<AppModule, string> = {
  restaurant: "Restaurant",
  inventory: "Inventory",
  finance: "Finance",
};

const quickLinks: Record<AppModule, Array<{ label: string; to: string }>> = {
  restaurant: [
    { label: "Dashboard", to: "/restaurant" },
    { label: "Orders", to: "/restaurant/orders" },
    { label: "Billing", to: "/restaurant/billing" },
    { label: "QR Codes", to: "/restaurant/qr-codes" },
  ],
  inventory: [
    { label: "Dashboard", to: "/inventory" },
    { label: "Sales POS", to: "/inventory/sales" },
    { label: "Products", to: "/inventory/products" },
    { label: "Purchases", to: "/inventory/purchases" },
  ],
  finance: [
    { label: "Dashboard", to: "/finance" },
    { label: "Income", to: "/finance/income" },
    { label: "Invoices", to: "/finance/invoices" },
    { label: "Reports", to: "/finance/reports" },
  ],
};

interface AppTopBarProps {
  module: AppModule;
  onSignOut: () => void;
  rightContent?: ReactNode;
}

export default function AppTopBar({ module, onSignOut, rightContent }: AppTopBarProps) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { canAccessFeature, canAccessModule, setActiveModule } = useAuth();
  const { staffUser } = useStaffAuth();
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(getSelectedBranchId());
  const businessName = settings.businessName || "Mero Pasal";
  const currentBranch = selectedBranch === "all"
    ? null
    : branches.find((branch) => String(branch.id) === selectedBranch);
  const branchName = currentBranch?.name || (selectedBranch === "all" ? "All Branches" : "Primary Branch");

  useEffect(() => {
    branchesApi.list()
      .then((items) => {
        setBranches(items);
        if (getSelectedBranchId() !== "all" && !items.some((item) => String(item.id) === getSelectedBranchId())) {
          setSelectedBranchId(items.find((item) => item.is_primary)?.id ? String(items.find((item) => item.is_primary)?.id) : "all");
          setSelectedBranch(getSelectedBranchId());
        }
      })
      .catch(() => {});
    const onBranchChange = (event: Event) => {
      setSelectedBranch(String((event as CustomEvent).detail || getSelectedBranchId()));
    };
    window.addEventListener("mp-branch-change", onBranchChange);
    return () => window.removeEventListener("mp-branch-change", onBranchChange);
  }, []);

  const chooseBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSelectedBranch(branchId);
    window.location.reload();
  };

  const financePath = staffUser && module !== "finance" ? `/${module}/finance` : "/finance";

  const availableModules: Array<{ key: AppModule; label: string; to: string; description: string; icon: typeof Grid3X3; tone: string }> = [
    ...(canAccessModule("restaurant")
      ? [{ key: "restaurant" as const, label: "Restaurant", to: "/restaurant", description: "Orders, menu, tables, kitchen and billing", icon: UtensilsCrossed, tone: "bg-rose-50 text-rose-700 border-rose-100" }]
      : []),
    ...(canAccessModule("inventory")
      ? [{ key: "inventory" as const, label: "Inventory", to: "/inventory", description: "Products, stock, purchases and POS", icon: Package, tone: "bg-emerald-50 text-emerald-700 border-emerald-100" }]
      : []),
    ...(canAccessFeature("finance")
      ? [{ key: "finance" as const, label: "Finance", to: financePath, description: "Accounts, ledger, reports and cash/bank", icon: Wallet, tone: "bg-sky-50 text-sky-700 border-sky-100" }]
      : []),
  ];

  const chooseModule = (target: AppModule, to: string) => {
    if (target === "restaurant" || target === "inventory") {
      setActiveModule(target);
    }
    navigate(to);
  };

  return (
    <header className="h-12 shrink-0 border-b border-primary/25 bg-[#173247] px-2 text-white shadow-sm print:hidden sm:h-10 sm:px-3">
      <div className="flex h-full min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <SidebarTrigger className="hidden h-8 w-8 text-white hover:bg-white/10 hover:text-white md:flex" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 rounded-md px-2 text-xs font-semibold text-white hover:bg-white/10 hover:text-white sm:h-8"
                title="App Menu"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">App Menu</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 p-2">
              <DropdownMenuLabel className="px-2">App Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableModules.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => chooseModule(item.key, item.to)}
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-3"
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${item.tone}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </DropdownMenuItem>
              ))}
              {availableModules.length === 0 && (
                <DropdownMenuItem disabled>No module access assigned</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden h-5 w-px bg-white/20 sm:block" />

          <button
            type="button"
            className="hidden min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/10 lg:flex"
            title={businessName}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[260px] truncate">{businessName}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 max-w-[44vw] gap-1.5 rounded-md bg-white/10 px-2 text-xs font-semibold text-white hover:bg-white/15 hover:text-white sm:h-8 sm:max-w-[160px] md:flex"
                title={branchName}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{branchName}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Branch</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => chooseBranch("all")}>
                All Branches
              </DropdownMenuItem>
              {branches.map((branch) => (
                <DropdownMenuItem key={branch.id} onClick={() => chooseBranch(String(branch.id))}>
                  {branch.name}{branch.is_primary ? " (Primary)" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="hidden rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm sm:inline-flex">
            {moduleLabels[module]}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 gap-1.5 rounded-md px-2 text-xs font-semibold text-white hover:bg-white/10 hover:text-white sm:flex"
              >
                <Search className="h-3.5 w-3.5" />
                Quick Access
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>{moduleLabels[module]} shortcuts</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {quickLinks[module].map((item) => (
                <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 text-white hover:bg-white/10 hover:text-white sm:inline-flex" onClick={() => navigate("/")}>
            <Home className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 text-white hover:bg-white/10 hover:text-white md:inline-flex">
            <ShieldQuestion className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 text-white hover:bg-white/10 hover:text-white md:inline-flex">
            <HelpCircle className="h-4 w-4" />
          </Button>

          {rightContent ?? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-md px-2 text-xs font-bold text-white hover:bg-white/10 hover:text-white">
                  <span className="max-w-[28vw] truncate sm:max-w-[120px]">{businessName}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>{businessName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

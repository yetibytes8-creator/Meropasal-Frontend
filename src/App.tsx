import { BrowserRouter, Route, Routes, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, type FeatureKey } from "@/contexts/AuthContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { StaffAuthProvider, useStaffAuth } from "@/contexts/StaffAuthContext";
import { canAccessRoute } from "@/lib/rbac";
import type { StaffRole } from "@/lib/rbac";
import RoleGuard from "@/components/RoleGuard";
import { UtensilsCrossed, Package, LogOut } from "lucide-react";

// Minimal module picker for "both"-department admin/manager staff
function StaffModuleSelection() {
  const { staffUser, staffSignOut } = useStaffAuth();
  const navigate = useNavigate();
  if (!staffUser) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background cafe-pattern p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <p className="font-semibold text-foreground">{staffUser.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{staffUser.role} &middot; Both modules</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { label: "Restaurant / Cafe", icon: UtensilsCrossed, path: "/restaurant", color: "text-restaurant", bg: "bg-restaurant/10 hover:bg-restaurant/20 border-restaurant/20 hover:border-restaurant/50" },
            { label: "Inventory / Shop", icon: Package, path: "/inventory", color: "text-inventory", bg: "bg-inventory/10 hover:bg-inventory/20 border-inventory/20 hover:border-inventory/50" },
          ].map((m) => (
            <button key={m.path} onClick={() => navigate(m.path)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${m.bg}`}>
              <m.icon className={`w-10 h-10 ${m.color}`} />
              <span className="text-sm font-semibold text-foreground">{m.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => { staffSignOut(); navigate("/login", { replace: true }); }}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>
    </div>
  );
}

const LandingPage = lazy(() => import("./pages/LandingPage"));
const MarketingInfoPage = lazy(() => import("./pages/MarketingInfoPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const TrialExpiredPage = lazy(() => import("./pages/TrialExpiredPage"));
const AccessDeniedPage = lazy(() => import("./pages/AccessDeniedPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicMenuPage = lazy(() => import("./pages/PublicMenuPage"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminActivityLogs = lazy(() => import("./pages/admin/AdminActivityLogs"));

const SuperAdminLayout = lazy(() => import("./pages/superadmin/SuperAdminLayout"));
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const CompaniesPage = lazy(() => import("./pages/superadmin/CompaniesPage"));
const SuperAdminUsers = lazy(() => import("./pages/superadmin/SuperAdminUsers"));
const SuperAdminAddUser = lazy(() => import("./pages/superadmin/SuperAdminAddUser"));
const SuperAdminPlans = lazy(() => import("./pages/superadmin/SuperAdminPlans"));
const SuperAdminRevenue = lazy(() => import("./pages/superadmin/SuperAdminRevenue"));
const SuperAdminActivity = lazy(() => import("./pages/superadmin/SuperAdminActivity"));
const SuperAdminSettings = lazy(() => import("./pages/superadmin/SuperAdminSettings"));
const SystemConfigurationPage = lazy(() => import("./pages/superadmin/SystemConfigurationPage"));

const RestaurantLayout = lazy(() => import("./components/RestaurantLayout"));
const RestaurantDashboard = lazy(() => import("./pages/restaurant/Dashboard"));
const MenuManagement = lazy(() => import("./pages/restaurant/MenuManagement"));
const IngredientsPage = lazy(() => import("./pages/restaurant/IngredientsPage"));
const RestaurantPurchasesPage = lazy(() => import("./pages/restaurant/RestaurantPurchasesPage"));
const ServicesPage = lazy(() => import("./pages/restaurant/ServicesPage"));
const OrdersPage = lazy(() => import("./pages/restaurant/OrdersPage"));
const TablesPage = lazy(() => import("./pages/restaurant/TablesPage"));
const KitchenDisplay = lazy(() => import("./pages/restaurant/KitchenDisplay"));
const BillingPage = lazy(() => import("./pages/restaurant/BillingPage"));
const QRCodesPage = lazy(() => import("./pages/restaurant/QRCodesPage"));
const DeliveryPage = lazy(() => import("./pages/restaurant/DeliveryPage"));
const BranchesPage = lazy(() => import("./pages/restaurant/BranchesPage"));
const SavingsPage = lazy(() => import("./pages/restaurant/SavingsPage"));
const IssuesPage = lazy(() => import("./pages/restaurant/IssuesPage"));
const PrinterPage = lazy(() => import("./pages/restaurant/PrinterPage"));
const CafeSettingsPage = lazy(() => import("./pages/restaurant/CafeSettingsPage"));

const InventoryLayout = lazy(() => import("./components/InventoryLayout"));
const FinanceLayout = lazy(() => import("./components/FinanceLayout"));
const InventoryDashboard = lazy(() => import("./pages/inventory/Dashboard"));
const ProductsPage = lazy(() => import("./pages/inventory/ProductsPage"));
const StockControlPage = lazy(() => import("./pages/inventory/StockControlPage"));
const OperationsHubPage = lazy(() => import("./pages/inventory/OperationsHubPage"));
const SalesPage = lazy(() => import("./pages/inventory/SalesPage"));
const PurchasesPage = lazy(() => import("./pages/inventory/PurchasesPage"));
const SuppliersPage = lazy(() => import("./pages/inventory/SuppliersPage"));
const ReportsPage = lazy(() => import("./pages/inventory/ReportsPage"));

const IncomePage = lazy(() => import("./pages/finance/IncomePage"));
const InvoicesPage = lazy(() => import("./pages/finance/InvoicesPage"));
const BudgetPage = lazy(() => import("./pages/finance/BudgetPage"));
const TransactionsPage = lazy(() => import("./pages/finance/TransactionsPage"));
const FinanceDashboard = lazy(() => import("./pages/finance/Dashboard"));
const FinanceReports = lazy(() => import("./pages/finance/ReportsPage"));
const AccountsPage = lazy(() => import("./pages/finance/AccountsPage"));
const DayBookPage = lazy(() => import("./pages/finance/DayBookPage"));
const CashBanksPage = lazy(() => import("./pages/finance/CashBanksPage"));
const TaxRatesPage = lazy(() => import("./pages/finance/TaxRatesPage"));
const BalanceTransferPage = lazy(() => import("./pages/finance/BalanceTransferPage"));
const ChartOfAccountsPage = lazy(() => import("./pages/finance/ChartOfAccountsPage"));
const AccountingModulePage = lazy(() => import("./pages/finance/AccountingModulePage"));

const accountingModuleSlugs = [
  "journal-voucher",
  "sales-register",
  "purchase-register",
  "refunds-returns",
  "payroll-payables",
  "bank-reconciliation",
  "cheque-management",
  "tds-compliance",
  "vat-tds-reconciliation",
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
] as const;

const ExpensesPage = lazy(() => import("./pages/inventory/ExpensesPage"));
const StaffPage = lazy(() => import("./pages/inventory/StaffPage"));
const CustomersPage = lazy(() => import("./pages/inventory/CustomersPage"));
const AlertsPage = lazy(() => import("./pages/inventory/AlertsPage"));
const SettingsPage = lazy(() => import("./pages/inventory/SettingsPage"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const RouteSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const RestaurantWrapper = () => (
  <OrdersProvider>
    <Outlet />
  </OrdersProvider>
);

function ModuleGuard({ module, feature, children }: { module: "restaurant" | "inventory"; feature?: FeatureKey | FeatureKey[]; children: React.ReactNode }) {
  const { canAccessModule, canAccessFeature, isTrialExpired } = useAuth();
  const { staffUser } = useStaffAuth();
  const features = Array.isArray(feature) ? feature : feature ? [feature] : [];
  if (features.some((item) => !canAccessFeature(item))) return <Navigate to="/access-denied" replace />;

  if (staffUser) {
    const dept = staffUser.department;
    const allowed = dept === "both" || (module === "restaurant" && dept === "restaurant") || (module === "inventory" && dept === "inventory");
    if (!allowed) return <Navigate to="/access-denied" replace />;
    return <>{children}</>;
  }

  if (isTrialExpired()) return <Navigate to="/trial-expired" replace />;
  if (!canAccessModule(module)) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}

function FinanceGuard({ children }: { children: React.ReactNode }) {
  const { canAccessModule, canAccessFeature, isTrialExpired } = useAuth();
  if (isTrialExpired()) return <Navigate to="/trial-expired" replace />;
  if (!canAccessFeature("finance")) return <Navigate to="/access-denied" replace />;
  if (!canAccessModule("restaurant") && !canAccessModule("inventory")) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}

// Redirects to the right home destination based on the user's plan/role.
// Waits until profile is loaded to avoid redirecting before subscription data arrives.
function SmartHomeRedirect() {
  const { profile, subscription, activeModule, systemConfig, canAccessModule, canAccessFeature } = useAuth();

  // Profile hasn't loaded yet — subscription data may also still be in-flight
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (profile.role === "superadmin") return <Navigate to="/super-admin" replace />;

  const access = subscription?.plan?.module_access;
  const preferred = systemConfig.defaultModule === "finance" && canAccessFeature("finance")
    ? "/finance"
    : systemConfig.defaultModule === "inventory" && canAccessModule("inventory")
      ? "/inventory"
      : systemConfig.defaultModule === "restaurant" && canAccessModule("restaurant")
        ? "/restaurant"
        : null;
  if (preferred) return <Navigate to={preferred} replace />;
  if (access === "cafe" && canAccessModule("restaurant")) return <Navigate to="/restaurant" replace />;
  if (access === "inventory" && canAccessModule("inventory")) return <Navigate to="/inventory" replace />;
  if (access === "combo") {
    if (activeModule && canAccessModule(activeModule)) return <Navigate to={`/${activeModule}`} replace />;
    if (canAccessModule("restaurant")) return <Navigate to="/restaurant" replace />;
    if (canAccessModule("inventory")) return <Navigate to="/inventory" replace />;
  }
  if (canAccessFeature("finance")) return <Navigate to="/finance" replace />;
  return <Navigate to="/access-denied" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const { staffUser } = useStaffAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user && !staffUser) {
    return (
      <RouteSuspense>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/how-it-works" element={<MarketingInfoPage />} />
          <Route path="/features" element={<MarketingInfoPage />} />
          <Route path="/modules" element={<MarketingInfoPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<MarketingInfoPage />} />
          <Route path="/contact" element={<MarketingInfoPage />} />
          <Route path="/qr-menu" element={<PublicMenuPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteSuspense>
    );
  }

  // Staff session: redirect to their primary module
  if (staffUser) {
    const canSwitchModules = staffUser.department === "both" && (staffUser.role === "admin" || staffUser.role === "manager");
    const staffHome = staffUser.department === "inventory" ? "/inventory" : "/restaurant";
    const staffRootRedirect = canSwitchModules ? "/staff-modules" : staffHome;
    return (
      <RouteSuspense>
        <Routes>
          <Route path="/" element={<Navigate to={staffRootRedirect} replace />} />
          <Route path="/login" element={<Navigate to={staffRootRedirect} replace />} />
          <Route path="/staff-modules" element={<StaffModuleSelection />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="/qr-menu" element={<PublicMenuPage />} />

          {/* Restaurant routes - RoleGuard enforces per-page RBAC */}
          <Route element={<RestaurantWrapper />}>
            <Route path="/restaurant" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><RestaurantDashboard /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/menu" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><MenuManagement /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/ingredients" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><IngredientsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/stock" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><IngredientsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/purchases" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><RestaurantPurchasesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/services" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><ServicesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/orders" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><OrdersPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/tables" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><TablesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/qr-codes" element={<ModuleGuard module="restaurant" feature="qrMenu"><RestaurantLayout><RoleGuard><QRCodesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/kitchen" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><KitchenDisplay /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/billing" element={<ModuleGuard module="restaurant" feature="billing"><RestaurantLayout><RoleGuard><BillingPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/delivery" element={<ModuleGuard module="restaurant" feature="delivery"><RestaurantLayout><RoleGuard><DeliveryPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/branches" element={<ModuleGuard module="restaurant" feature="branches"><RestaurantLayout><RoleGuard><BranchesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/savings" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><SavingsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/issues" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><IssuesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/printer" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><PrinterPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/customers" element={<ModuleGuard module="restaurant" feature="customers"><RestaurantLayout><RoleGuard><CustomersPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/staff" element={<ModuleGuard module="restaurant" feature="staff"><RestaurantLayout><RoleGuard><StaffPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/alerts" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><AlertsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
            <Route path="/restaurant/settings" element={<ModuleGuard module="restaurant"><RestaurantLayout><RoleGuard><CafeSettingsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          </Route>

          {/* Inventory routes - RoleGuard enforces per-page RBAC */}
          <Route path="/inventory" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><InventoryDashboard /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/products" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><ProductsPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/stock-control" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><StockControlPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/operations" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><OperationsHubPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/branches" element={<ModuleGuard module="inventory" feature="branches"><InventoryLayout><RoleGuard><BranchesPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/sales" element={<ModuleGuard module="inventory" feature="billing"><InventoryLayout><RoleGuard><SalesPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/purchases" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><PurchasesPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/suppliers" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><SuppliersPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
            <Route path="/inventory/expenses" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><ExpensesPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
            <Route path="/inventory/customers" element={<ModuleGuard module="inventory" feature="customers"><InventoryLayout><RoleGuard><CustomersPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/staff" element={<ModuleGuard module="inventory" feature="staff"><InventoryLayout><RoleGuard><StaffPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/reports" element={<ModuleGuard module="inventory" feature="reports"><InventoryLayout><RoleGuard><ReportsPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/alerts" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><AlertsPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/settings" element={<ModuleGuard module="inventory"><InventoryLayout><RoleGuard><SettingsPage /></RoleGuard></InventoryLayout></ModuleGuard>} />

          {/* Finance - inside restaurant module for staff */}
          <Route path="/restaurant/finance" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><FinanceDashboard /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/day-book" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><DayBookPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/income" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><IncomePage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/expenses" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><ExpensesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/invoices" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><InvoicesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/accounts" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><AccountsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/budget" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><BudgetPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/transactions" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><TransactionsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/cash-banks" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><CashBanksPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/tax-rates" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><TaxRatesPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/balance-transfer" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><BalanceTransferPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          <Route path="/restaurant/chart-of-accounts" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><ChartOfAccountsPage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          {accountingModuleSlugs.map((slug) => (
            <Route key={`staff-restaurant-${slug}`} path={`/restaurant/${slug}`} element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><RoleGuard><AccountingModulePage /></RoleGuard></RestaurantLayout></ModuleGuard>} />
          ))}
          <Route path="/restaurant/finance-reports" element={<ModuleGuard module="restaurant" feature={["finance", "reports"]}><RestaurantLayout><RoleGuard><FinanceReports /></RoleGuard></RestaurantLayout></ModuleGuard>} />

          {/* Finance - inside inventory module for staff */}
          <Route path="/inventory/finance" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><FinanceDashboard /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/day-book" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><DayBookPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/income" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><IncomePage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/invoices" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><InvoicesPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/accounts" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><AccountsPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/budget" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><BudgetPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/transactions" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><TransactionsPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/cash-banks" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><CashBanksPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/tax-rates" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><TaxRatesPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/balance-transfer" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><BalanceTransferPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          <Route path="/inventory/chart-of-accounts" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><ChartOfAccountsPage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          {accountingModuleSlugs.map((slug) => (
            <Route key={`staff-inventory-${slug}`} path={`/inventory/${slug}`} element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><RoleGuard><AccountingModulePage /></RoleGuard></InventoryLayout></ModuleGuard>} />
          ))}
          <Route path="/inventory/finance-reports" element={<ModuleGuard module="inventory" feature={["finance", "reports"]}><InventoryLayout><RoleGuard><FinanceReports /></RoleGuard></InventoryLayout></ModuleGuard>} />

          <Route path="*" element={<Navigate to={staffHome} replace />} />
        </Routes>
      </RouteSuspense>
    );
  }

  return (
    <RouteSuspense>
      <Routes>
      {/* Smart redirect: goes directly to the user's workspace */}
      <Route path="/" element={<SmartHomeRedirect />} />
      <Route path="/login" element={<SmartHomeRedirect />} />
      <Route path="/signup" element={<SmartHomeRedirect />} />
      <Route path="/modules" element={<SmartHomeRedirect />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/how-it-works" element={<MarketingInfoPage />} />
      <Route path="/features" element={<MarketingInfoPage />} />
      <Route path="/about" element={<MarketingInfoPage />} />
      <Route path="/contact" element={<MarketingInfoPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/trial-expired" element={<TrialExpiredPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="/qr-menu" element={<PublicMenuPage />} />

      {/* Standalone finance routes — opened from the module picker */}
      <Route path="/finance" element={<FinanceGuard><FinanceLayout><FinanceDashboard /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/day-book" element={<FinanceGuard><FinanceLayout><DayBookPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/income" element={<FinanceGuard><FinanceLayout><IncomePage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/expenses" element={<FinanceGuard><FinanceLayout><ExpensesPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/invoices" element={<FinanceGuard><FinanceLayout><InvoicesPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/accounts" element={<FinanceGuard><FinanceLayout><AccountsPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/budget" element={<FinanceGuard><FinanceLayout><BudgetPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/transactions" element={<FinanceGuard><FinanceLayout><TransactionsPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/cash-banks" element={<FinanceGuard><FinanceLayout><CashBanksPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/tax-rates" element={<FinanceGuard><FinanceLayout><TaxRatesPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/balance-transfer" element={<FinanceGuard><FinanceLayout><BalanceTransferPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/chart-of-accounts" element={<FinanceGuard><FinanceLayout><ChartOfAccountsPage /></FinanceLayout></FinanceGuard>} />
      <Route path="/finance/settings" element={<FinanceGuard><FinanceLayout><SettingsPage /></FinanceLayout></FinanceGuard>} />
      {accountingModuleSlugs.map((slug) => (
        <Route key={`finance-${slug}`} path={`/finance/${slug}`} element={<FinanceGuard><FinanceLayout><AccountingModulePage /></FinanceLayout></FinanceGuard>} />
      ))}
      <Route path="/finance/reports" element={<FinanceGuard><FinanceLayout><FinanceReports /></FinanceLayout></FinanceGuard>} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
      <Route path="/admin/subscriptions" element={<AdminLayout><AdminSubscriptions /></AdminLayout>} />
      <Route path="/admin/payments" element={<AdminLayout><AdminPayments /></AdminLayout>} />
      <Route path="/admin/plans" element={<AdminLayout><AdminPlans /></AdminLayout>} />
      <Route path="/admin/activity" element={<AdminLayout><AdminActivityLogs /></AdminLayout>} />

      {/* Super Admin routes */}
      <Route path="/super-admin" element={<SuperAdminLayout><SuperAdminDashboard /></SuperAdminLayout>} />
      <Route path="/super-admin/companies" element={<SuperAdminLayout><CompaniesPage /></SuperAdminLayout>} />
      <Route path="/super-admin/users" element={<SuperAdminLayout><SuperAdminUsers /></SuperAdminLayout>} />
      <Route path="/super-admin/users/add" element={<SuperAdminLayout><SuperAdminAddUser /></SuperAdminLayout>} />
      <Route path="/super-admin/users/:userId/edit" element={<SuperAdminLayout><SuperAdminAddUser /></SuperAdminLayout>} />
      <Route path="/super-admin/system-config" element={<SuperAdminLayout><SystemConfigurationPage /></SuperAdminLayout>} />
      <Route path="/super-admin/plans" element={<SuperAdminLayout><SuperAdminPlans /></SuperAdminLayout>} />
      <Route path="/super-admin/revenue" element={<SuperAdminLayout><SuperAdminRevenue /></SuperAdminLayout>} />
      <Route path="/super-admin/activity" element={<SuperAdminLayout><SuperAdminActivity /></SuperAdminLayout>} />
      <Route path="/super-admin/settings" element={<SuperAdminLayout><SuperAdminSettings /></SuperAdminLayout>} />

      {/* Restaurant routes */}
      <Route element={<RestaurantWrapper />}>
        <Route path="/restaurant" element={<ModuleGuard module="restaurant"><RestaurantLayout><RestaurantDashboard /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/menu" element={<ModuleGuard module="restaurant"><RestaurantLayout><MenuManagement /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/ingredients" element={<ModuleGuard module="restaurant"><RestaurantLayout><IngredientsPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/stock" element={<ModuleGuard module="restaurant"><RestaurantLayout><IngredientsPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/purchases" element={<ModuleGuard module="restaurant"><RestaurantLayout><RestaurantPurchasesPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/services" element={<ModuleGuard module="restaurant"><RestaurantLayout><ServicesPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/orders" element={<ModuleGuard module="restaurant"><RestaurantLayout><OrdersPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/tables" element={<ModuleGuard module="restaurant"><RestaurantLayout><TablesPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/qr-codes" element={<ModuleGuard module="restaurant" feature="qrMenu"><RestaurantLayout><QRCodesPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/kitchen" element={<ModuleGuard module="restaurant"><RestaurantLayout><KitchenDisplay /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/billing" element={<ModuleGuard module="restaurant" feature="billing"><RestaurantLayout><BillingPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/delivery" element={<ModuleGuard module="restaurant" feature="delivery"><RestaurantLayout><DeliveryPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/branches" element={<ModuleGuard module="restaurant" feature="branches"><RestaurantLayout><BranchesPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/savings" element={<ModuleGuard module="restaurant"><RestaurantLayout><SavingsPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/issues" element={<ModuleGuard module="restaurant"><RestaurantLayout><IssuesPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/printer" element={<ModuleGuard module="restaurant"><RestaurantLayout><PrinterPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/customers" element={<ModuleGuard module="restaurant" feature="customers"><RestaurantLayout><CustomersPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/staff" element={<ModuleGuard module="restaurant" feature="staff"><RestaurantLayout><StaffPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/alerts" element={<ModuleGuard module="restaurant"><RestaurantLayout><AlertsPage /></RestaurantLayout></ModuleGuard>} />
        <Route path="/restaurant/settings" element={<ModuleGuard module="restaurant"><RestaurantLayout><CafeSettingsPage /></RestaurantLayout></ModuleGuard>} />
      </Route>

      {/* Inventory routes */}
      <Route path="/inventory" element={<ModuleGuard module="inventory"><InventoryLayout><InventoryDashboard /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/products" element={<ModuleGuard module="inventory"><InventoryLayout><ProductsPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/stock-control" element={<ModuleGuard module="inventory"><InventoryLayout><StockControlPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/operations" element={<ModuleGuard module="inventory"><InventoryLayout><OperationsHubPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/branches" element={<ModuleGuard module="inventory" feature="branches"><InventoryLayout><BranchesPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/sales" element={<ModuleGuard module="inventory" feature="billing"><InventoryLayout><SalesPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/purchases" element={<ModuleGuard module="inventory"><InventoryLayout><PurchasesPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/suppliers" element={<ModuleGuard module="inventory"><InventoryLayout><SuppliersPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/expenses" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><ExpensesPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/customers" element={<ModuleGuard module="inventory" feature="customers"><InventoryLayout><CustomersPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/staff" element={<ModuleGuard module="inventory" feature="staff"><InventoryLayout><StaffPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/reports" element={<ModuleGuard module="inventory" feature="reports"><InventoryLayout><ReportsPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/alerts" element={<ModuleGuard module="inventory"><InventoryLayout><AlertsPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/settings" element={<ModuleGuard module="inventory"><InventoryLayout><SettingsPage /></InventoryLayout></ModuleGuard>} />

      {/* Finance routes — inside inventory module */}
      <Route path="/inventory/finance" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><FinanceDashboard /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/day-book" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><DayBookPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/income" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><IncomePage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/invoices" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><InvoicesPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/accounts" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><AccountsPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/budget" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><BudgetPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/transactions" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><TransactionsPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/cash-banks" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><CashBanksPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/tax-rates" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><TaxRatesPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/balance-transfer" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><BalanceTransferPage /></InventoryLayout></ModuleGuard>} />
      <Route path="/inventory/chart-of-accounts" element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><ChartOfAccountsPage /></InventoryLayout></ModuleGuard>} />
      {accountingModuleSlugs.map((slug) => (
        <Route key={`inventory-${slug}`} path={`/inventory/${slug}`} element={<ModuleGuard module="inventory" feature="finance"><InventoryLayout><AccountingModulePage /></InventoryLayout></ModuleGuard>} />
      ))}
      <Route path="/inventory/finance-reports" element={<ModuleGuard module="inventory" feature={["finance", "reports"]}><InventoryLayout><FinanceReports /></InventoryLayout></ModuleGuard>} />

      {/* Finance routes — inside restaurant module */}
      <Route path="/restaurant/finance" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><FinanceDashboard /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/day-book" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><DayBookPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/income" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><IncomePage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/expenses" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><ExpensesPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/invoices" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><InvoicesPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/accounts" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><AccountsPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/budget" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><BudgetPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/transactions" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><TransactionsPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/cash-banks" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><CashBanksPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/tax-rates" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><TaxRatesPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/balance-transfer" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><BalanceTransferPage /></RestaurantLayout></ModuleGuard>} />
      <Route path="/restaurant/chart-of-accounts" element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><ChartOfAccountsPage /></RestaurantLayout></ModuleGuard>} />
      {accountingModuleSlugs.map((slug) => (
        <Route key={`restaurant-${slug}`} path={`/restaurant/${slug}`} element={<ModuleGuard module="restaurant" feature="finance"><RestaurantLayout><AccountingModulePage /></RestaurantLayout></ModuleGuard>} />
      ))}
      <Route path="/restaurant/finance-reports" element={<ModuleGuard module="restaurant" feature={["finance", "reports"]}><RestaurantLayout><FinanceReports /></RestaurantLayout></ModuleGuard>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </RouteSuspense>
  );
}

const App = () => (
  <TooltipProvider>
    <AuthProvider>
      <StaffAuthProvider>
        <SettingsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SettingsProvider>
      </StaffAuthProvider>
    </AuthProvider>
  </TooltipProvider>
);

export default App;

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "../..");
const repoRoot = path.resolve(frontendRoot, "..");

function readFrontend(relativePath: string) {
  return readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

function readRepo(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("inventory module smoke coverage", () => {
  it("keeps sale refund and stock safety wired end to end", () => {
    const salesPage = readFrontend("src/pages/inventory/SalesPage.tsx");
    const productsPage = readFrontend("src/pages/inventory/ProductsPage.tsx");
    const stockControlPage = readFrontend("src/pages/inventory/StockControlPage.tsx");
    const dashboard = readFrontend("src/pages/inventory/Dashboard.tsx");
    const ingredientsPage = readFrontend("src/pages/restaurant/IngredientsPage.tsx");
    const api = readFrontend("src/lib/api.ts");
    const views = readRepo("backend/api/views.py");
    const serializers = readRepo("backend/api/serializers.py");
    const models = readRepo("backend/api/models.py");

    expect(salesPage).toContain("salesApi.list()");
    expect(salesPage).toContain("salesApi.refund");
    expect(salesPage).toContain("saleReturnsApi.create");
    expect(salesPage).toContain("Return / Exchange");
    expect(salesPage).toContain("restockReturned");
    expect(salesPage).toContain("DISCOUNT_MODES");
    expect(salesPage).toContain("Amount discount");
    expect(salesPage).toContain("No discount applied");
    expect(salesPage).toContain('s.status !== "refunded"');
    expect(api).toContain("refund:");
    expect(api).toContain("saleReturns");
    expect(views).toContain("def refund");
    expect(views).toContain("return_sale_stock");
    expect(views).toContain("SaleReturnViewSet");
    expect(serializers).toContain("units available");
    expect(serializers).toContain("SaleReturnSerializer");
    expect(serializers).toContain("Return quantity is higher");
    expect(serializers).toContain("stock_status");
    expect(models).toContain("refunded");
    expect(models).toContain("class SaleReturn");
    expect(models).toContain("update_or_create");
    expect(models).toContain("is out of stock");
    expect(models).toContain("class StockAdjustment");
    expect(api).toContain("stockAdjustments");
    expect(views).toContain("StockAdjustmentViewSet");
    expect(serializers).toContain("StockAdjustmentSerializer");
    expect(serializers).toContain("Stock cannot go below zero");
    expect(stockControlPage).toContain("Stock Ledger");
    expect(stockControlPage).toContain("Reorder Plan");
    expect(stockControlPage).toContain("Adjustment History");
    expect(stockControlPage).toContain("stockAdjustmentsApi.create");
    expect(productsPage).toContain("Out of Stock");
    expect(productsPage).toContain("filterStockStatus");
    expect(productsPage).toContain("Category name add garnus");
    expect(productsPage).toContain("DEFAULT_CATEGORIES");
    expect(dashboard).toContain("Stock Watchlist");
    expect(dashboard).toContain("/inventory/stock-control");
    expect(dashboard).toContain("chartMode");
    expect(ingredientsPage).toContain("Out of Stock");
  });

  it("keeps user roles and logo upload persistence fixes wired", () => {
    const settingsPage = readFrontend("src/pages/inventory/SettingsPage.tsx");
    const models = readRepo("backend/api/models.py");

    expect(settingsPage).toContain("User Roles");
    expect(settingsPage).toContain("ROLE_META");
    expect(settingsPage).toContain("Manage Users & Roles");
    expect(settingsPage).toContain("PAN / VAT Number");
    expect(models).toContain("logo = models.TextField");
    expect(models).toContain("tax_number = models.CharField");
  });

  it("keeps security hardening checks wired", () => {
    const serializers = readRepo("backend/api/serializers.py");
    const views = readRepo("backend/api/views.py");
    const settings = readRepo("backend/meropasal/settings.py");
    const staffProfile = readFrontend("src/components/StaffProfileBadge.tsx");

    expect(serializers).toContain("UserScopedPrimaryKeyRelatedField");
    expect(serializers).toContain("validate_logo");
    expect(views).toContain("change_password");
    expect(views).toContain("validate_password");
    expect(settings).toContain("SECRET_KEY must be set when DEBUG=False");
    expect(settings).toContain("SESSION_COOKIE_SECURE");
    expect(staffProfile).toContain("updateStaffPassword");
    expect(staffProfile).not.toContain("staffUser.password");
  });

  it("keeps reference-inspired finance module wired", () => {
    const financeRail = readFrontend("src/components/FinanceNavRail.tsx");
    const financeNav = readFrontend("src/lib/financeNav.ts");
    const financeSidebar = readFrontend("src/components/FinanceSidebarMenu.tsx");
    const mobileNav = readFrontend("src/components/MobileBottomNav.tsx");
    const dayBook = readFrontend("src/pages/finance/DayBookPage.tsx");
    const statementHeader = readFrontend("src/components/FinanceStatementHeader.tsx");
    const financeDashboard = readFrontend("src/pages/finance/Dashboard.tsx");
    const financeReports = readFrontend("src/pages/finance/ReportsPage.tsx");
    const financeAccounts = readFrontend("src/pages/finance/AccountsPage.tsx");
    const financeBudget = readFrontend("src/pages/finance/BudgetPage.tsx");
    const app = readFrontend("src/App.tsx");
    const moduleSelection = readFrontend("src/pages/ModuleSelection.tsx");
    const rbac = readFrontend("src/lib/rbac.ts");

    expect(financeRail).toContain("Pinned Reports");
    expect(financeNav).toContain("Cash & Banks");
    expect(dayBook).toContain("Total Receipts [A]");
    expect(dayBook).toContain("Digital / QR");
    expect(dayBook).toContain("Remarks");
    expect(dayBook).not.toContain("Credit(Due)");
    expect(dayBook).toContain("FinanceStatementHeader");
    expect(statementHeader).toContain("PAN / VAT No.");
    expect(statementHeader).toContain("settings.businessName");
    expect(statementHeader).toContain("Fiscal Year (AD)");
    expect(statementHeader).toContain("Statutory-style format");
    expect(financeDashboard).toContain("Overview Details");
    expect(financeDashboard).toContain("TableFooter");
    expect(financeReports).toContain("Total Income");
    expect(financeReports).toContain("TableFooter");
    expect(financeAccounts).toContain("Client Balances");
    expect(financeAccounts).toContain("TableFooter");
    expect(financeBudget).toContain("Budget Details");
    expect(financeBudget).toContain("TableFooter");
    expect(financeSidebar).toContain("SidebarMenuSub");
    expect(mobileNav).not.toContain('url: "/inventory/day-book"');
    expect(app).toContain("/finance/day-book");
    expect(app).toContain("/inventory/stock-control");
    expect(app).toContain("/restaurant/cash-banks");
    expect(moduleSelection).not.toContain('navigate("/finance")');
    expect(moduleSelection).toContain("Namaste");
    expect(rbac).toContain("f-chart-of-accounts");
    expect(rbac).toContain("i-stock-control");
  });

  it("keeps restaurant QR menu and print settings wired", () => {
    const app = readFrontend("src/App.tsx");
    const api = readFrontend("src/lib/api.ts");
    const qrCodes = readFrontend("src/pages/restaurant/QRCodesPage.tsx");
    const publicMenu = readFrontend("src/pages/PublicMenuPage.tsx");
    const menuManagement = readFrontend("src/pages/restaurant/MenuManagement.tsx");
    const servicesPage = readFrontend("src/pages/restaurant/ServicesPage.tsx");
    const settingsPage = readFrontend("src/pages/inventory/SettingsPage.tsx");
    const salesPage = readFrontend("src/pages/inventory/SalesPage.tsx");
    const printTemplates = readFrontend("src/lib/printTemplates.ts");
    const adminLayout = readFrontend("src/pages/admin/AdminLayout.tsx");
    const restaurantLayout = readFrontend("src/components/RestaurantLayout.tsx");
    const inventoryLayout = readFrontend("src/components/InventoryLayout.tsx");
    const tablesPage = readFrontend("src/pages/restaurant/TablesPage.tsx");
    const billingPage = readFrontend("src/pages/restaurant/BillingPage.tsx");
    const views = readRepo("backend/api/views.py");
    const urls = readRepo("backend/api/urls.py");
    const models = readRepo("backend/api/models.py");

    expect(app).toContain("/restaurant/qr-codes");
    expect(app).toContain("/restaurant/services");
    expect(app).toContain("/qr-menu");
    expect(api).toContain("publicMenu");
    expect(api).toContain("auth: false");
    expect(api).toContain("comboOffers");
    expect(api).toContain("restaurantServices");
    expect(qrCodes).toContain("QRCode.toDataURL");
    expect(qrCodes).toContain("Download All QR");
    expect(publicMenu).toContain("publicMenu.get");
    expect(publicMenu).toContain("menuFoodImage");
    expect(publicMenu).toContain("Combo Offers");
    expect(publicMenu).toContain("sub_category");
    expect(menuManagement).toContain("Sub Menu");
    expect(menuManagement).toContain("Combo Offer");
    expect(menuManagement).toContain("comboOffersApi.create");
    expect(servicesPage).toContain("Dine In");
    expect(servicesPage).toContain("Delivery");
    expect(servicesPage).toContain("Online Order / SNS");
    expect(servicesPage).toContain("Stamp Program");
    expect(settingsPage).toContain("Invoice Setting");
    expect(settingsPage).toContain("KOT Setting");
    expect(printTemplates).toContain("generateKotHTML");
    expect(printTemplates).toContain("footerText");
    expect(adminLayout).toContain("navGroups");
    expect(adminLayout).toContain("openGroups");
    expect(restaurantLayout).toContain("restaurantNavGroups");
    expect(restaurantLayout).toContain("/restaurant/services");
    expect(inventoryLayout).toContain("inventoryNavGroups");
    expect(inventoryLayout).toContain("Stock Control");
    expect(tablesPage).toContain("filteredMenuItems");
    expect(tablesPage).toContain("menuCategory");
    expect(tablesPage).toContain("sanitizeMoneyInput");
    expect(billingPage).toContain("Search by #, table, or customer");
    expect(billingPage).toContain("PAN/VAT");
    expect(billingPage).toContain("balanceMoneyInput");
    expect(salesPage).toContain("sanitizeMoneyInput");
    expect(salesPage).toContain("autoFocus");
    expect(views).toContain("class PublicMenuView");
    expect(views).toContain('"combos"');
    expect(urls).toContain("public/menu/");
    expect(urls).toContain("restaurant/services");
    expect(models).toContain("class MenuComboOffer");
    expect(models).toContain("class RestaurantService");
    expect(models).toContain("sub_category");
    expect(models).toContain("print_settings = models.JSONField");
  });

  it("keeps shared UI polish wired across modules", () => {
    const card = readFrontend("src/components/ui/card.tsx");
    const button = readFrontend("src/components/ui/button.tsx");
    const table = readFrontend("src/components/ui/table.tsx");
    const input = readFrontend("src/components/ui/input.tsx");
    const css = readFrontend("src/index.css");

    expect(card).toContain("bg-card/95");
    expect(button).toContain("shadow-primary/15");
    expect(table).toContain("sticky top-0");
    expect(table).toContain("odd:bg-background");
    expect(input).toContain("focus-visible:border-primary/60");
    expect(css).toContain("background-image:");
    expect(css).toContain("scrollbar-width: thin");
  });

  it("keeps API response handling and rupee-only currency polish wired", () => {
    const api = readFrontend("src/lib/api.ts");
    const salesPage = readFrontend("src/pages/inventory/SalesPage.tsx");
    const landingPage = readFrontend("src/pages/LandingPage.tsx");
    const pricingPage = readFrontend("src/pages/PricingPage.tsx");
    const signupPage = readFrontend("src/pages/SignupPage.tsx");

    expect(api).toContain("Backend returned an HTML page instead of JSON");
    expect(salesPage).not.toContain("DollarSign");
    expect(salesPage).toContain("Banknote");
    expect(landingPage).toContain("Rs.");
    expect(pricingPage).toContain("Rs.");
    expect(signupPage).toContain("Rs.");
  });
});

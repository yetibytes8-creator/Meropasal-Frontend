import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(frontendRoot, "..");
const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:8080";
const checks = [];

function assertCheck(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

async function readFrontend(relativePath) {
  return readFile(path.join(frontendRoot, relativePath), "utf8");
}

async function readRepo(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function checkFrontendServer() {
  try {
    const response = await fetch(baseUrl, {
      headers: { "Cache-Control": "no-cache" },
    });
    const html = await response.text();
    assertCheck("Frontend dev server responds", response.ok, `${response.status} ${response.statusText}`);
    assertCheck("Frontend serves Vite app HTML", html.includes("/@vite/client") || html.includes("id=\"root\""));
  } catch (error) {
    assertCheck(
      "Frontend dev server responds",
      false,
      `Could not reach ${baseUrl}. Start Vite or set QA_BASE_URL. ${error.message}`,
    );
  }
}

await checkFrontendServer();

const settingsPage = await readFrontend("src/pages/inventory/SettingsPage.tsx");
assertCheck("Settings has User Roles tab", settingsPage.includes("User Roles"));
assertCheck("Settings roles use RBAC metadata", settingsPage.includes("ROLE_META"));
assertCheck("Settings links to staff role management", settingsPage.includes("Manage Users & Roles"));
assertCheck("Settings keeps uploaded logo preview flow", settingsPage.includes("reader.readAsDataURL(file)"));
assertCheck("Settings has invoice and KOT print configuration", settingsPage.includes("Invoice Setting") && settingsPage.includes("KOT Setting") && settingsPage.includes("Invoice Preview") && settingsPage.includes("KOT Preview"));
assertCheck("Settings captures PAN/VAT number for reports and invoices", settingsPage.includes("PAN / VAT Number") && settingsPage.includes("taxNumber"));

const backendModel = await readRepo("backend/api/models.py");
assertCheck("Backend logo accepts uploaded data URLs", backendModel.includes("logo = models.TextField(blank=True, null=True)"));
assertCheck("Backend persists print settings as JSON", backendModel.includes("print_settings = models.JSONField"));
assertCheck("Backend stock alerts update when items become out of stock", backendModel.includes("update_or_create") && backendModel.includes("is out of stock"));
assertCheck("Backend stores business PAN/VAT number", backendModel.includes("tax_number = models.CharField"));
assertCheck("Backend stores immutable stock adjustment history", backendModel.includes("class StockAdjustment") && backendModel.includes("stock_before") && backendModel.includes("stock_after"));
assertCheck("Backend stores restaurant sub menu, combo offers, and services", backendModel.includes("sub_category") && backendModel.includes("class ComboOffer") && backendModel.includes("class RestaurantService") && backendModel.includes("online") && backendModel.includes("loyalty"));

const printSettingsMigration = await readRepo("backend/api/migrations/0010_businesssettings_print_template_fields.py");
assertCheck("Business print/template migration is present", printSettingsMigration.includes("invoice_terms") && printSettingsMigration.includes("TextField") && printSettingsMigration.includes("logo"));

const tablesPage = await readFrontend("src/pages/restaurant/TablesPage.tsx");
assertCheck("Table billing supports split payment", tablesPage.includes("Split Cash + Online"));
assertCheck("Table split payment has 50 / 50 shortcut", tablesPage.includes("50 / 50"));
assertCheck("Table split payment validates totals", tablesPage.includes("Cash + Online must equal"));
assertCheck("Table ordering has menu search and category filters", tablesPage.includes("menuSearch") && tablesPage.includes("menuCategory") && tablesPage.includes("filteredMenuItems"));
assertCheck("Table split payment inputs are smooth decimal text fields", tablesPage.includes("sanitizeMoneyInput") && tablesPage.includes('type="text"') && tablesPage.includes("autoFocus"));

const billingPage = await readFrontend("src/pages/restaurant/BillingPage.tsx");
assertCheck("Billing search and payment dialog are table-aware", billingPage.includes("Search by #, table, or customer") && billingPage.includes("tableText.includes(q)") && billingPage.includes("PAN/VAT"));
assertCheck("Billing split payment inputs sanitize and keep balance", billingPage.includes("sanitizeMoneyInput") && billingPage.includes("balanceMoneyInput") && billingPage.includes("autoFocus"));

const productsPage = await readFrontend("src/pages/inventory/ProductsPage.tsx");
assertCheck("Products page separates in, low, and out-of-stock states", productsPage.includes("Out of Stock") && productsPage.includes("filterStockStatus") && productsPage.includes("getStockStatus"));
assertCheck("Products page has stock summary and dropdown filter", productsPage.includes("Total Items") && productsPage.includes("All Stock") && productsPage.includes("Low Stock"));
assertCheck("Products page allows custom category names", productsPage.includes("Category name add garnus") && productsPage.includes("DEFAULT_CATEGORIES") && productsPage.includes("products.map((p) => p.category"));

const stockControlPage = await readFrontend("src/pages/inventory/StockControlPage.tsx");
assertCheck("Inventory stock control page has ledger, reorder plan, and adjustment history", stockControlPage.includes("Stock Ledger") && stockControlPage.includes("Reorder Plan") && stockControlPage.includes("Adjustment History"));
assertCheck("Inventory stock control persists manual adjustments through API", stockControlPage.includes("stockAdjustmentsApi.create") && stockControlPage.includes("Save Adjustment") && stockControlPage.includes("loadData()"));

const ingredientsPage = await readFrontend("src/pages/restaurant/IngredientsPage.tsx");
assertCheck("Ingredients page has out-of-stock filtering", ingredientsPage.includes("Out of Stock") && ingredientsPage.includes("filterStockStatus"));

const salesPage = await readFrontend("src/pages/inventory/SalesPage.tsx");
assertCheck("Inventory POS loads persisted sales history", salesPage.includes("salesApi.list()"));
assertCheck("Inventory POS exposes refund action", salesPage.includes("handleRefund") && salesPage.includes("salesApi.refund"));
assertCheck("Inventory POS exposes partial return and exchange", salesPage.includes("saleReturnsApi.create") && salesPage.includes("Return / Exchange") && salesPage.includes("restockReturned"));
assertCheck("Inventory POS discount UX supports percent and rupee amount modes", salesPage.includes("DISCOUNT_MODES") && salesPage.includes("Amount discount") && salesPage.includes("No discount applied"));
assertCheck("Inventory POS excludes refunded sales from today count", salesPage.includes('s.status !== "refunded"'));
assertCheck("Inventory POS split payment input supports uninterrupted decimal typing", salesPage.includes("sanitizeMoneyInput") && salesPage.includes("balanceMoneyInput") && salesPage.includes("autoFocus"));
assertCheck("Inventory POS uses Rs/banknote instead of dollar cash signal", salesPage.includes("Banknote") && !salesPage.includes("DollarSign"));

const backendViews = await readRepo("backend/api/views.py");
assertCheck("Backend sale refund endpoint restores stock", backendViews.includes("def refund") && backendViews.includes("return_sale_stock"));
assertCheck("Backend sale return/exchange endpoint is wired", backendViews.includes("SaleReturnViewSet") && backendViews.includes("SaleReturnSerializer"));
assertCheck("Public QR menu endpoint is read-only and anonymous", backendViews.includes("class PublicMenuView") && backendViews.includes("permission_classes = [AllowAny]") && backendViews.includes("available=True"));
assertCheck("Public QR menu includes combo offers and sub menu data", backendViews.includes("combos =") && backendViews.includes("ComboOfferSerializer") && backendViews.includes('"combos"'));

const backendSerializers = await readRepo("backend/api/serializers.py");
assertCheck("Backend sale validation prevents overselling", backendSerializers.includes("has only") && backendSerializers.includes("units available"));
assertCheck("Backend sale return validation prevents over-returning", backendSerializers.includes("SaleReturnSerializer") && backendSerializers.includes("Return quantity is higher"));
assertCheck("Backend writable foreign keys are user-scoped", backendSerializers.includes("UserScopedPrimaryKeyRelatedField"));
assertCheck("Backend stock adjustments are validated and user-scoped", backendSerializers.includes("StockAdjustmentSerializer") && backendSerializers.includes("Stock cannot go below zero") && backendSerializers.includes("UserScopedPrimaryKeyRelatedField"));
assertCheck("Backend combo offers and restaurant services serializers are wired", backendSerializers.includes("ComboOfferSerializer") && backendSerializers.includes("RestaurantServiceSerializer") && backendSerializers.includes("item_inputs"));
assertCheck("Business logo upload validates type and size", backendSerializers.includes("validate_logo") && backendSerializers.includes("Logo image is too large"));
assertCheck("Business print settings upload is size-guarded", backendSerializers.includes("validate_print_settings") && backendSerializers.includes("payload is too large"));
assertCheck("Backend exposes stock status fields", backendSerializers.includes("stock_status") && backendSerializers.includes("out_of_stock"));

const ordersContext = await readFrontend("src/contexts/OrdersContext.tsx");
assertCheck("Table close skips invalid local order API PATCH", ordersContext.includes("Number.isFinite"));

const menuImages = await readFrontend("src/lib/menuImages.ts");
assertCheck("Restaurant menu replaces generic placeholders", menuImages.includes("picsum.photos") && menuImages.includes("cappuccino"));

const settings = await readRepo("backend/meropasal/settings.py");
assertCheck("Production settings require an explicit secret key", settings.includes("SECRET_KEY must be set when DEBUG=False"));
assertCheck("Production cookie and frame hardening switches exist", settings.includes("SESSION_COOKIE_SECURE") && settings.includes('X_FRAME_OPTIONS = "DENY"'));

const staffProfile = await readFrontend("src/components/StaffProfileBadge.tsx");
assertCheck("Staff password changes go through backend verification", staffProfile.includes("updateStaffPassword") && !staffProfile.includes("staffUser.password"));

const staffApi = await readFrontend("src/lib/api.ts");
assertCheck("Staff password change endpoint is wired", staffApi.includes("change-password"));
assertCheck("Public menu API is wired without auth", staffApi.includes("publicMenu") && staffApi.includes("auth: false"));
assertCheck("Restaurant combo and service APIs are wired", staffApi.includes("comboOffers") && staffApi.includes("restaurantServices") && staffApi.includes("sub_category"));
assertCheck("API wrapper reports HTML/non-JSON backend responses clearly", staffApi.includes("Backend returned an HTML page instead of JSON") && staffApi.includes("Server returned invalid JSON"));

const moduleSelection = await readFrontend("src/pages/ModuleSelection.tsx");
assertCheck("Module picker keeps finance inside business modules", !moduleSelection.includes('navigate("/finance")') && moduleSelection.includes("Namaste"));

const financeRail = await readFrontend("src/components/FinanceNavRail.tsx");
const financeNav = await readFrontend("src/lib/financeNav.ts");
assertCheck("Finance sidebar uses reference-style timeline navigation", financeRail.includes("Pinned Reports") && financeNav.includes("Day Book"));
assertCheck("Finance nav includes cash, tax, transfer, and chart pages", financeNav.includes("Cash & Banks") && financeNav.includes("Tax & Rates") && financeNav.includes("Balance Transfer") && financeNav.includes("Chart of Accounts"));

const dayBook = await readFrontend("src/pages/finance/DayBookPage.tsx");
assertCheck("Finance day book has receipts/payments table", dayBook.includes("Total Receipts [A]") && dayBook.includes("Total Payments [B]") && dayBook.includes("Credit Due"));

const financeStatementHeader = await readFrontend("src/components/FinanceStatementHeader.tsx");
assertCheck("Finance reports use business-first statutory-style statement headers", financeStatementHeader.includes("settings.businessName") && financeStatementHeader.includes("PAN / VAT No.") && financeStatementHeader.includes("Fiscal Year (AD)") && financeStatementHeader.includes("Statutory-style format"));

const financeDashboard = await readFrontend("src/pages/finance/Dashboard.tsx");
const financeReports = await readFrontend("src/pages/finance/ReportsPage.tsx");
const financeTransactions = await readFrontend("src/pages/finance/TransactionsPage.tsx");
const financeAccounts = await readFrontend("src/pages/finance/AccountsPage.tsx");
const financeBudget = await readFrontend("src/pages/finance/BudgetPage.tsx");
assertCheck("Finance dashboard overview is table-based with net total footer", financeDashboard.includes("Overview Details") && financeDashboard.includes("TableFooter") && financeDashboard.includes("Net Profit / Loss"));
assertCheck("Finance P&L statement is table-based with total footer", financeReports.includes("Profit & Loss Statement") && financeReports.includes("TableFooter") && financeReports.includes("Total Income") && financeReports.includes("Total Expenses"));
assertCheck("Finance transaction, account, and budget registers have total footers", financeTransactions.includes("TableFooter") && financeAccounts.includes("TableFooter") && financeBudget.includes("Budget Details") && financeBudget.includes("TableFooter"));

const inventoryDashboard = await readFrontend("src/pages/inventory/Dashboard.tsx");
assertCheck("Inventory dashboard has out-of-stock stat and dropdown watchlist", inventoryDashboard.includes("Out of Stock") && inventoryDashboard.includes("Stock Watchlist") && inventoryDashboard.includes("chartMode"));
assertCheck("Inventory dashboard links to stock control", inventoryDashboard.includes("/inventory/stock-control") && inventoryDashboard.includes("Stock Control"));

const adminLayout = await readFrontend("src/pages/admin/AdminLayout.tsx");
assertCheck("Admin panel navigation is grouped into dropdown sections", adminLayout.includes("navGroups") && adminLayout.includes("ChevronDown") && adminLayout.includes("openGroups"));

const restaurantLayout = await readFrontend("src/components/RestaurantLayout.tsx");
const inventoryLayout = await readFrontend("src/components/InventoryLayout.tsx");
assertCheck("Restaurant panel navigation is grouped into dropdown sections", restaurantLayout.includes("restaurantNavGroups") && restaurantLayout.includes("Restaurant Panel") && restaurantLayout.includes("SidebarMenuSub"));
assertCheck("Inventory panel navigation is grouped into dropdown sections", inventoryLayout.includes("inventoryNavGroups") && inventoryLayout.includes("Inventory Panel") && inventoryLayout.includes("SidebarMenuSub"));
assertCheck("Restaurant panel exposes Services inside catalog", restaurantLayout.includes("/restaurant/services") && restaurantLayout.includes("Services"));

const appRoutes = await readFrontend("src/App.tsx");
assertCheck("New finance reference routes are wired", appRoutes.includes("/finance/day-book") && appRoutes.includes("/finance/cash-banks") && appRoutes.includes("/finance/chart-of-accounts"));
assertCheck("QR codes and public menu routes are wired", appRoutes.includes("/restaurant/qr-codes") && appRoutes.includes("/qr-menu"));
assertCheck("Inventory stock control route is wired", appRoutes.includes("/inventory/stock-control") && appRoutes.includes("StockControlPage"));
assertCheck("Restaurant services route is wired", appRoutes.includes("/restaurant/services") && appRoutes.includes("ServicesPage"));

const financeSidebarMenu = await readFrontend("src/components/FinanceSidebarMenu.tsx");
assertCheck("Module dashboards show finance as one nested menu", financeSidebarMenu.includes("SidebarMenuSub") && financeSidebarMenu.includes("financeGroups"));

const mobileBottomNav = await readFrontend("src/components/MobileBottomNav.tsx");
assertCheck("Mobile dashboard menu avoids duplicate finance sub-items", mobileBottomNav.includes('url: "/restaurant/finance"') && !mobileBottomNav.includes('url: "/restaurant/day-book"'));
assertCheck("Mobile inventory menu exposes stock control", mobileBottomNav.includes('url: "/inventory/stock-control"'));
assertCheck("Mobile restaurant menu exposes services", mobileBottomNav.includes('url: "/restaurant/services"'));

const qrCodesPage = await readFrontend("src/pages/restaurant/QRCodesPage.tsx");
assertCheck("QR codes page generates printable menu QR cards", qrCodesPage.includes("QRCode.toDataURL") && qrCodesPage.includes("Download All QR") && qrCodesPage.includes("/qr-menu?"));
assertCheck("QR codes page supports copy, print, and download", qrCodesPage.includes("copyUrl") && qrCodesPage.includes("printQrCard") && qrCodesPage.includes("downloadQrCard"));

const publicMenuPage = await readFrontend("src/pages/PublicMenuPage.tsx");
assertCheck("Public menu page shows branded food menu from QR", publicMenuPage.includes("publicMenu.get") && publicMenuPage.includes("menuFoodImage") && publicMenuPage.includes("Table"));
assertCheck("Public menu page shows combo offers and sub menu badges", publicMenuPage.includes("Combo Offers") && publicMenuPage.includes("sub_category"));

const menuManagement = await readFrontend("src/pages/restaurant/MenuManagement.tsx");
assertCheck("Menu management supports sub menu and combo offers", menuManagement.includes("Sub Menu") && menuManagement.includes("Combo Offer") && menuManagement.includes("comboOffersApi.create"));

const servicesPage = await readFrontend("src/pages/restaurant/ServicesPage.tsx");
assertCheck("Restaurant services page supports dine in delivery SNS and stamp program", servicesPage.includes("Dine In") && servicesPage.includes("Delivery") && servicesPage.includes("Online Order / SNS") && servicesPage.includes("Stamp Program") && servicesPage.includes("Add Defaults"));

const printTemplates = await readFrontend("src/lib/printTemplates.ts");
assertCheck("KOT print template uses saved logo, header, footer, and copy count", printTemplates.includes("generateKotHTML") && printTemplates.includes("printCount") && printTemplates.includes("showLogo") && printTemplates.includes("footerText"));

const uiCard = await readFrontend("src/components/ui/card.tsx");
const uiButton = await readFrontend("src/components/ui/button.tsx");
const uiTable = await readFrontend("src/components/ui/table.tsx");
const uiInput = await readFrontend("src/components/ui/input.tsx");
const indexCss = await readFrontend("src/index.css");
assertCheck("Shared UI cards and buttons use polished shadows and touch states", uiCard.includes("bg-card/95") && uiButton.includes("shadow-primary/15") && uiButton.includes("active:scale"));
assertCheck("Shared tables have sticky headers, zebra rows, and compact cells", uiTable.includes("sticky top-0") && uiTable.includes("odd:bg-background") && uiTable.includes("p-3"));
assertCheck("Shared inputs and app shell have improved focus, background, and scroll UX", uiInput.includes("focus-visible:border-primary/60") && indexCss.includes("background-image:") && indexCss.includes("scrollbar-width: thin"));

const failed = checks.filter((check) => !check.pass);
const rows = checks.map(({ name, pass, detail }) => ({
  Check: name,
  Result: pass ? "PASS" : "FAIL",
  Detail: detail,
}));

console.table(rows);

if (failed.length > 0) {
  console.error(`QA smoke failed: ${failed.length} of ${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`QA smoke passed: ${checks.length} checks.`);

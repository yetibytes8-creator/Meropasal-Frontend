import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { businessSettings as settingsApi, type ApiBusinessSettings } from "@/lib/api";
import type { BusinessSettings, NotificationPreferences, PaymentQrSettings, PrintSettings } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  lowStock: true,
  newOrders: true,
  dailyReport: false,
  expenseApproval: true,
};

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  // These defaults are used until the client's saved business settings load.
  // Client can later customize invoice/KOT/report text from Settings.
  invoice: {
    title: "INVOICE",
    headerText: "Thank you for dining with us.",
    footerTitle: "Thank You",
    footerMessage: "Visit again",
    showLogo: true,
    showBusinessName: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showInvoiceNo: true,
    showDate: true,
    showOrderType: true,
    showTable: true,
    showPaymentMode: true,
    showQr: true,
  },
  kot: {
    title: "KOT",
    headerText: "Kitchen Order Ticket",
    footerText: "Prepare fresh and serve hot.",
    printCount: 1,
    compactView: false,
    showLogo: true,
    showBusinessName: true,
    showKotNo: true,
    showOrderType: true,
    showTable: true,
    showOrderBy: true,
    showTime: true,
    showItems: true,
    showQuantity: true,
    showRemarks: true,
  },
  report: {
    titlePrefix: "Finance Report",
    headerNote: "Official accounting statement",
    footerNote: "Prepared from business accounting records. Verify entries before tax filing or audit submission.",
    showLogo: true,
    showAddress: true,
    showPanVat: true,
    showPhoneEmail: true,
    createdByLabel: "Created By",
    checkedByLabel: "Checked By",
    printedByLabel: "Printed By",
    authorizedByLabel: "Authorized By",
  },
};

const DEFAULT_PAYMENT_QR: PaymentQrSettings = {
  // The actual QR image is uploaded by each business and saved in backend
  // BusinessSettings.system_config.paymentQr.
  provider: "esewa",
  accountName: "",
  accountNumber: "",
  showOnBill: true,
};

function mergePrintSettings(value?: Partial<PrintSettings>): PrintSettings {
  return {
    invoice: { ...DEFAULT_PRINT_SETTINGS.invoice, ...(value?.invoice ?? {}) },
    kot: { ...DEFAULT_PRINT_SETTINGS.kot, ...(value?.kot ?? {}) },
    report: { ...DEFAULT_PRINT_SETTINGS.report, ...(value?.report ?? {}) },
  };
}

function mergePaymentQr(value?: Partial<PaymentQrSettings>): PaymentQrSettings {
  return { ...DEFAULT_PAYMENT_QR, ...(value ?? {}) };
}

function toSettings(s: ApiBusinessSettings): BusinessSettings {
  // Normalize backend naming into the single shape used by the frontend.
  // This keeps older print_settings data compatible while new QR/settings live
  // under system_config.
  return {
    businessName: s.business_name,
    address: s.address,
    phone: s.phone,
    email: s.email,
    taxNumber: s.pan_vat ?? s.tax_number ?? "",
    taxRate: Number(s.tax_rate),
    currency: s.currency,
    currencySymbol: s.currency_symbol,
    receiptFooter: s.receipt_footer,
    logo: s.logo ?? undefined,
    notifications: { ...DEFAULT_NOTIFICATIONS, ...s.notifications },
    printSettings: mergePrintSettings(s.system_config?.printSettings ?? s.print_settings),
    paymentQr: mergePaymentQr(s.system_config?.paymentQr as Partial<PaymentQrSettings> | undefined),
  };
}

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Mero Pasal",
  address: "Thamel, Kathmandu, Nepal",
  phone: "+977-01-4444567",
  email: "info@meropasal.com",
  taxNumber: "",
  taxRate: 13,
  currency: "NPR",
  currencySymbol: "Rs. ",
  receiptFooter: "Thank you for visiting Mero Pasal! See you again soon.",
  notifications: DEFAULT_NOTIFICATIONS,
  printSettings: DEFAULT_PRINT_SETTINGS,
  paymentQr: DEFAULT_PAYMENT_QR,
};

interface SettingsContextType {
  settings: BusinessSettings;
  setSettings: (s: BusinessSettings | ((prev: BusinessSettings) => BusinessSettings)) => void;
  saveSettings: (s: BusinessSettings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettingsState] = useState<BusinessSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!user) return;
    settingsApi.get()
      .then((s) => setSettingsState(toSettings(s)))
      .catch(() => {});
  }, [user]);

  const setSettings = (value: BusinessSettings | ((prev: BusinessSettings) => BusinessSettings)) => {
    setSettingsState(value);
  };

  const saveSettings = async (s: BusinessSettings) => {
    // Save business identity, print templates, and payment QR together. Backend
    // merges system_config so QR is not lost when only print settings change.
    const updated = await settingsApi.update({
      business_name: s.businessName,
      address: s.address,
      phone: s.phone,
      email: s.email,
      pan_vat: s.taxNumber,
      tax_number: s.taxNumber,
      tax_rate: s.taxRate,
      currency: s.currency,
      currency_symbol: s.currencySymbol,
      receipt_footer: s.receiptFooter,
      logo: s.logo ?? null,
      notifications: s.notifications,
      system_config: { printSettings: s.printSettings, paymentQr: s.paymentQr },
      print_settings: s.printSettings,
    });
    setSettingsState(toSettings(updated));
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

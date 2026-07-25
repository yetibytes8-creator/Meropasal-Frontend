import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Download, Printer, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";

type FinanceStatementHeaderProps = {
  title: string;
  subtitle?: string;
  periodLabel?: string;
  reportNo?: string;
  basis?: string;
  onExport?: () => void;
  children?: ReactNode;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function financePrintStyles() {
  return `
    @page { size: A4; margin: 7mm 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #fff !important; color: #111827 !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, Helvetica, sans-serif !important; font-size: 9.5px; line-height: 1.22; }
    button, input, textarea, select, [role="combobox"], [data-radix-popper-content-wrapper], .recharts-tooltip-wrapper, .page-header, .page-description, [data-print-hide], .print\\:hidden { display: none !important; }
    nav, aside, header, .md\\:hidden { display: none !important; }
    .print-root { width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
    .print-root, .print-root * {
      animation: none !important;
      transition: none !important;
      min-width: 0 !important;
      max-width: 100% !important;
      overflow: visible !important;
      overflow-wrap: anywhere !important;
      word-break: normal !important;
    }
    .finance-statement-card { border: 0 !important; box-shadow: none !important; background: #fff !important; margin: 0 0 8px !important; }
    .finance-statement-card > div { padding: 0 !important; }
    .finance-print-cover, .finance-report-footer, .hidden.print\\:block, .print\\:block { display: block !important; }
    .finance-report-letterhead, .finance-report-body > div:first-child > div:not(.finance-print-cover), .finance-report-body > div:first-child > p, .finance-report-meta, .finance-report-body .flex.flex-wrap { display: none !important; }
    .finance-report-body { display: block !important; padding: 0 !important; }
    .finance-print-cover { border: 1.5px solid #111827 !important; color: #111827 !important; margin-bottom: 6px !important; }
    .finance-print-title-row { display: grid !important; grid-template-columns: 58px 1fr 88px !important; align-items: center !important; gap: 8px !important; padding: 6px 8px 4px !important; text-align: center !important; border-bottom: 1.5px solid #111827 !important; }
    .finance-print-logo, .finance-print-logo-placeholder { width: 46px !important; height: 46px !important; object-fit: contain !important; border: 1px solid #111827 !important; background: #fff !important; padding: 2px !important; }
    .finance-print-logo-placeholder { display: flex !important; align-items: center !important; justify-content: center !important; font-size: 9px !important; font-weight: 700 !important; color: #64748b !important; }
    .finance-print-title-copy h1 { margin: 0 !important; color: #1d4ed8 !important; font-size: 16px !important; font-weight: 800 !important; line-height: 1.02 !important; text-transform: uppercase !important; }
    .finance-print-title-copy h2 { margin: 2px 0 0 !important; color: #111827 !important; font-size: 12px !important; font-weight: 800 !important; line-height: 1.1 !important; }
    .finance-print-title-copy p { margin: 1px 0 0 !important; font-size: 8.5px !important; color: #111827 !important; }
    .finance-print-doc-meta { display: block !important; text-align: right !important; font-size: 8px !important; line-height: 1.35 !important; color: #111827 !important; }
    .finance-print-doc-meta strong, .finance-print-doc-meta span { display: block !important; }
    .finance-print-meta-table, table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
    .finance-print-meta-table th, .finance-print-meta-table td { border: 1px solid #5793c2 !important; padding: 2px 5px !important; font-size: 9px !important; }
    .finance-print-meta-table th { width: 18% !important; background: #cfe2f5 !important; color: #111827 !important; font-weight: 800 !important; text-transform: uppercase !important; }
    .finance-print-meta-table td { background: #f8fbff !important; font-weight: 600 !important; }
    .grid { display: grid !important; gap: 8px !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3, .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    [data-print-hide], .print\\:hidden { display: none !important; }
    .space-y-6 > * + * { margin-top: 7px !important; }
    .rounded-xl, .rounded-lg, [class*="rounded-"] { border-radius: 2px !important; }
    .border, [class*="border"] { border-color: #111827 !important; }
    .shadow, .shadow-sm, .shadow-lg, [class*="shadow-"] { box-shadow: none !important; }
    .bg-card, .bg-white, .bg-muted\\/20, .bg-muted\\/25, .bg-muted\\/60 { background: #fff !important; }
    .text-muted-foreground { color: #475569 !important; }
    .text-success { color: #047857 !important; }
    .text-destructive, .text-primary { color: #dc2626 !important; }
    .font-bold, .font-semibold, .font-extrabold { font-weight: 800 !important; }
    h1, h2, h3, p { margin-top: 0; }
    th, td {
      border: 1px solid #111827 !important;
      padding: 3px 5px !important;
      color: #111827 !important;
      height: auto !important;
      font-size: 8.8px !important;
      line-height: 1.25 !important;
      vertical-align: top !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }
    th { background: #e5e7eb !important; font-weight: 800 !important; text-transform: uppercase; }
    th:first-child, td:first-child { width: 22px !important; min-width: 22px !important; max-width: 28px !important; text-align: center !important; white-space: nowrap !important; }
    .finance-print-meta-table th:first-child, .finance-print-meta-table td:first-child,
    .finance-print-meta-table th:nth-child(3), .finance-print-meta-table td:nth-child(3) {
      width: 18% !important;
      min-width: 18% !important;
      max-width: none !important;
      text-align: left !important;
      white-space: normal !important;
    }
    .finance-print-meta-table td:nth-child(2), .finance-print-meta-table td:nth-child(4) {
      width: 32% !important;
      min-width: 32% !important;
      max-width: none !important;
      text-align: left !important;
      white-space: normal !important;
    }
    .finance-print-details-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      border-top: 1px solid #111827 !important;
      border-left: 1px solid #111827 !important;
    }
    .finance-print-detail-item {
      display: grid !important;
      grid-template-columns: 34% 1fr !important;
      align-items: start !important;
      gap: 5px !important;
      min-height: 22px !important;
      padding: 4px 6px !important;
      border-right: 1px solid #111827 !important;
      border-bottom: 1px solid #111827 !important;
      background: #fff !important;
      overflow: hidden !important;
    }
    .finance-print-detail-label {
      display: block !important;
      margin: 0 !important;
      color: #475569 !important;
      font-size: 7.5px !important;
      font-weight: 800 !important;
      line-height: 1.2 !important;
      text-transform: uppercase !important;
      white-space: normal !important;
    }
    .finance-print-detail-value {
      display: block !important;
      color: #111827 !important;
      font-size: 9px !important;
      font-weight: 800 !important;
      line-height: 1.22 !important;
      overflow-wrap: anywhere !important;
      white-space: normal !important;
    }
    .finance-print-status-card table th,
    .finance-print-status-card table td {
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      text-align: center !important;
      white-space: normal !important;
    }
    .finance-accounting-register-table {
      table-layout: fixed !important;
      font-size: 8px !important;
    }
    .finance-accounting-register-table th,
    .finance-accounting-register-table td {
      padding: 3px 4px !important;
      overflow-wrap: anywhere !important;
      word-break: normal !important;
      white-space: normal !important;
      text-align: left !important;
    }
    .finance-accounting-register-table th:first-child,
    .finance-accounting-register-table td:first-child {
      width: 12% !important;
      min-width: 12% !important;
      max-width: none !important;
      text-align: left !important;
    }
    .finance-accounting-register-table [data-column-key="voucher_date"],
    .finance-accounting-register-table [data-column-key="date"] { width: 12% !important; }
    .finance-accounting-register-table [data-column-key="voucher_no"],
    .finance-accounting-register-table [data-column-key="reference"],
    .finance-accounting-register-table [data-column-key="invoice"] { width: 13% !important; }
    .finance-accounting-register-table [data-column-key="debit_account"],
    .finance-accounting-register-table [data-column-key="credit_account"],
    .finance-accounting-register-table [data-column-key="account"],
    .finance-accounting-register-table [data-column-key="party"] { width: 17% !important; }
    .finance-accounting-register-table [data-column-key="amount"],
    .finance-accounting-register-table [data-column-key="net"],
    .finance-accounting-register-table [data-column-key="profit"] {
      width: 10% !important;
      text-align: right !important;
      white-space: nowrap !important;
    }
    .finance-accounting-register-table [data-column-key="narration"],
    .finance-accounting-register-table [data-column-key="remarks"],
    .finance-accounting-register-table [data-column-key="reason"] { width: 22% !important; }
    .finance-accounting-register-table [data-column-key="status"],
    .finance-accounting-register-table [data-column-key="type"] { width: 10% !important; }
    .coa-print-report { display: block !important; margin-top: 6px !important; }
    .coa-print-section-title {
      margin: 8px 0 4px !important;
      color: #111827 !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
    }
    .coa-print-table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      margin-bottom: 6px !important;
    }
    .coa-print-table th,
    .coa-print-table td {
      border: 1px solid #111827 !important;
      padding: 3px 5px !important;
      font-size: 8.3px !important;
      line-height: 1.2 !important;
      text-align: left !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }
    .coa-print-table th {
      background: #e5e7eb !important;
      color: #111827 !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
    }
    .coa-print-table th:first-child,
    .coa-print-table td:first-child {
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      text-align: left !important;
    }
    .coa-group-table th:nth-child(1),
    .coa-group-table td:nth-child(1) { width: 13% !important; }
    .coa-group-table th:nth-child(2),
    .coa-group-table td:nth-child(2) { width: 22% !important; }
    .coa-group-table th:nth-child(3),
    .coa-group-table td:nth-child(3) { width: 65% !important; }
    .coa-ledger-table th:nth-child(1),
    .coa-ledger-table td:nth-child(1) { width: 9% !important; }
    .coa-ledger-table th:nth-child(2),
    .coa-ledger-table td:nth-child(2) { width: 22% !important; }
    .coa-ledger-table th:nth-child(3),
    .coa-ledger-table td:nth-child(3) { width: 11% !important; }
    .coa-ledger-table th:nth-child(4),
    .coa-ledger-table td:nth-child(4),
    .coa-ledger-table th:nth-child(5),
    .coa-ledger-table td:nth-child(5) { width: 15% !important; }
    .coa-ledger-table th:nth-child(6),
    .coa-ledger-table td:nth-child(6) { width: 8% !important; }
    .coa-ledger-table th:nth-child(7),
    .coa-ledger-table td:nth-child(7),
    .coa-ledger-table th:nth-child(8),
    .coa-ledger-table td:nth-child(8) {
      width: 10% !important;
      text-align: right !important;
      white-space: nowrap !important;
    }
    tfoot td, tr[class*="font-semibold"] td { background: #f8fafc !important; font-weight: 800 !important; }
    .print-root svg:not(.finance-print-keep-icon) { display: none !important; }
    .finance-report-footer { border: 1.5px solid #111827 !important; padding: 8px 8px 6px !important; page-break-inside: avoid !important; break-inside: avoid !important; margin-top: 10px !important; }
    .finance-signature-grid { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 8px !important; }
    .finance-signature-image-wrap { height: 24px !important; margin-top: 4px !important; display: flex !important; align-items: flex-end !important; }
    .finance-signature-image { max-width: 100% !important; max-height: 24px !important; object-fit: contain !important; object-position: left bottom !important; }
    .finance-signature-name { min-height: 16px !important; margin-top: 2px !important; border-bottom: 1px solid #94a3b8 !important; padding-bottom: 1px !important; font-size: 8px !important; color: #111827 !important; }
    .finance-signature-label { margin: 0 !important; font-size: 9px !important; font-weight: 800 !important; color: #111827 !important; }
    .finance-signature-caption, .finance-signature-note, .finance-report-footer-note { font-size: 8px !important; color: #475569 !important; }
    [data-print-keep], tr { break-inside: avoid; page-break-inside: avoid; }
  `;
}

function waitForImages(doc: Document) {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();
  return Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }),
  );
}

function fiscalYearLabel(date = new Date()) {
  const year = date.getFullYear();
  const fiscalStartReached = date.getMonth() > 6 || (date.getMonth() === 6 && date.getDate() >= 16);
  const startYear = fiscalStartReached ? year : year - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date().toLocaleDateString() : date.toLocaleDateString();
}

export default function FinanceStatementHeader({
  title,
  subtitle,
  periodLabel,
  reportNo,
  basis = "Accrual / cash mixed, based on recorded transactions",
  onExport,
  children,
}: FinanceStatementHeaderProps) {
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const [reportDateInput, setReportDateInput] = useState(() => dateInputValue());
  const preparedAt = new Date().toLocaleString();
  const preparedDate = displayDate(reportDateInput);
  const reportDate = new Date(`${reportDateInput}T00:00:00`);
  const operatorName = profile?.full_name || user?.email || "System User";
  const reportSettings = settings.printSettings.report;
  const originalTitleRef = useRef<string | null>(null);
  const clientBusinessName = settings.businessName || "Business";
  const printTitle = `${clientBusinessName} - ${title}`;

  const applyClientPrintTitle = useCallback(() => {
    // Browser print preview shows document.title at the top. Use the client's
    // business name there, then restore the app title after printing.
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    document.title = printTitle;
  }, [printTitle]);

  const restoreAppTitle = useCallback(() => {
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
  }, []);

  const handlePrint = useCallback(() => {
    applyClientPrintTitle();
    const source = document.querySelector(".print-root") as HTMLElement | null;
    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!source || !printWindow) {
      restoreAppTitle();
      return;
    }
    const reportNode = source.cloneNode(true) as HTMLElement;
    const reportFooter = reportNode.querySelector(".finance-report-footer");

    // Keep approval/signature blocks at the bottom of the printed report.
    // In the live screen this footer belongs to the header component, but the
    // printable document should read like a formal statement: letterhead,
    // tables, summaries, then prepared/checked/printed/authorized by.
    if (reportFooter) {
      reportFooter.parentElement?.removeChild(reportFooter);
      reportNode.appendChild(reportFooter);
    }

    const reportHtml = reportNode.outerHTML;

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="/logo.png?v=mero-pasal-print" />
    <title>${escapeHtml(printTitle)}</title>
    <style>${financePrintStyles()}</style>
  </head>
  <body>${reportHtml}</body>
</html>`);
    printWindow.document.close();
    printWindow.onafterprint = () => {
      printWindow.close();
      restoreAppTitle();
    };
    waitForImages(printWindow.document).finally(() => {
      printWindow.focus();
      printWindow.print();
    });
  }, [applyClientPrintTitle, printTitle, restoreAppTitle]);

  useEffect(() => {
    window.addEventListener("beforeprint", applyClientPrintTitle);
    window.addEventListener("afterprint", restoreAppTitle);
    return () => {
      window.removeEventListener("beforeprint", applyClientPrintTitle);
      window.removeEventListener("afterprint", restoreAppTitle);
      restoreAppTitle();
    };
  }, [applyClientPrintTitle, restoreAppTitle]);

  const signatureRoles = [
    {
      label: reportSettings.createdByLabel || "Created By",
      name: reportSettings.createdByName || operatorName,
      signature: reportSettings.createdBySignature,
      note: reportSettings.createdByNote,
    },
    {
      label: reportSettings.checkedByLabel || "Checked By",
      name: reportSettings.checkedByName,
      signature: reportSettings.checkedBySignature,
      note: reportSettings.checkedByNote,
    },
    {
      label: reportSettings.printedByLabel || "Printed By",
      name: reportSettings.printedByName || operatorName,
      signature: reportSettings.printedBySignature,
      note: reportSettings.printedByNote,
    },
    {
      label: reportSettings.authorizedByLabel || "Authorized By",
      name: reportSettings.authorizedByName,
      signature: reportSettings.authorizedBySignature,
      note: reportSettings.authorizedByNote,
    },
  ];

  return (
    <Card className="finance-statement-card border-primary/15 bg-card print:border print:shadow-none">
      <CardContent className="p-4 sm:p-5 print:p-0">
        <div className="finance-print-cover hidden print:block">
          {/* Print-only letterhead: keeps reports looking like a document instead
              of printing the dashboard UI. */}
          <div className="finance-print-title-row">
            {settings.logo && reportSettings.showLogo ? (
              <img src={settings.logo} alt={settings.businessName} className="finance-print-logo" />
            ) : (
              <div className="finance-print-logo-placeholder">LOGO</div>
            )}
            <div className="finance-print-title-copy">
              <h1>{title}</h1>
              <h2>{clientBusinessName}</h2>
              {reportSettings.headerNote && <p className="finance-print-header-note">{reportSettings.headerNote}</p>}
              {reportSettings.showAddress && <p>{settings.address || "Address not set"}</p>}
              <p>
                {reportSettings.showPanVat && <>PAN/VAT: <strong>{settings.taxNumber || "Not set"}</strong></>}
                {reportSettings.showPhoneEmail && settings.phone ? ` | Phone: ${settings.phone}` : ""}
                {reportSettings.showPhoneEmail && settings.email ? ` | Email: ${settings.email}` : ""}
              </p>
            </div>
            <div className="finance-print-doc-meta">
              <span>Report Date: {preparedDate}</span>
              <span>No: {reportNo || "-"}</span>
            </div>
          </div>
          <table className="finance-print-meta-table">
            <tbody>
              <tr>
                <th>Company Name</th>
                <td>{clientBusinessName}</td>
                <th>Report Date</th>
                <td>{preparedDate}</td>
              </tr>
              <tr>
                <th>Department</th>
                <td>{reportSettings.titlePrefix || "Finance / Accounts"}</td>
                <th>Report No.</th>
                <td>{reportNo || "-"}</td>
              </tr>
              <tr>
                <th>Fiscal Year</th>
                <td>{fiscalYearLabel(reportDate)}</td>
                <th>Prepared At</th>
                <td>{preparedAt}</td>
              </tr>
              <tr>
                <th>Basis</th>
                <td colSpan={3}>{basis}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="finance-report-letterhead mb-5 hidden rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            {settings.logo && (
              <img
                src={settings.logo}
                alt={settings.businessName}
                className="h-16 w-16 rounded-lg border bg-white object-contain p-1 print:h-14 print:w-14"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-extrabold leading-tight print:text-xl">{clientBusinessName}</p>
              {settings.address && <p className="mt-1 text-sm text-muted-foreground print:text-[11px] print:text-slate-700">{settings.address}</p>}
              <p className="mt-1 text-xs text-muted-foreground print:text-[10px] print:text-slate-700">
                PAN/VAT: <span className="font-semibold text-foreground">{settings.taxNumber || "Not set"}</span>
                {settings.phone ? ` | Phone: ${settings.phone}` : ""}
                {settings.email ? ` | Email: ${settings.email}` : ""}
              </p>
            </div>
            <div className="hidden min-w-32 text-right text-[10px] text-muted-foreground print:block">
              <p className="font-semibold uppercase tracking-wide text-slate-900">Finance Report</p>
              <p>Date: {preparedDate}</p>
              {reportNo && <p>No: {reportNo}</p>}
            </div>
          </div>
        </div>
        <div className="finance-report-body flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:p-4">
          <div className="min-w-0 space-y-3">
            <div className="min-w-0 print:hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Finance Statement</p>
              <h2 className="text-xl font-bold leading-tight sm:text-2xl">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>

            <div className="finance-report-meta hidden gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4 print:grid">
              <div className="rounded-lg border bg-muted/25 p-2">
                <p className="text-muted-foreground">Business</p>
                <p className="font-semibold truncate">{clientBusinessName}</p>
              </div>
              <div className="rounded-lg border bg-muted/25 p-2">
                <p className="text-muted-foreground">PAN / VAT No.</p>
                <p className="font-semibold truncate">{settings.taxNumber || "Not set"}</p>
              </div>
              <div className="rounded-lg border bg-muted/25 p-2">
                <p className="text-muted-foreground">Fiscal Year (AD)</p>
                <p className="font-semibold">{fiscalYearLabel(reportDate)}</p>
              </div>
              <div className="rounded-lg border bg-muted/25 p-2">
                <p className="text-muted-foreground">Prepared At</p>
                <p className="font-semibold truncate">{preparedAt}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              {periodLabel && (
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {periodLabel}
                </Badge>
              )}
              {reportNo && <Badge variant="outline">Report No: {reportNo}</Badge>}
              <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Statutory-style format
              </Badge>
            </div>
            <p className="hidden text-xs text-muted-foreground print:block">
              Basis: {basis}. Verify with a registered accountant before official filing.
            </p>
            {children}
          </div>

          <div className="flex flex-col gap-2 print:hidden sm:flex-row lg:items-end">
            <div className="min-w-36">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Report Date</p>
              <Input
                type="date"
                value={reportDateInput}
                onChange={(event) => setReportDateInput(event.target.value || dateInputValue())}
                className="h-10"
              />
            </div>
            {onExport && (
              <Button variant="outline" className="h-10 gap-2" onClick={onExport}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Button className="h-10 gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
        <div className="finance-report-footer hidden border-t px-4 py-3 text-[10px] text-slate-700 print:block">
          <div className="finance-signature-grid grid grid-cols-4 gap-4">
            {signatureRoles.map((role) => (
              <div className="finance-signature-box" key={role.label}>
                <p className="finance-signature-label font-semibold text-slate-900">{role.label}</p>
                <div className="finance-signature-image-wrap mt-1 min-h-6">
                  {role.signature && <img src={role.signature} alt={`${role.label} signature`} className="finance-signature-image max-h-8 object-contain" />}
                </div>
                <p className="finance-signature-name mt-1 min-h-6 border-b pb-1 font-medium">{role.name || "\u00a0"}</p>
                <p className="finance-signature-caption pt-1 text-[9px]">Name / Signature</p>
                {role.note && <p className="finance-signature-note pt-0.5 text-[9px]">{role.note}</p>}
              </div>
            ))}
          </div>
          <p className="finance-report-footer-note mt-3 text-center">
            Printed At: {preparedAt}. {reportSettings.footerNote}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

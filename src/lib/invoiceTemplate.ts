import { esc } from "@/lib/html-escape";
import type { BusinessSettings } from "@/types";

export interface PrintableInvoiceLine {
  name: string;
  code?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface PrintableInvoice {
  title?: string;
  copyLabel?: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerTaxNumber?: string;
  orderType?: string;
  tableText?: string | null;
  paymentMode?: string;
  lines: PrintableInvoiceLine[];
  subtotal: number;
  discountAmount?: number;
  discountLabel?: string;
  taxPercent?: number;
  taxAmount?: number;
  total: number;
  qrDataUrl?: string;
  qrCaption?: string;
  terms?: string[];
  note?: string;
}

const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numberWordsUnderOneLakh = (value: number): string => {
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  if (value < 20) return ones[value];
  if (value < 100) return `${tens[Math.floor(value / 10)]} ${ones[value % 10]}`.trim();
  if (value < 1000) return `${ones[Math.floor(value / 100)]} hundred ${numberWordsUnderOneLakh(value % 100)}`.trim();
  return `${numberWordsUnderOneLakh(Math.floor(value / 1000))} thousand ${numberWordsUnderOneLakh(value % 1000)}`.trim();
};

const amountInWords = (amount: number) => {
  const rounded = Math.round(Number(amount || 0));
  if (rounded <= 0) return "ZERO RUPEES ONLY";
  if (rounded < 100000) return `${numberWordsUnderOneLakh(rounded).toUpperCase()} RUPEES ONLY`;
  return `${rounded.toLocaleString("en-IN")} RUPEES ONLY`;
};

export const generateTaxInvoiceHTML = (invoice: PrintableInvoice, settings: BusinessSettings) => {
  const title = invoice.title || settings.printSettings.invoice.title || "TAX INVOICE";
  const taxLabel = settings.taxNumber ? `PAN/VAT: ${settings.taxNumber}` : "PAN/VAT: Not set";
  const contact = [settings.phone, settings.email].filter(Boolean).join(" | ");
  const terms = invoice.terms?.length
    ? invoice.terms
    : [
        "Goods once sold can be returned only as per business return policy.",
        "Please verify invoice, quantity, and amount before leaving the counter.",
        "This invoice is prepared from the business billing records.",
      ];
  const taxable = Math.max(0, invoice.subtotal - (invoice.discountAmount || 0));
  const taxPercent = Number(invoice.taxPercent || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const totalQty = invoice.lines.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const footerMessage = invoice.note || settings.printSettings.invoice.footerMessage || settings.receiptFooter;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/png" href="/logo.png?v=mero-pasal-print" />
  <title>${esc(title)} ${esc(invoice.invoiceNo)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .sheet { width: 190mm; min-height: 277mm; margin: 0 auto; background: white; padding: 8mm; }
    .brand { display: grid; grid-template-columns: 1fr 38mm; gap: 8mm; align-items: start; }
    .business-name { font-size: 26px; line-height: 1; font-weight: 900; letter-spacing: .5px; color: #1f255f; text-transform: uppercase; }
    .tagline { margin-top: 5px; display: inline-block; background: #0f9f96; color: white; font-weight: 700; padding: 5px 10px; font-size: 12px; }
    .business-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 5mm; font-size: 12px; line-height: 1.45; }
    .logo-box { display: flex; align-items: center; justify-content: center; min-height: 30mm; }
    .logo-box img { max-width: 34mm; max-height: 30mm; object-fit: contain; }
    .logo-fallback { width: 28mm; height: 28mm; border: 2px solid #0f9f96; display: grid; place-items: center; color: #1f255f; font-weight: 900; }
    .invoice-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1.5px solid #111; margin-top: 5mm; align-items: center; }
    .invoice-strip > div { padding: 5px 8px; font-size: 13px; font-weight: 800; }
    .invoice-strip .title { text-align: center; font-size: 18px; border-left: 1.5px solid #111; border-right: 1.5px solid #111; }
    .invoice-strip .copy { text-align: right; font-size: 11px; }
    .details { display: grid; grid-template-columns: 1.1fr 1.4fr; border-left: 1.5px solid #111; border-right: 1.5px solid #111; border-bottom: 1.5px solid #111; }
    .box { min-height: 36mm; }
    .box + .box { border-left: 1.5px solid #111; }
    .box-title { text-align: center; font-size: 11px; font-weight: 800; padding: 4px; border-bottom: 1.5px solid #111; background: #f8fafc; }
    .kv { display: grid; grid-template-columns: 28mm 1fr; gap: 3px; padding: 3px 6px; font-size: 12px; }
    .kv b { font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1.5px solid #111; padding: 5px 5px; vertical-align: top; }
    th { background: #f8fafc; font-weight: 800; text-align: center; }
    .items td { height: 8mm; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    .product { font-weight: 800; }
    .blank td { height: 82mm; border-top: 0; border-bottom: 0; }
    .words { border-left: 1.5px solid #111; border-right: 1.5px solid #111; border-bottom: 1.5px solid #111; padding: 7px 8px; font-size: 13px; }
    .tax-table { margin-top: 0; }
    .footer-grid { display: grid; grid-template-columns: 1.2fr .9fr; border-left: 1.5px solid #111; border-right: 1.5px solid #111; border-bottom: 1.5px solid #111; }
    .footer-grid > div + div { border-left: 1.5px solid #111; }
    .section-title { text-align: center; font-size: 12px; font-weight: 800; padding: 4px; border-bottom: 1.5px solid #111; background: #f8fafc; }
    .bank-body { display: grid; grid-template-columns: 1fr 30mm; gap: 6mm; padding: 6px; min-height: 44mm; }
    .bank-lines { font-size: 12px; line-height: 1.65; }
    .qr img { width: 28mm; height: 28mm; object-fit: contain; }
    .terms { border-top: 1.5px solid #111; padding: 6px; font-size: 11px; min-height: 24mm; }
    .signature { display: grid; grid-template-rows: 18mm 25mm 7mm; min-height: 50mm; text-align: center; font-size: 11px; }
    .signature > div { padding: 6px; }
    .signature .sign-line { border-top: 1.5px solid #111; align-self: end; font-weight: 800; }
    .thanks { margin-top: 5mm; font-size: 13px; }
    @media print {
      body { background: white; }
      .sheet { width: auto; min-height: auto; margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="brand">
      <div>
        <div class="business-name">${esc(settings.businessName || "My Business")}</div>
        ${settings.printSettings.invoice.headerText ? `<div class="tagline">${esc(settings.printSettings.invoice.headerText)}</div>` : ""}
        <div class="business-meta">
          <div>${esc(settings.address || "Business address")}</div>
          <div class="right">${contact ? esc(contact) : "Phone / Email"}<br />${esc(taxLabel)}</div>
        </div>
      </div>
      <div class="logo-box">
        ${settings.logo && settings.printSettings.invoice.showLogo ? `<img src="${esc(settings.logo)}" alt="logo" />` : `<div class="logo-fallback">LOGO</div>`}
      </div>
    </section>

    <section class="invoice-strip">
      <div>${esc(taxLabel)}</div>
      <div class="title">${esc(title.toUpperCase())}</div>
      <div class="copy">${esc(invoice.copyLabel || "ORIGINAL FOR RECIPIENT")}</div>
    </section>

    <section class="details">
      <div class="box">
        <div class="box-title">Customer Detail</div>
        <div class="kv"><b>M/S</b><span>${esc(invoice.customerName || "Walk-in Customer")}</span></div>
        <div class="kv"><b>Address</b><span>${esc(invoice.customerAddress || "-")}</span></div>
        <div class="kv"><b>Phone</b><span>${esc(invoice.customerPhone || "-")}</span></div>
        <div class="kv"><b>PAN/VAT</b><span>${esc(invoice.customerTaxNumber || "-")}</span></div>
      </div>
      <div class="box">
        <div class="box-title">Invoice Detail</div>
        <div class="kv"><b>Invoice No.</b><span>${esc(invoice.invoiceNo)}</span></div>
        <div class="kv"><b>Invoice Date</b><span>${esc(invoice.invoiceDate)}</span></div>
        ${invoice.orderType ? `<div class="kv"><b>Order Type</b><span>${esc(invoice.orderType)}${invoice.tableText ? ` - ${esc(invoice.tableText)}` : ""}</span></div>` : ""}
        ${invoice.paymentMode ? `<div class="kv"><b>Payment</b><span>${esc(invoice.paymentMode)}</span></div>` : ""}
      </div>
    </section>

    <table class="items">
      <thead>
        <tr>
          <th style="width:10mm">Sr.</th>
          <th>Name of Product / Service</th>
          <th style="width:26mm">HSN / SAC</th>
          <th style="width:22mm">Qty</th>
          <th style="width:28mm">Rate</th>
          <th style="width:32mm">Taxable Value</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lines.map((item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td class="product">${esc(item.name)}</td>
            <td class="center">${esc(item.code || "-")}</td>
            <td class="center">${esc(item.quantity)}</td>
            <td class="right">${money(item.rate)}</td>
            <td class="right">${money(item.amount)}</td>
          </tr>`).join("")}
        <tr class="blank"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        ${invoice.discountAmount ? `<tr><td colspan="5" class="right bold">Discount${invoice.discountLabel ? ` (${esc(invoice.discountLabel)})` : ""}</td><td class="right bold">-${money(invoice.discountAmount)}</td></tr>` : ""}
        ${taxAmount ? `<tr><td colspan="5" class="right bold">VAT / Tax (${taxPercent.toFixed(2)}%)</td><td class="right">${money(taxAmount)}</td></tr>` : ""}
        <tr>
          <td colspan="3" class="right bold">Total</td>
          <td class="center bold">${totalQty}</td>
          <td></td>
          <td class="right bold">${money(invoice.total)}</td>
        </tr>
      </tbody>
    </table>

    <div class="words">
      <div>Total in words</div>
      <div class="bold">${amountInWords(invoice.total)}</div>
    </div>

    <table class="tax-table">
      <thead>
        <tr><th>HSN / SAC</th><th>Taxable Value</th><th>Tax %</th><th>Tax Amount</th><th>Total</th></tr>
      </thead>
      <tbody>
        <tr><td>-</td><td class="right">${money(taxable)}</td><td class="center">${taxPercent.toFixed(2)}</td><td class="right">${money(taxAmount)}</td><td class="right">${money(invoice.total)}</td></tr>
      </tbody>
    </table>

    <section class="footer-grid">
      <div>
        <div class="section-title">Bank / Payment Details</div>
        <div class="bank-body">
          <div class="bank-lines">
            <b>Name</b>: ${esc(settings.businessName || "Business")}<br />
            <b>Payment</b>: Cash / Card / QR / Online<br />
            <b>Contact</b>: ${esc(contact || "-")}<br />
            <b>PAN/VAT</b>: ${esc(settings.taxNumber || "Not set")}
          </div>
          <div class="qr center">
            ${invoice.qrDataUrl ? `<img src="${esc(invoice.qrDataUrl)}" alt="QR" /><div class="bold">Scan / Pay</div>` : ""}
          </div>
        </div>
        <div class="section-title">Terms and Conditions</div>
        <div class="terms">${terms.map((term) => esc(term)).join("<br />")}</div>
        <div class="section-title">Customer Signature</div>
      </div>
      <div class="signature">
        <div class="bold">Certified that the particulars given above are true and correct.</div>
        <div>For ${esc(settings.businessName || "Business")}</div>
        <div class="sign-line">Authorised Signatory</div>
      </div>
    </section>

    <p class="thanks">${esc(footerMessage || "Thank you for shopping with us!")}</p>
  </main>
</body>
</html>`;
};

export const generateThermalInvoiceHTML = (invoice: PrintableInvoice, settings: BusinessSettings) => {
  const receipt = settings.printSettings.invoice;
  const title = invoice.title || receipt.title || "TAX INVOICE";
  const taxLabel = settings.taxNumber ? `PAN/VAT: ${settings.taxNumber}` : "PAN/VAT: Not set";
  const contact = [receipt.showPhone ? settings.phone : "", receipt.showEmail ? settings.email : ""].filter(Boolean).join(" | ");
  const footerMessage = invoice.note || receipt.footerMessage || settings.receiptFooter || "Thank you for your visit!";
  const totalQty = invoice.lines.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const discount = Number(invoice.discountAmount || 0);
  const taxPercent = Number(invoice.taxPercent || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const taxable = Math.max(0, invoice.subtotal - discount);
  const terms = invoice.terms?.length
    ? invoice.terms
    : [
        "Please verify items and amount before leaving counter.",
        "Goods/services return follows business policy.",
      ];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/png" href="/logo.png?v=mero-pasal-print" />
  <title>${esc(title)} ${esc(invoice.invoiceNo)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      width: 80mm;
      margin: 0;
      background: #fff;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.32;
    }
    .receipt { width: 80mm; padding: 4mm 3.5mm 5mm; }
    .center { text-align: center; }
    .right { text-align: right; }
    .muted { color: #444; }
    .bold { font-weight: 800; }
    .brand-logo { display: block; max-width: 20mm; max-height: 14mm; object-fit: contain; margin: 0 auto 2mm; }
    .business-name { font-size: 15px; line-height: 1.1; font-weight: 900; text-transform: uppercase; }
    .tagline { margin-top: 1mm; font-size: 9px; font-weight: 700; }
    .divider { border-top: 1px dashed #111; margin: 2.5mm 0; }
    .solid { border-top: 1px solid #111; margin: 2.5mm 0; }
    .row { display: flex; justify-content: space-between; gap: 3mm; }
    .row span:last-child { text-align: right; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 3mm; }
    .title { border: 1px solid #111; padding: 1.5mm; font-size: 12px; font-weight: 900; text-align: center; letter-spacing: .5px; }
    .copy { margin-top: 1mm; font-size: 9px; text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    th { border-bottom: 1px solid #111; padding: 1.5mm 0; font-size: 9px; text-align: left; }
    td { padding: 1.4mm 0; vertical-align: top; }
    .qty, .rate, .amount { text-align: right; white-space: nowrap; }
    .qty { width: 9mm; }
    .rate { width: 16mm; }
    .amount { width: 18mm; font-weight: 700; }
    .item-name { font-weight: 700; word-break: break-word; }
    .summary { margin-top: 1mm; }
    .summary .row { padding: .6mm 0; }
    .grand { border-top: 1px solid #111; border-bottom: 1px solid #111; margin-top: 1mm; padding: 1.5mm 0; font-size: 14px; font-weight: 900; }
    .words { margin-top: 2mm; font-size: 9px; text-transform: uppercase; }
    .tax-box { margin-top: 2mm; border: 1px solid #111; padding: 1.5mm; font-size: 9px; }
    .qr img { width: 24mm; height: 24mm; object-fit: contain; margin-top: 1mm; }
    .terms { font-size: 9px; }
    .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 8mm; font-size: 9px; }
    .sign-line { border-top: 1px solid #111; padding-top: 1mm; text-align: center; }
    @media print {
      html, body { width: 80mm; background: #fff; }
      .receipt { padding: 3mm; }
    }
  </style>
</head>
<body>
  <main class="receipt">
    <section class="center">
      ${settings.logo && receipt.showLogo ? `<img class="brand-logo" src="${esc(settings.logo)}" alt="logo" />` : ""}
      ${receipt.showBusinessName ? `<div class="business-name">${esc(settings.businessName || "My Business")}</div>` : ""}
      ${receipt.headerText ? `<div class="tagline">${esc(receipt.headerText)}</div>` : ""}
      ${receipt.showAddress && settings.address ? `<div class="muted">${esc(settings.address)}</div>` : ""}
      ${contact ? `<div class="muted">${esc(contact)}</div>` : ""}
      <div class="muted">${esc(taxLabel)}</div>
    </section>

    <div class="divider"></div>
    <div class="title">${esc(title.toUpperCase())}</div>
    <div class="copy">${esc(invoice.copyLabel || "CUSTOMER COPY")}</div>

    <section class="meta-grid" style="margin-top: 2mm;">
      <div><b>No:</b> ${esc(invoice.invoiceNo)}</div>
      <div class="right"><b>Date:</b> ${esc(invoice.invoiceDate)}</div>
      <div><b>Customer:</b> ${esc(invoice.customerName || "Walk-in")}</div>
      <div class="right"><b>Type:</b> ${esc(invoice.orderType || "-")}</div>
      ${invoice.tableText ? `<div><b>Table:</b> ${esc(invoice.tableText)}</div>` : ""}
      ${invoice.paymentMode ? `<div class="right"><b>Pay:</b> ${esc(invoice.paymentMode)}</div>` : ""}
    </section>

    <div class="solid"></div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="qty">Qty</th>
          <th class="rate">Rate</th>
          <th class="amount">Amt</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lines.map((item) => `
          <tr>
            <td>
              <div class="item-name">${esc(item.name)}</div>
              ${item.code ? `<div class="muted">Code: ${esc(item.code)}</div>` : ""}
            </td>
            <td class="qty">${esc(item.quantity)}</td>
            <td class="rate">${money(item.rate).replace("Rs. ", "")}</td>
            <td class="amount">${money(item.amount).replace("Rs. ", "")}</td>
          </tr>`).join("")}
      </tbody>
    </table>

    <div class="divider"></div>
    <section class="summary">
      <div class="row"><span>Total Qty</span><span>${totalQty}</span></div>
      <div class="row"><span>Subtotal</span><span>${money(invoice.subtotal)}</span></div>
      ${discount ? `<div class="row"><span>Discount${invoice.discountLabel ? ` (${esc(invoice.discountLabel)})` : ""}</span><span>-${money(discount)}</span></div>` : ""}
      ${taxAmount ? `<div class="row"><span>VAT/Tax (${taxPercent.toFixed(2)}%)</span><span>${money(taxAmount)}</span></div>` : ""}
      <div class="row grand"><span>GRAND TOTAL</span><span>${money(invoice.total)}</span></div>
    </section>

    <div class="words"><b>In words:</b><br />${amountInWords(invoice.total)}</div>

    <section class="tax-box">
      <div class="row"><span>Taxable Value</span><span>${money(taxable)}</span></div>
      <div class="row"><span>Tax %</span><span>${taxPercent.toFixed(2)}</span></div>
      <div class="row"><span>Tax Amount</span><span>${money(taxAmount)}</span></div>
    </section>

    ${invoice.qrDataUrl ? `
      <section class="qr center">
        <img src="${esc(invoice.qrDataUrl)}" alt="QR" />
        <div class="bold">${esc(invoice.qrCaption || "Scan / Pay")}</div>
      </section>` : ""}

    <div class="divider"></div>
    <section class="terms">
      ${terms.map((term) => `<div>${esc(term)}</div>`).join("")}
    </section>

    <section class="signature">
      <div class="sign-line">Customer</div>
      <div class="sign-line">Cashier</div>
    </section>

    <div class="divider"></div>
    <div class="center bold">${esc(footerMessage)}</div>
  </main>
</body>
</html>`;
};

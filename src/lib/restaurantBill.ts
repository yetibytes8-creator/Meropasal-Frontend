import QRCode from "qrcode";
import { generateTaxInvoiceHTML, generateThermalInvoiceHTML } from "@/lib/invoiceTemplate";
import type { BusinessSettings, Order, Table } from "@/types";

export const restaurantInvoiceUrl = (order: Order) =>
  `${window.location.origin}/restaurant/billing?invoice=${order.id}`;

export const restaurantBillNumber = (order: Order) => String(order.id).replace(/^#/, "");

export const restaurantTableLabel = (order: Order, tables: Table[]): string | null => {
  if (!order.tableId) return null;
  const table = tables.find((item) => item.id === order.tableId);
  return table ? `Table ${table.number}` : null;
};

export const restaurantPaymentLabel = (order: Order) => {
  if (!order.paymentMethod) return undefined;
  const split = order.splitPayment;
  return `${order.paymentMethod}${split ? ` (Cash Rs. ${split.cash.toFixed(2)} + Online Rs. ${split.online.toFixed(2)})` : ""}`;
};

export interface RestaurantRefundDetails {
  refundNo: string;
  refundDate: string;
  refundMethod: "cash" | "card" | "mobile" | "split";
  refundAmount: number;
  reason: string;
  notes?: string;
  customerName?: string;
  receivedBy?: string;
  approvedBy?: string;
  referenceNo?: string;
}

const restaurantInvoicePayload = (
  order: Order,
  qrDataUrl: string,
  settings: BusinessSettings,
  tableText: string | null,
) => {
  const url = restaurantInvoiceUrl(order);
  const isPaymentQr =
    settings.paymentQr?.showOnBill &&
    settings.paymentQr?.image &&
    (order.paymentMethod === "mobile" || order.paymentMethod === "split");

  return {
    title: "TAX INVOICE",
    invoiceNo: restaurantBillNumber(order),
    invoiceDate: new Date(order.createdAt).toLocaleString(),
    customerName: order.customerName || "Walk-in Customer",
    orderType: order.type,
    tableText,
    paymentMode: restaurantPaymentLabel(order),
    lines: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      rate: item.price,
      amount: item.quantity * item.price,
    })),
    subtotal: order.total,
    taxPercent: 0,
    taxAmount: 0,
    total: order.total,
    qrDataUrl: isPaymentQr ? settings.paymentQr.image! : qrDataUrl,
    qrCaption: isPaymentQr
      ? `Payment QR: ${settings.paymentQr.provider}${settings.paymentQr.accountName ? ` - ${settings.paymentQr.accountName}` : ""}${settings.paymentQr.accountNumber ? ` (${settings.paymentQr.accountNumber})` : ""}`
      : url,
    note: settings.receiptFooter,
  };
};

const restaurantRefundPayload = (
  order: Order,
  details: RestaurantRefundDetails,
  qrDataUrl: string,
  settings: BusinessSettings,
  tableText: string | null,
) => ({
  title: "REFUND / CREDIT NOTE",
  copyLabel: "CUSTOMER COPY",
  invoiceNo: details.refundNo,
  invoiceDate: details.refundDate,
  customerName: details.customerName || order.customerName || "Walk-in Customer",
  orderType: `${order.type} refund`,
  tableText,
  paymentMode: `${details.refundMethod}${details.referenceNo ? ` / Ref: ${details.referenceNo}` : ""}`,
  lines: order.items.map((item) => ({
    name: `${item.name} (Refund)`,
    quantity: item.quantity,
    rate: item.price,
    amount: item.quantity * item.price,
  })),
  subtotal: details.refundAmount,
  taxPercent: 0,
  taxAmount: 0,
  total: details.refundAmount,
  qrDataUrl,
  qrCaption: `Original bill: #${restaurantBillNumber(order)}`,
  terms: [
    `Refund reason: ${details.reason || "Customer refund"}`,
    details.notes ? `Notes: ${details.notes}` : "Refund amount paid back to customer as recorded above.",
    `Received by: ${details.receivedBy || "-"} | Approved by: ${details.approvedBy || "-"}`,
  ],
  note: "This refund note is computer generated from Mero Pasal billing records.",
});

export async function generateRestaurantThermalBillHTML(
  order: Order,
  settings: BusinessSettings,
  tables: Table[],
) {
  const qr = await QRCode.toDataURL(restaurantInvoiceUrl(order), { margin: 1, width: 220 });
  return generateThermalInvoiceHTML(
    restaurantInvoicePayload(order, qr, settings, restaurantTableLabel(order, tables)),
    settings,
  );
}

export async function generateRestaurantA4BillHTML(
  order: Order,
  settings: BusinessSettings,
  tables: Table[],
) {
  const qr = await QRCode.toDataURL(restaurantInvoiceUrl(order), { margin: 1, width: 220 });
  return generateTaxInvoiceHTML(
    restaurantInvoicePayload(order, qr, settings, restaurantTableLabel(order, tables)),
    settings,
  );
}

export async function printRestaurantBill(
  order: Order,
  settings: BusinessSettings,
  tables: Table[],
) {
  const html = await generateRestaurantThermalBillHTML(order, settings, tables);
  const win = window.open("", "_blank", "width=450,height=650");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.setTimeout(() => win.print(), 400);
  return true;
}

export async function printRestaurantRefundNote(
  order: Order,
  details: RestaurantRefundDetails,
  settings: BusinessSettings,
  tables: Table[],
) {
  const qr = await QRCode.toDataURL(restaurantInvoiceUrl(order), { margin: 1, width: 220 });
  const html = generateTaxInvoiceHTML(
    restaurantRefundPayload(order, details, qr, settings, restaurantTableLabel(order, tables)),
    settings,
  );
  const win = window.open("", "_blank", "width=900,height=900");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.setTimeout(() => win.print(), 400);
  return true;
}

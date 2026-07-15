import type { BusinessSettings, Order } from "@/types";
import { esc } from "@/lib/html-escape";

export function generateKotHTML(order: Order, settings: BusinessSettings, tableText: string | null) {
  const kot = settings.printSettings.kot;
  const copies = Math.max(1, Math.min(5, Number(kot.printCount) || 1));
  const date = new Date(order.createdAt).toLocaleString();
  const logoHtml = settings.logo && kot.showLogo
    ? `<img src="${esc(settings.logo)}" class="logo" alt="logo"/>`
    : "";

  const detailRows = [
    kot.showOrderType ? `<p><strong>Type:</strong> ${esc(order.type)}</p>` : "",
    kot.showTable && tableText ? `<p><strong>Table:</strong> ${esc(tableText)}</p>` : "",
    kot.showOrderBy ? `<p><strong>Order By:</strong> ${esc(order.customerName || "Counter")}</p>` : "",
    kot.showTime ? `<p><strong>Time:</strong> ${esc(date)}</p>` : "",
  ].filter(Boolean).join("");

  const itemsHtml = kot.showItems
    ? `<table>
        <thead><tr><th>S.N</th><th>Dishes</th>${kot.showQuantity ? "<th>QTY</th>" : ""}</tr></thead>
        <tbody>
          ${order.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${esc(item.name)}</td>
              ${kot.showQuantity ? `<td>${esc(item.quantity)}</td>` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>`
    : "";

  const oneCopy = (copy: number) => `
    <section class="ticket">
      ${logoHtml}
      ${kot.showBusinessName ? `<p class="store-name">${esc(settings.businessName)}</p>` : ""}
      ${kot.headerText ? `<p class="muted center">${esc(kot.headerText)}</p>` : ""}
      <div class="line"></div>
      <h2>${esc(kot.title)}</h2>
      ${kot.showKotNo ? `<p class="center muted">#${esc(order.id.slice(1))}${copies > 1 ? ` / Copy ${copy}` : ""}</p>` : ""}
      <div class="line"></div>
      <div class="details">${detailRows}</div>
      <div class="line"></div>
      ${itemsHtml}
      ${kot.showRemarks ? `<div class="line"></div><p><strong>KOT Remarks:</strong></p><p class="muted">-</p>` : ""}
      ${kot.footerText ? `<div class="line"></div><p class="center">${esc(kot.footerText)}</p>` : ""}
    </section>
  `;

  return `<!DOCTYPE html><html><head><title>KOT #${esc(order.id.slice(1))}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#111}
      .ticket{width:300px;margin:0 auto;padding:${kot.compactView ? "10px" : "16px"} 12px;page-break-after:always}
      .logo{max-width:86px;max-height:48px;display:block;margin:0 auto 6px auto;object-fit:contain}
      .store-name{text-align:center;font-weight:700;font-size:16px;margin:4px 0}
      h2{text-align:center;font-size:18px;margin:4px 0}
      .center{text-align:center}.muted{color:#555;font-size:12px}
      .line{border-top:1px dashed #888;margin:${kot.compactView ? "7px" : "10px"} 0}
      .details p{margin:3px 0;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:5px 2px;border-bottom:1px dashed #bbb;text-align:left;vertical-align:top}
      th:last-child,td:last-child{text-align:right}
      @media print{.ticket:last-child{page-break-after:auto}}
    </style>
  </head><body>${Array.from({ length: copies }, (_, i) => oneCopy(i + 1)).join("")}</body></html>`;
}

export function printKot(order: Order, settings: BusinessSettings, tableText: string | null) {
  const w = window.open("", "_blank", "width=380,height=700");
  if (!w) return false;
  w.document.write(generateKotHTML(order, settings, tableText));
  w.document.close();
  w.setTimeout(() => w.print(), 300);
  return true;
}

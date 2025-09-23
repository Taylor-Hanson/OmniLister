import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type InvoiceData = {
  number: string;
  issuedAt: string; // formatted
  dueAt?: string;
  seller: { name: string; address?: string; email?: string; taxId?: string; logoDataUrl?: string };
  customer: { name: string; email?: string; address?: string };
  items: { description: string; qty: number; unitPriceCents: number; totalCents: number }[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes?: string;
};

const money = (c: number) => `$${(c/100).toFixed(2)}`;

export function renderInvoiceHtml(inv: InvoiceData) {
  const rows = inv.items.map(
    i => `<tr>
      <td>${i.description}</td>
      <td style="text-align:right">${i.qty}</td>
      <td style="text-align:right">${money(i.unitPriceCents)}</td>
      <td style="text-align:right">${money(i.totalCents)}</td>
    </tr>`
  ).join('');

  const logo = inv.seller.logoDataUrl ? `<img src="${inv.seller.logoDataUrl}" style="height:48px"/>` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${inv.number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial; padding: 24px; color: #111; }
    .hdr { display:flex; justify-content: space-between; align-items:center; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #eee; padding: 8px; font-size: 12px; }
    th { text-align: left; background: #fafafa; }
    .right { text-align: right; }
    .totals td { border: 0; }
    .muted { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="hdr">
    <div>${logo}<h1>Invoice ${inv.number}</h1>
      <div class="muted">Issued: ${inv.issuedAt}${inv.dueAt ? ` &nbsp;•&nbsp; Due: ${inv.dueAt}` : ''}</div>
    </div>
    <div style="text-align:right">
      <strong>${inv.seller.name}</strong><br/>
      ${inv.seller.address ?? ''}<br/>
      ${inv.seller.email ?? ''}<br/>
      ${inv.seller.taxId ? `Tax ID: ${inv.seller.taxId}` : ''}
    </div>
  </div>

  <div style="display:flex; gap:48px">
    <div>
      <div class="muted">Bill To</div>
      <strong>${inv.customer.name}</strong><br/>
      ${inv.customer.address ?? ''}<br/>
      ${inv.customer.email ?? ''}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table style="margin-top:16px">
    <tbody class="totals">
      <tr><td style="width:70%"></td><td class="right" style="width:15%">Subtotal</td><td class="right" style="width:15%">${money(inv.subtotalCents)}</td></tr>
      <tr><td></td><td class="right">Tax</td><td class="right">${money(inv.taxCents)}</td></tr>
      <tr><td></td><td class="right"><strong>Total</strong></td><td class="right"><strong>${money(inv.totalCents)}</strong></td></tr>
    </tbody>
  </table>

  ${inv.notes ? `<p class="muted" style="margin-top:24px">${inv.notes}</p>` : ''}

</body>
</html>`;
}

export async function createAndShareInvoicePdf(inv: InvoiceData) {
  const html = renderInvoiceHtml(inv);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { dialogTitle: `Invoice ${inv.number}` });
  }
  return uri;
}

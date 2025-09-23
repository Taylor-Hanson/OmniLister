import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import PDFDocument from "npm:pdfkit@0.15.0";

type LineItem = { description: string; qty: number; unitPriceCents: number; totalCents: number };

type InvoicePayload = {
  orgId: string;
  invoiceId: string;
  number: string;
  issuedAt: string;
  dueAt?: string;
  seller: { name: string; address?: string; email?: string; taxId?: string; logoDataUrl?: string };
  customer: { name: string; email?: string; address?: string };
  items: LineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes?: string;
};

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

async function pdfBuffer(inv: InvoicePayload): Promise<Uint8Array> {
  const doc = new PDFDocument({ margin: 36 });
  const chunks: Uint8Array[] = [];
  doc.on("data", (c: Uint8Array) => chunks.push(c));
  const done = new Promise<Uint8Array>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks as any))));
  
  // Header
  if (inv.seller.logoDataUrl?.startsWith("data:")) {
    try { 
      doc.image(Buffer.from(inv.seller.logoDataUrl.split(",")[1], "base64"), 36, 36, { height: 40 }); 
    } catch {}
  }
  doc.fontSize(20).text(`Invoice ${inv.number}`, 300, 36, { align: "right" });
  doc.moveDown();
  doc.fontSize(10).text(`Issued: ${inv.issuedAt}${inv.dueAt ? `   •   Due: ${inv.dueAt}` : ""}`, { align: "right" });

  // Seller / Customer
  doc.moveDown().fontSize(11).text(inv.seller.name).fontSize(9);
  if (inv.seller.address) doc.text(inv.seller.address);
  if (inv.seller.email) doc.text(inv.seller.email);
  if (inv.seller.taxId) doc.text(`Tax ID: ${inv.seller.taxId}`);
  doc.moveDown().fontSize(10).text("Bill To", { underline: true });
  doc.fontSize(11).text(inv.customer.name);
  doc.fontSize(9);
  if (inv.customer.address) doc.text(inv.customer.address);
  if (inv.customer.email) doc.text(inv.customer.email);

  // Table header
  doc.moveDown().moveDown();
  doc.fontSize(10).text("Description", 36).text("Qty", 360, undefined, { width: 40, align: "right" })
     .text("Unit", 410, undefined, { width: 80, align: "right" })
     .text("Total", 500, undefined, { width: 80, align: "right" });
  doc.moveTo(36, doc.y + 2).lineTo(580, doc.y + 2).stroke();

  // Items
  for (const it of inv.items) {
    doc.moveDown(0.4);
    doc.text(it.description, 36).text(String(it.qty), 360, undefined, { width: 40, align: "right" })
       .text(money(it.unitPriceCents), 410, undefined, { width: 80, align: "right" })
       .text(money(it.totalCents), 500, undefined, { width: 80, align: "right" });
  }

  // Totals
  doc.moveDown();
  doc.moveTo(360, doc.y + 2).lineTo(580, doc.y + 2).stroke();
  const y = doc.y + 6;
  doc.fontSize(10)
     .text("Subtotal", 410, y, { width: 80, align: "right" }).text(money(inv.subtotalCents), 500, y, { width: 80, align: "right" })
     .text("Tax", 410, y + 14, { width: 80, align: "right" }).text(money(inv.taxCents), 500, y + 14, { width: 80, align: "right" })
     .font("Helvetica-Bold").text("Total", 410, y + 28, { width: 80, align: "right" }).text(money(inv.totalCents), 500, y + 28, { width: 80, align: "right" })
     .font("Helvetica");

  if (inv.notes) { 
    doc.moveDown().moveDown(); 
    doc.fontSize(9).fillColor("#555").text(inv.notes); 
    doc.fillColor("#000"); 
  }

  doc.end();
  return done;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);

    const inv = (await req.json()) as InvoicePayload;
    if (!inv?.orgId || !inv?.invoiceId) return json({ error: "orgId and invoiceId required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const bucket = Deno.env.get("STORAGE_INVOICE_BUCKET") ?? "invoices";

    const buf = await pdfBuffer(inv);
    const key = `${inv.orgId}/invoice-${inv.invoiceId}.pdf`;

    // Upload (overwrite if exists)
    const { error: upErr } = await supabase.storage.from(bucket).upload(key, buf, {
      contentType: "application/pdf",
      upsert: true
    });
    if (upErr) return json({ error: `upload failed: ${upErr.message}` }, 500);

    // Optionally write back pdf_key to invoices table
    await supabase.from("invoices").update({ pdf_key: key }).eq("id", inv.invoiceId).eq("org_id", inv.orgId);

    // Signed URL (1 day)
    const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 60 * 24);
    if (signErr) return json({ error: signErr.message }, 500);

    return json({ ok: true, url: signed.signedUrl, key });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

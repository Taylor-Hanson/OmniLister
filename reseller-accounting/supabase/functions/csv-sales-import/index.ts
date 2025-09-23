import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@3.23.8";

const SaleRow = z.object({
  marketplace: z.string(),
  marketplaceOrderId: z.string().optional().nullable(),
  soldAt: z.string(),
  title: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  salePrice: z.string().or(z.number()),
  shippingCharged: z.string().or(z.number()).optional().nullable(),
  shippingCost: z.string().or(z.number()).optional().nullable(),
  platformFees: z.string().or(z.number()).optional().nullable(),
  discounts: z.string().or(z.number()).optional().nullable(),
  refunds: z.string().or(z.number()).optional().nullable(),
  chargebacks: z.string().or(z.number()).optional().nullable(),
  taxCollected: z.string().or(z.number()).optional().nullable(),
  taxRemittedByMarketplace: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  raw: z.record(z.any()).optional()
});

function moneyToCents(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
  return Math.round(n * 100);
}

function normBool(v?: string | null) {
  const s = String(v ?? '').trim().toLowerCase();
  return ['y', 'yes', 'true', '1'].includes(s);
}

function parseMaybeDate(s: string) {
  const tryFormats = ['yyyy-MM-dd', 'M/d/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd', 'dd-MMM-yyyy'];
  for (const f of tryFormats) {
    try {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    } catch {}
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  throw new Error(`Unrecognized date: ${s}`);
}

function sha256(s: string) {
  // Simple hash for demo; in production use crypto.subtle.digest
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);

    const { orgId, sourceLabel = "unknown", rows } = await req.json();
    if (!orgId || !Array.isArray(rows)) return json({ error: "orgId and rows[] required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const out: any[] = [];
    const errs: string[] = [];

    for (const row of rows) {
      try {
        const v = SaleRow.parse({
          marketplace: row.marketplace ?? row.Marketplace ?? row.platform,
          marketplaceOrderId: row.marketplaceOrderId ?? row.orderId ?? row['Order ID'],
          soldAt: row.soldAt ?? row.date ?? row['Sold At'],
          title: row.title ?? row['Item Title'],
          sku: row.sku ?? row.SKU,
          salePrice: row.salePrice ?? row['Sale Price'] ?? row.price,
          shippingCharged: row.shippingCharged ?? row['Shipping Charged'] ?? row.shipping_income,
          shippingCost: row.shippingCost ?? row['Shipping Cost'] ?? row.shipping_label_cost,
          platformFees: row.platformFees ?? row['Platform Fees'] ?? row.fees,
          discounts: row.discounts ?? row['Discounts'],
          refunds: row.refunds ?? row['Refunds'],
          chargebacks: row.chargebacks ?? row['Chargebacks'],
          taxCollected: row.taxCollected ?? row['Sales Tax Collected'] ?? row.tax,
          taxRemittedByMarketplace: row.taxRemittedByMarketplace ?? row['Marketplace Remitted?'],
          currency: row.currency ?? row.Currency ?? 'USD',
          raw: row
        });

        const soldAt = parseMaybeDate(v.soldAt);
        const rec = {
          id: crypto.randomUUID(),
          org_id: orgId,
          marketplace: String(v.marketplace).trim().toLowerCase(),
          marketplace_order_id: v.marketplaceOrderId ?? null,
          sold_at: soldAt,
          sale_price_cents: moneyToCents(v.salePrice as any),
          shipping_charged_cents: moneyToCents(v.shippingCharged as any),
          shipping_cost_cents: moneyToCents(v.shippingCost as any),
          platform_fees_cents: moneyToCents(v.platformFees as any),
          discounts_cents: moneyToCents(v.discounts as any),
          refunds_cents: moneyToCents(v.refunds as any),
          chargebacks_cents: moneyToCents(v.chargebacks as any),
          tax_collected_cents: moneyToCents(v.taxCollected as any),
          tax_remitted_by_marketplace: normBool(v.taxRemittedByMarketplace),
          currency: v.currency ?? 'USD',
          raw_payload: v.raw,
          row_hash: sha256(JSON.stringify([sourceLabel, v.marketplace, v.marketplaceOrderId ?? '', soldAt, v.salePrice]))
        };

        // Idempotent upsert
        const { data: existing } = await supabase
          .from("sales")
          .select("id")
          .eq("org_id", orgId)
          .eq("row_hash", rec.row_hash)
          .single();

        if (existing) {
          errs.push(`Duplicate row skipped: ${rec.row_hash}`);
          continue;
        }

        const { error } = await supabase.from("sales").insert(rec);
        if (error) throw error;
        out.push(rec.id);
      } catch (e: any) {
        errs.push(e.message ?? String(e));
      }
    }

    return json({ ok: true, inserted: out.length, errors: errs });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

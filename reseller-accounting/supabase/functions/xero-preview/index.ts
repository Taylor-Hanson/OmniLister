import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import pg from "npm:pg@8.11.5";
const { Pool } = pg;

type AccountMapping = { accountType: string; externalAccountId: string; name?: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function toYmd(ts: number) { return new Date(ts).toISOString().slice(0, 10); }

serve(async (req) => {
  if (req.method !== "GET") return json({ error: "GET required" }, 405);
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId");
    const fromMs = Number(url.searchParams.get("from"));
    const toMs = Number(url.searchParams.get("to"));
    const mode = url.searchParams.get("mode") ?? "summarized";
    if (!orgId || Number.isNaN(fromMs) || Number.isNaN(toMs)) return json({ error: "orgId, from, to (epoch ms) required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const pool = new Pool({ connectionString: Deno.env.get("SUPABASE_DB_URL")!, max: 3 });
    const client = await pool.connect();

    // Fetch account mappings
    const { data: mappings } = await supabase
      .from("account_mappings")
      .select("*")
      .eq("org_id", orgId)
      .eq("provider", "xero");
    const map = new Map<string, AccountMapping>();
    for (const m of mappings ?? []) {
      map.set(m.account_type, m);
    }

    // Default GL accounts for Xero
    const defaults = {
      revenue: "4000",
      shippingIncome: "4001",
      feesExpense: "5000",
      refunds: "5001",
      shippingCost: "5002",
      salesTaxLiability: "2100",
      clearing: "1000"
    };

    const getAccount = (type: keyof typeof defaults) => map.get(type)?.externalAccountId ?? defaults[type];

    if (mode === "summarized") {
      // Summarized daily journals
      const sql = `
        select
          to_char(to_timestamp(sold_at/1000),'YYYY-MM-DD') as day,
          marketplace,
          sum(sale_price_cents + shipping_charged_cents - refunds_cents - discounts_cents - chargebacks_cents) as revenue_cents,
          sum(shipping_charged_cents) as shipping_income_cents,
          sum(platform_fees_cents) as fees_cents,
          sum(refunds_cents + discounts_cents + chargebacks_cents) as refunds_cents,
          sum(shipping_cost_cents) as shipping_cost_cents,
          sum(tax_collected_cents) as tax_cents
        from sales
        where org_id = $1 and sold_at between $2 and $3
        group by 1, 2
        order by 1, 2;
      `;
      const { rows } = await client.query(sql, [orgId, fromMs, toMs]);

      const journals: any[] = [];
      for (const r of rows) {
        const j = {
          date: r.day,
          marketplace: r.marketplace,
          lines: [
            { account: getAccount("revenue"), debit: 0, credit: r.revenue_cents, memo: `Revenue ${r.marketplace}` },
            { account: getAccount("shippingIncome"), debit: 0, credit: r.shipping_income_cents, memo: `Shipping Income ${r.marketplace}` },
            { account: getAccount("feesExpense"), debit: r.fees_cents, credit: 0, memo: `Platform Fees ${r.marketplace}` },
            { account: getAccount("refunds"), debit: r.refunds_cents, credit: 0, memo: `Refunds ${r.marketplace}` },
            { account: getAccount("shippingCost"), debit: r.shipping_cost_cents, credit: 0, memo: `Shipping Cost ${r.marketplace}` },
            { account: getAccount("salesTaxLiability"), debit: 0, credit: r.tax_cents, memo: `Sales Tax ${r.marketplace}` },
            { account: getAccount("clearing"), debit: r.revenue_cents + r.shipping_income_cents + r.tax_cents, credit: r.fees_cents + r.refunds_cents + r.shipping_cost_cents, memo: `Clearing ${r.marketplace}` }
          ].filter(l => l.debit > 0 || l.credit > 0)
        };
        journals.push(j);
      }

      await client.release();
      await pool.end();

      return json({ mode: "summarized", journals, mappings: Array.from(map.values()) });
    } else {
      // Per-order journals
      const sql = `
        select
          id, marketplace, marketplace_order_id, sold_at,
          sale_price_cents + shipping_charged_cents - refunds_cents - discounts_cents - chargebacks_cents as revenue_cents,
          shipping_charged_cents, platform_fees_cents, refunds_cents + discounts_cents + chargebacks_cents as refunds_cents,
          shipping_cost_cents, tax_collected_cents
        from sales
        where org_id = $1 and sold_at between $2 and $3
        order by sold_at;
      `;
      const { rows } = await client.query(sql, [orgId, fromMs, toMs]);

      const journals: any[] = [];
      for (const r of rows) {
        const j = {
          id: r.id,
          date: toYmd(r.sold_at),
          marketplace: r.marketplace,
          orderId: r.marketplace_order_id,
          lines: [
            { account: getAccount("revenue"), debit: 0, credit: r.revenue_cents, memo: `Revenue ${r.marketplace} ${r.marketplace_order_id ?? ''}` },
            { account: getAccount("shippingIncome"), debit: 0, credit: r.shipping_charged_cents, memo: `Shipping Income ${r.marketplace}` },
            { account: getAccount("feesExpense"), debit: r.platform_fees_cents, credit: 0, memo: `Platform Fees ${r.marketplace}` },
            { account: getAccount("refunds"), debit: r.refunds_cents, credit: 0, memo: `Refunds ${r.marketplace}` },
            { account: getAccount("shippingCost"), debit: r.shipping_cost_cents, credit: 0, memo: `Shipping Cost ${r.marketplace}` },
            { account: getAccount("salesTaxLiability"), debit: 0, credit: r.tax_collected_cents, memo: `Sales Tax ${r.marketplace}` },
            { account: getAccount("clearing"), debit: r.revenue_cents + r.shipping_charged_cents + r.tax_collected_cents, credit: r.platform_fees_cents + r.refunds_cents + r.shipping_cost_cents, memo: `Clearing ${r.marketplace}` }
          ].filter(l => l.debit > 0 || l.credit > 0)
        };
        journals.push(j);
      }

      await client.release();
      await pool.end();

      return json({ mode: "per-order", journals, mappings: Array.from(map.values()) });
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

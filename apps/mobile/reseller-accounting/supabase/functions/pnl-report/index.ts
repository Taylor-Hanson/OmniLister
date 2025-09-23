import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import pg from "npm:pg@8.11.5";
const { Pool } = pg;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function toYmd(ts: number) { return new Date(ts).toISOString().slice(0,10); }

serve(async (req) => {
  if (req.method !== "GET") return json({ error: "GET required" }, 405);
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId");
    const fromMs = Number(url.searchParams.get("from"));
    const toMs = Number(url.searchParams.get("to"));
    if (!orgId || Number.isNaN(fromMs) || Number.isNaN(toMs)) return json({ error: "orgId, from, to (epoch ms) required" }, 400);

    const pool = new Pool({ connectionString: Deno.env.get("SUPABASE_DB_URL")!, max: 3 });
    const client = await pool.connect();

    // Period totals
    const totalsSql = `
      with s as (
        select
          coalesce(sum(sale_price_cents + shipping_charged_cents - refunds_cents - discounts_cents - chargebacks_cents),0) as revenue_cents,
          coalesce(sum(locked_cogs_cents),0) as cogs_cents,
          coalesce(sum(platform_fees_cents),0) as fees_cents,
          coalesce(sum(shipping_cost_cents),0) as shipping_cost_cents
        from sales
        where org_id = $1 and sold_at between $2 and $3
      ),
      e as (
        select coalesce(sum(amount_cents),0) as expenses_cents
        from expenses
        where org_id = $1 and occurred_at between $2 and $3
      )
      select
        s.revenue_cents,
        s.cogs_cents,
        s.fees_cents,
        s.shipping_cost_cents,
        e.expenses_cents,
        (s.revenue_cents - s.cogs_cents - s.fees_cents - s.shipping_cost_cents) as gross_profit_cents,
        (s.revenue_cents - s.cogs_cents - s.fees_cents - s.shipping_cost_cents - e.expenses_cents) as net_profit_cents
      from s, e;
    `;
    const { rows: [totals] } = await client.query(totalsSql, [orgId, fromMs, toMs]);

    // Daily trend (for charts)
    const trendSql = `
      select
        to_char(to_timestamp(sold_at/1000),'YYYY-MM-DD') as day,
        sum(sale_price_cents + shipping_charged_cents - refunds_cents - discounts_cents - chargebacks_cents) as revenue_cents,
        sum(locked_cogs_cents + platform_fees_cents + shipping_cost_cents) as direct_costs_cents
      from sales
      where org_id = $1 and sold_at between $2 and $3
      group by 1
      order by 1;
    `;
    const { rows: trend } = await client.query(trendSql, [orgId, fromMs, toMs]);

    await client.release();
    await pool.end();

    return json({
      orgId,
      from: toYmd(fromMs),
      to: toYmd(toMs),
      totals,
      trend
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import pg from "npm:pg@8.11.5";
const { Pool } = pg;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
const GRAN_MAP: Record<string,string> = { day: 'day', week: 'week', month: 'month' };

serve(async (req) => {
  if (req.method !== "GET") return json({ error: "GET required" }, 405);
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId")!;
    const fromMs = Number(url.searchParams.get("from"));
    const toMs = Number(url.searchParams.get("to"));
    const gran = (url.searchParams.get("granularity") ?? "day").toLowerCase();
    if (!orgId || Number.isNaN(fromMs) || Number.isNaN(toMs)) return json({ error: "orgId, from, to required" }, 400);
    const bucket = GRAN_MAP[gran] ?? 'day';

    const pool = new Pool({ connectionString: Deno.env.get("SUPABASE_DB_URL")!, max: 3 });
    const client = await pool.connect();

    // Sales (revenue and direct costs) per bucket
    const salesSql = `
      select
        to_char(date_trunc('${bucket}', to_timestamp(sold_at/1000)), 'YYYY-MM-DD') as bucket,
        sum(sale_price_cents + shipping_charged_cents - refunds_cents - discounts_cents - chargebacks_cents) as revenue_cents,
        sum(locked_cogs_cents) as cogs_cents,
        sum(platform_fees_cents) as fees_cents,
        sum(shipping_cost_cents) as shipping_cost_cents
      from sales
      where org_id = $1 and sold_at between $2 and $3
      group by 1
      order by 1;
    `;
    const { rows: sales } = await client.query(salesSql, [orgId, fromMs, toMs]);

    // Expenses per bucket
    const expSql = `
      select
        to_char(date_trunc('${bucket}', to_timestamp(occurred_at/1000)), 'YYYY-MM-DD') as bucket,
        sum(amount_cents) as expenses_cents
      from expenses
      where org_id = $1 and occurred_at between $2 and $3
      group by 1
      order by 1;
    `;
    const { rows: exps } = await client.query(expSql, [orgId, fromMs, toMs]);

    await client.release(); await pool.end();

    // Index by bucket
    const by: Record<string, any> = {};
    for (const r of sales) by[r.bucket] = { revenue: +r.revenue_cents, cogs: +r.cogs_cents, fees: +r.fees_cents, ship: +r.shipping_cost_cents, expenses: 0 };
    for (const e of exps) (by[e.bucket] ??= { revenue:0, cogs:0, fees:0, ship:0, expenses:0 }).expenses = +e.expenses_cents;

    // Build series arrays (sorted)
    const buckets = Object.keys(by).sort();
    const revenue = [], cogs = [], fees = [], shipping_cost = [], expenses = [], gross_profit = [], net_profit = [];
    for (const b of buckets) {
      const v = by[b];
      const gross = v.revenue - v.cogs - v.fees - v.ship;
      const net = gross - v.expenses;
      revenue.push({ x: b, y: v.revenue });
      cogs.push({ x: b, y: v.cogs });
      fees.push({ x: b, y: v.fees });
      shipping_cost.push({ x: b, y: v.ship });
      expenses.push({ x: b, y: v.expenses });
      gross_profit.push({ x: b, y: gross });
      net_profit.push({ x: b, y: net });
    }

    return json({ orgId, granularity: bucket, series: { revenue, cogs, fees, shipping_cost, expenses, gross_profit, net_profit } });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

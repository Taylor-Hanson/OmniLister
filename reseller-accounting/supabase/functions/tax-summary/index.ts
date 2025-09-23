import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import pg from "npm:pg@8.11.5";
const { Pool } = pg;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  if (req.method !== "GET") return json({ error: "GET required" }, 405);
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId");
    const fromMs = Number(url.searchParams.get("from"));
    const toMs = Number(url.searchParams.get("to"));
    if (!orgId || Number.isNaN(fromMs) || Number.isNaN(toMs)) return json({ error: "orgId, from, to required" }, 400);

    const pool = new Pool({ connectionString: Deno.env.get("SUPABASE_DB_URL")!, max: 3 });
    const client = await pool.connect();

    const sql = `
      select
        coalesce(nullif(buyer_state, ''), 'UNKNOWN') as state,
        sum(tax_collected_cents) as tax_collected_cents,
        sum(case when tax_remitted_by_marketplace then tax_collected_cents else 0 end) as remitted_by_marketplace_cents,
        sum(case when not tax_remitted_by_marketplace then tax_collected_cents else 0 end) as seller_owed_cents
      from sales
      where org_id = $1 and sold_at between $2 and $3
      group by 1
      order by 1;
    `;
    const { rows } = await client.query(sql, [orgId, fromMs, toMs]);

    await client.release();
    await pool.end();

    return json({ orgId, from: fromMs, to: toMs, rows });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

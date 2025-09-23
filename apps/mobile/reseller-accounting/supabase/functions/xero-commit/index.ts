import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type JournalLine = { account: string; debit: number; credit: number; memo?: string };
type Journal = { date: string; marketplace?: string; orderId?: string; lines: JournalLine[] };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);

    const { orgId, journals, accessToken, tenantId } = await req.json();
    if (!orgId || !Array.isArray(journals) || !accessToken || !tenantId) {
      return json({ error: "orgId, journals[], accessToken, tenantId required" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Validate journals balance
    for (const j of journals) {
      const totalDebits = j.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
      const totalCredits = j.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
      if (Math.abs(totalDebits - totalCredits) > 1) { // Allow 1 cent rounding
        return json({ error: `Journal ${j.date} does not balance: debits=${totalDebits}, credits=${totalCredits}` }, 400);
      }
    }

    // Xero API call (simplified - in production use proper Xero SDK)
    const xeroBase = `https://api.xero.com/accounting.xro/2.0`;
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Xero-tenant-id": tenantId
    };

    const results: any[] = [];
    for (const j of journals) {
      const payload = {
        JournalEntries: [{
          Date: j.date,
          Reference: `OMNI-${j.date}-${j.marketplace ?? 'MIXED'}`,
          Narration: `OmniLister export: ${j.marketplace ?? 'Mixed'} ${j.orderId ? `Order ${j.orderId}` : 'Daily Summary'}`,
          JournalLines: j.lines.map(l => ({
            LineAmount: (l.debit ?? 0) - (l.credit ?? 0), // Xero uses positive/negative
            AccountCode: l.account,
            Description: l.memo ?? "",
            TaxType: "NONE" // Simplified - in production handle tax properly
          }))
        }]
      };

      try {
        const resp = await fetch(`${xeroBase}/JournalEntries`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`Xero API error: ${resp.status} ${err}`);
        }

        const data = await resp.json();
        results.push({ journal: j, xeroId: data.JournalEntries?.[0]?.JournalEntryID, success: true });
      } catch (e: any) {
        results.push({ journal: j, error: e.message, success: false });
      }
    }

    // Record export
    const exportId = crypto.randomUUID();
    await supabase.from("journal_exports").insert({
      id: exportId,
      org_id: orgId,
      provider: "xero",
      period_start: Math.min(...journals.map(j => new Date(j.date).getTime())),
      period_end: Math.max(...journals.map(j => new Date(j.date).getTime())),
      status: results.every(r => r.success) ? "committed" : "error",
      preview: null,
      payload: JSON.stringify({ journals, results }),
      created_at: Date.now(),
      created_by: null // TODO: from JWT
    });

    return json({ ok: true, exportId, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

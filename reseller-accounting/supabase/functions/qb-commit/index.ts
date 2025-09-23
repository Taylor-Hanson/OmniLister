import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type JLine = { account: string; amountCents: number; dc: 'debit'|'credit'; memo?: string; date: string; marketplace?: string };
type Journal = { date: string; marketplace: string; lines: JLine[] };
type Body = { orgId: string; journals: Journal[]; dryRun?: boolean };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

const QBO_BASE = "https://quickbooks.api.intuit.com";

async function fetchTokenForOrg(supabase: any, orgId: string) {
  const { data, error } = await supabase
    .from("integration_tokens")
    .select("*")
    .eq("org_id", orgId)
    .eq("provider", "quickbooks")
    .single();
  if (error || !data) throw new Error("No QuickBooks token/realm for org");
  return data as { access_token: string; refresh_token: string; realm_id: string; expires_at: string };
}

// If expired, refresh here (scaffold)
async function ensureFreshToken(tok: any): Promise<string> {
  // Add real refresh logic with your client id/secret (store in env)
  // For now, assume token is valid
  return tok.access_token;
}

// Map logical account types to QuickBooks AccountRef Ids
async function loadAccountMap(supabase: any, orgId: string) {
  const { data, error } = await supabase
    .from("account_mappings")
    .select("account_type, external_account_id")
    .eq("org_id", orgId)
    .eq("provider", "quickbooks");
  if (error || !data?.length) throw new Error("No account mappings set for QuickBooks");
  const m: Record<string,string> = {};
  for (const row of data) m[row.account_type] = row.external_account_id;
  return m;
}

// Convert cents → decimal string QuickBooks expects
const amt = (c: number) => (c / 100).toFixed(2);

function toQboJournalEntry(j: Journal, accountIds: Record<string,string>) {
  // Our preview already balanced with clearing lines.
  // Transform each line: debit → "DebitLine", credit → "CreditLine"
  // QBO uses a single JournalEntry with Line[] where each Line has Amount and detail with AccountRef.
  const Line = j.lines
    .filter(l => l.amountCents > 0)
    .map(l => ({
      DetailType: "JournalEntryLineDetail",
      Amount: Number(amt(l.amountCents)),
      Description: l.memo ?? l.marketplace ?? "journal",
      JournalEntryLineDetail: {
        PostingType: l.dc === "debit" ? "Debit" : "Credit",
        AccountRef: { value: l.account } // we already pass IDs in the preview OR we remap below.
      }
    }));

  return {
    TxnDate: j.date,           // YYYY-MM-DD
    PrivateNote: `Marketplace: ${j.marketplace}`,
    Line
  };
}

// Optionally rewrite logical aliases to actual ids if preview used names.
// Here we assume incoming JLine.account is a logical alias; replace with mapped id when present.
function resolveAccountIds(j: Journal, map: Record<string,string>): Journal {
  return {
    ...j,
    lines: j.lines.map(l => {
      const id = map[l.account] ?? l.account; // allows either raw id or logical key
      return { ...l, account: id };
    })
  };
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);

    const body = (await req.json()) as Body;
    const { orgId, journals, dryRun } = body;
    if (!orgId || !Array.isArray(journals) || journals.length === 0) {
      return json({ error: "orgId + journals[] required" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const tok = await fetchTokenForOrg(supabase, orgId);
    const accessToken = await ensureFreshToken(tok);
    const accountMap = await loadAccountMap(supabase, orgId);

    // Resolve logical accounts → QuickBooks AccountRef IDs
    const resolved = journals.map(j => resolveAccountIds(j, accountMap));

    if (dryRun === true || Deno.env.get("DRY_RUN") === "true") {
      return json({ ok: true, committed: 0, previewTransformed: resolved });
    }

    // Post each JournalEntry to QBO
    const results: Array<{ date: string; marketplace: string; id?: string; status: number }> = [];
    for (const j of resolved) {
      const entry = toQboJournalEntry(j, accountMap);
      const url = `${QBO_BASE}/v3/company/${tok.realm_id}/journalentry?minorversion=73`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ JournalEntry: entry })
      });

      const jsonRes = await res.json().catch(() => ({}));
      const id = jsonRes?.JournalEntry?.Id;
      results.push({ date: j.date, marketplace: j.marketplace, id, status: res.status });

      // Optional: persist to journal_exports
      await supabase.from("journal_exports").insert({
        org_id: orgId,
        provider: "quickbooks",
        period_start: j.date,
        period_end: j.date,
        status: res.ok ? "committed" : "error",
        preview: entry,
        payload: jsonRes
      });
    }

    return json({ ok: true, committed: results.filter(r => r.status < 300).length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

const REQUIRED_BUCKETS = ['revenue','shipping_income','fees_expense','refunds_contra','chargebacks_expense','shipping_cost','sales_tax_liability','clearing'];
const RECOMMENDED_TYPES: Record<string,string[]> = {
  revenue: ['Income','Other Income'],
  shipping_income: ['Income','Other Income'],
  fees_expense: ['Expense','Other Expense'],
  refunds_contra: ['Income','Other Income'],
  chargebacks_expense: ['Expense','Other Expense'],
  shipping_cost: ['Expense','Cost of Goods Sold','Other Expense'],
  sales_tax_liability: ['Other Current Liability','Long Term Liability'],
  clearing: ['Bank','Other Current Asset'],
};

type Body = { orgId: string; save?: boolean; lastTestForwardId?: string; lastTestReverseId?: string; lastVerifiedAt?: string };

const appUrl = Deno.env.get("APP_DASH_URL") ?? "https://app.example.com";

async function sendEmail(to: string[], subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ALERT_FROM") ?? "Alerts <alerts@example.com>";
  const bcc = Deno.env.get("ALERT_BCC");
  if (!key || !to.length) return;
  const body: any = { from, to, subject, html };
  if (bcc) body.bcc = bcc;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function sendSlack(webhook: string, text: string) {
  if (!webhook) return;
  await fetch(webhook, { method: "POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text }) });
}

serve(async (req)=>{
  try {
    if (req.method !== 'POST') return json({error:'POST required'},405);
    const { orgId, save, lastTestForwardId, lastTestReverseId, lastVerifiedAt } = await req.json() as Body;
    if (!orgId) return json({error:'orgId required'},400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // previous snapshot (for transitions)
    const { data: prevSnap } = await supabase.from('diagnostics_status').select('*').eq('org_id',orgId).maybeSingle();
    const prevOverall: 'green'|'yellow'|'red'|null = prevSnap?.overall ?? null;

    // 1) Token
    const { data: tok } = await supabase.from('integration_tokens')
      .select('*').eq('org_id',orgId).eq('provider','quickbooks').maybeSingle();
    if (!tok) {
      const overall: 'green'|'yellow'|'red' = 'red';
      if (save) {
        await supabase.from('diagnostics_status').upsert({
          org_id: orgId, overall, connected: false, mappings_complete: false, warnings_count: 0,
          last_test_forward_id: lastTestForwardId ?? undefined,
          last_test_reverse_id: lastTestReverseId ?? undefined,
          last_verified_at: lastVerifiedAt ?? undefined,
          updated_at: new Date().toISOString()
        });
        // transition handling
        await maybeFireAlert(supabase, orgId, prevOverall, overall);
      }
      return json({ health:{connected:false}, missing: REQUIRED_BUCKETS, warnings: [], overall });
    }
    const expSec = Math.max(0, Math.round((new Date(tok.expires_at).getTime() - Date.now())/1000));
    const health = { connected:true, expiresInSec: expSec, realmId: tok.realm_id };

    // 2) Mappings
    const { data: maps } = await supabase.from('account_mappings')
      .select('account_type, external_account_id, name').eq('org_id',orgId).eq('provider','quickbooks');
    const mapping = Object.fromEntries((maps||[]).map(m=>[m.account_type,m]));
    const missing = REQUIRED_BUCKETS.filter(k => !mapping[k]);

    // 3) Sanity via cache
    const { data: cache } = await supabase.from('external_accounts_cache')
      .select('external_id,name,acct_type').eq('org_id',orgId).eq('provider','quickbooks');
    const warnings: string[] = [];
    for (const b of REQUIRED_BUCKETS) {
      const m = mapping[b];
      if (!m) continue;
      const acct = cache?.find(c => c.external_id === m.external_account_id);
      const types = RECOMMENDED_TYPES[b] || [];
      if (acct && acct.acct_type && !types.includes(acct.acct_type)) {
        warnings.push(`${b} → ${acct.name} (${acct.acct_type})`);
      }
    }

    // 4) Overall
    let overall: 'green'|'yellow'|'red' = 'green';
    if (!health.connected || missing.length) overall = 'red';
    else if (warnings.length) overall = 'yellow';

    // 5) Save + Alerts
    if (save) {
      await supabase.from('diagnostics_status').upsert({
        org_id: orgId,
        overall,
        connected: health.connected,
        mappings_complete: missing.length === 0,
        warnings_count: warnings.length,
        last_test_forward_id: lastTestForwardId ?? undefined,
        last_test_reverse_id: lastTestReverseId ?? undefined,
        last_verified_at: lastVerifiedAt ?? undefined,
        updated_at: new Date().toISOString()
      });

      await maybeFireAlert(supabase, orgId, prevOverall, overall, { missing, warnings });
    }

    return json({ health, missing, warnings, overall });
  } catch(e){ return json({error:String(e)},500); }
  
  async function maybeFireAlert(
    supabase: any,
    orgId: string,
    prevOverall: 'green'|'yellow'|'red'|null,
    nextOverall: 'green'|'yellow'|'red',
    detail?: { missing: string[]; warnings: string[] }
  ) {
    if (prevOverall === nextOverall) return; // no change
    const { data: contacts } = await supabase.from('org_contacts').select('email, slack_webhook_url, notify').eq('org_id',orgId);
    const emails = (contacts||[]).filter(c=>c.notify && c.email).map(c=>c.email as string);
    const slack = (contacts||[]).find(c=>c.notify && c.slack_webhook_url)?.slack_webhook_url || Deno.env.get("ALERT_SLACK_DEFAULT") || "";

    // Only alert on meaningful edges
    let kind: 'degraded'|'recovered'|null = null;
    if (prevOverall && prevOverall !== 'red' && nextOverall === 'red') kind = 'degraded';       // → RED
    else if (prevOverall === 'red' && nextOverall !== 'red') kind = 'recovered';               // RED →
    else if (prevOverall && prevOverall !== 'yellow' && nextOverall === 'yellow') kind = 'degraded'; // optional: alert on yellow
    if (!kind) return;

    // Compose
    const title = kind === 'degraded'
      ? `QuickBooks status changed to ${nextOverall.toUpperCase()}`
      : `QuickBooks status recovered to ${nextOverall.toUpperCase()}`;

    const reason = detail
      ? [
          detail.missing.length ? `Missing mappings: ${detail.missing.join(', ')}` : null,
          detail.warnings.length ? `Warnings: ${detail.warnings.join('; ')}` : null
        ].filter(Boolean).join('<br/>')
      : '';

    const link = `${appUrl}/integrations/qb-diagnostics?org=${encodeURIComponent(orgId)}`;
    const html = `
      <div style="font-family:system-ui">
        <h2 style="margin:0 0 8px 0">${title}</h2>
        ${reason ? `<p style="margin:8px 0">${reason}</p>` : ''}
        <p style="margin:8px 0">Open diagnostics: <a href="${link}">${link}</a></p>
        <p style="color:#666;margin-top:16px">You received this because you're listed as a contact for this org.</p>
      </div>
    `;

    // Fire
    if (emails.length) { try { await sendEmail(emails, title, html); } catch { /* swallow */ } }
    if (slack) {
      const txt = `${title}\n${reason ? reason.replace(/<br\/?>/g, '\n') + '\n' : ''}${link}`;
      try { await sendSlack(slack, txt); } catch { /* swallow */ }
    }

    // Audit
    await supabase.from('alert_events').insert({
      org_id: orgId, prev_status: prevOverall, next_status: nextOverall, kind,
      recipients: emails
    });
  }
});
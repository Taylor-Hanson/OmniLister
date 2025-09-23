import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const QBO_BASE = "https://quickbooks.api.intuit.com";
function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

// --- Helpers ---
async function loadTokenAndMap(supabase:any, orgId:string){
  const { data: tok, error: tokErr } = await supabase.from('integration_tokens')
    .select('access_token, realm_id').eq('org_id', orgId).eq('provider','quickbooks').single();
  if (tokErr || !tok) throw new Error('QuickBooks not connected');

  const { data: maps, error: mapErr } = await supabase.from('account_mappings')
    .select('account_type, external_account_id')
    .eq('org_id', orgId).eq('provider','quickbooks');
  if (mapErr) throw new Error(mapErr.message);

  const map: Record<string,string> = {};
  for (const m of maps || []) map[m.account_type] = m.external_account_id;

  const required = ['revenue','shipping_income','fees_expense','refunds_contra','chargebacks_expense','shipping_cost','sales_tax_liability','clearing'];
  const missing = required.filter(k => !map[k]);
  if (missing.length) throw new Error(`Missing mappings: ${missing.join(', ')}`);

  return { accessToken: tok.access_token as string, realmId: tok.realm_id as string, map };
}

type TestBody = {
  orgId: string;
  sameDay?: boolean;          // default false => reverse next day
  classId?: string;           // optional QuickBooks ClassRef
  locationId?: string;        // optional QuickBooks DepartmentRef
  noteSuffix?: string;        // optional extra note for traceability
};

// cents→QuickBooks amount
const f = (n:number)=> Number((n/100).toFixed(2));

// Build a tiny "cover all buckets" line set
function buildLines(map: Record<string,string>) {
  // Credits (revenue-ish + tax)
  const credit = [
    { PostingType: 'Credit' as const, AccountRef: { value: map.revenue },             Amount: f(1),  Description: 'TEST: revenue' },
    { PostingType: 'Credit' as const, AccountRef: { value: map.shipping_income },     Amount: f(1),  Description: 'TEST: shipping income' },
    { PostingType: 'Credit' as const, AccountRef: { value: map.sales_tax_liability }, Amount: f(1),  Description: 'TEST: sales tax' },
  ];
  // Debits (expenses/cogs/contra)
  const debit = [
    { PostingType: 'Debit'  as const, AccountRef: { value: map.fees_expense },        Amount: f(1),  Description: 'TEST: fees' },
    { PostingType: 'Debit'  as const, AccountRef: { value: map.refunds_contra },      Amount: f(1),  Description: 'TEST: refunds contra' },
    { PostingType: 'Debit'  as const, AccountRef: { value: map.shipping_cost },       Amount: f(1),  Description: 'TEST: shipping cost' },
  ];

  // Balance to clearing
  const totalCr = credit.reduce((a,b)=>a+b.Amount,0);
  const totalDr = debit.reduce((a,b)=>a+b.Amount,0);
  const delta = +(totalCr - totalDr).toFixed(2);
  if (delta > 0) {
    debit.push({ PostingType: 'Debit' as const, AccountRef: { value: map.clearing }, Amount: delta, Description: 'TEST: clearing balance' });
  } else if (delta < 0) {
    credit.push({ PostingType: 'Credit' as const, AccountRef: { value: map.clearing }, Amount: Math.abs(delta), Description: 'TEST: clearing balance' });
  }
  return [...credit, ...debit];
}

function reverseLines(lines: any[]) {
  return lines.map(l => ({
    ...l,
    PostingType: l.PostingType === 'Debit' ? 'Credit' : 'Debit',
    Description: (l.Description ?? 'line') + ' (AUTO-REVERSE)'
  }));
}

function buildJE(dateISO: string, lines: any[], privateNote: string, classId?: string, locationId?: string) {
  // QBO JournalEntry format: { TxnDate, PrivateNote, Line: [{Amount, Description, JournalEntryLineDetail:{PostingType,AccountRef, ClassRef?, DepartmentRef?}}] }
  return {
    TxnDate: dateISO,
    PrivateNote: privateNote,
    Line: lines.map(l => ({
      Amount: l.Amount,
      Description: l.Description,
      DetailType: "JournalEntryLineDetail",
      JournalEntryLineDetail: {
        PostingType: l.PostingType,
        AccountRef: l.AccountRef,
        ...(classId ? { ClassRef: { value: classId } } : {}),
        ...(locationId ? { DepartmentRef: { value: locationId } } : {})
      }
    }))
  };
}

async function postJE(accessToken: string, realmId: string, entry: any) {
  const res = await fetch(`${QBO_BASE}/v3/company/${realmId}/journalentry?minorversion=73`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ JournalEntry: entry })
  });
  const payload = await res.json().catch(()=> ({}));
  if (!res.ok) {
    throw new Error(`QBO JournalEntry failed ${res.status}: ${JSON.stringify(payload?.Fault ?? payload)}`);
  }
  return payload?.JournalEntry?.Id as string | undefined;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
    const body = await req.json() as TestBody;
    if (!body?.orgId) return json({ error: 'orgId required' }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { accessToken, realmId, map } = await loadTokenAndMap(supabase, body.orgId);

    const today = new Date();
    const isoToday = today.toISOString().slice(0,10);
    const isoReverse = body.sameDay ? isoToday : new Date(today.getTime() + 24*3600*1000).toISOString().slice(0,10);

    // Forward entry
    const lines = buildLines(map);
    const noteBase = `RESALE APP • TEST EXPORT (AUTO-REVERSE) ${body.sameDay ? '(same day)' : '(next day)'}`;
    const note = body.noteSuffix ? `${noteBase} • ${body.noteSuffix}` : noteBase;

    const forwardJE = buildJE(isoToday, lines, note, body.classId, body.locationId);
    const forwardId = await postJE(accessToken, realmId, forwardJE);

    // Reverse entry
    const reversed = reverseLines(lines);
    const reverseNote = `${note} • REVERSE of #${forwardId ?? 'N/A'}`;
    const reverseJE = buildJE(isoReverse, reversed, reverseNote, body.classId, body.locationId);
    const reverseId = await postJE(accessToken, realmId, reverseJE);

    // (Optional) Persist a crumb in journal_exports for traceability
    await supabase.from('journal_exports').insert({
      org_id: body.orgId,
      provider: 'quickbooks',
      period_start: isoToday,
      period_end: isoReverse,
      status: 'committed',
      preview: forwardJE,
      payload: { forwardId, reverseId, autoReverse: true }
    });

    return json({ ok: true, forwardId, reverseId, date: isoToday, reverseDate: isoReverse });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

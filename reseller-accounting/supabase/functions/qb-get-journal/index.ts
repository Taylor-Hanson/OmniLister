import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const QBO_BASE = "https://quickbooks.api.intuit.com";
function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

type Body = { orgId: string; ids: string[] };

async function getTokenAndRealm(supabase:any, orgId:string){
  const { data, error } = await supabase
    .from('integration_tokens')
    .select('access_token, realm_id')
    .eq('org_id', orgId).eq('provider','quickbooks')
    .single();
  if (error || !data) throw new Error('QuickBooks not connected');
  return { accessToken: data.access_token as string, realmId: data.realm_id as string };
}

async function fetchJournal(accessToken:string, realmId:string, id:string) {
  const res = await fetch(`${QBO_BASE}/v3/company/${realmId}/journalentry/${encodeURIComponent(id)}?minorversion=73`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  const payload = await res.json().catch(()=> ({}));
  if (res.status === 404) return { id, ok:false, found:false };
  if (!res.ok) return { id, ok:false, found:false, error: payload?.Fault ?? payload };
  const je = payload?.JournalEntry;
  return { id, ok:true, found: !!je, txnDate: je?.TxnDate ?? null, privateNote: je?.PrivateNote ?? null };
}

serve(async (req)=>{
  try{
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
    const { orgId, ids } = await req.json() as Body;
    if (!orgId || !Array.isArray(ids) || ids.length === 0) return json({ error:'orgId and ids[] required' }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { accessToken, realmId } = await getTokenAndRealm(supabase, orgId);

    const results = [];
    for (const id of ids) {
      results.push(await fetchJournal(accessToken, realmId, id));
    }
    return json({ ok:true, results });
  }catch(e){ return json({error:String(e)},500); }
});
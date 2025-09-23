import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const QBO_BASE = "https://quickbooks.api.intuit.com";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

async function getToken(supabase:any, orgId:string){
  const { data, error } = await supabase.from('integration_tokens').select('*').eq('org_id',orgId).eq('provider','quickbooks').single();
  if(error || !data) throw new Error("Not connected to QuickBooks");
  return data as { access_token:string; realm_id:string; };
}

serve( async (req)=>{
  try{
    const u = new URL(req.url);
    const orgId = u.searchParams.get('orgId')!;
    if(!orgId) return json({error:'orgId required'},400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const tok = await getToken(supabase, orgId);

    // Query all accounts
    const q = "select * from Account where Active = true"; // QBO SQL
    const res = await fetch(`${QBO_BASE}/v3/company/${tok.realm_id}/query?query=${encodeURIComponent(q)}&minorversion=73`,{
      headers: { Authorization:`Bearer ${tok.access_token}`, Accept:'application/json' }
    });
    if(!res.ok) return json({error:`QBO query failed: ${res.status}`},500);
    const data = await res.json();
    const accounts = data?.QueryResponse?.Account ?? [];

    // Upsert into external_accounts_cache
    for (const a of accounts) {
      await supabase.from('external_accounts_cache').upsert({
        org_id: orgId,
        provider: 'quickbooks',
        external_id: String(a.Id),
        name: a.Name,
        acct_type: a.AccountType,
        acct_subtype: a.AccountSubType,
        active: Boolean(a.Active),
        updated_at: new Date().toISOString()
      });
    }

    return json({ ok:true, count: accounts.length });
  }catch(e){ return json({error:String(e)},500); }
});

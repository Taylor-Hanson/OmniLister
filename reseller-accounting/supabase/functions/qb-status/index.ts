import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

serve(async (req)=>{
  try{
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');
    if(!orgId) return json({error:'orgId required'},400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.from('integration_tokens').select('*').eq('org_id',orgId).eq('provider','quickbooks').single();
    if(error || !data) return json({ connected:false });
    const exp = new Date(data.expires_at).getTime();
    return json({ connected:true, expiresAt:data.expires_at, expiresInSec: Math.max(0, Math.round((exp - Date.now())/1000)), realmId: data.realm_id });
  }catch(e){return json({error:String(e)},500);}
});

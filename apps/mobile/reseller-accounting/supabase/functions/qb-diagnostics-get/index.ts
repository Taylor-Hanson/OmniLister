import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
function json(d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

serve(async (req)=>{
  try{
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');
    if(!orgId) return json({error:'orgId required'},400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.from('diagnostics_status').select('*').eq('org_id',orgId).maybeSingle();
    if (error) return json({error:error.message},500);
    return json({ ok:true, snapshot: data ?? null });
  }catch(e){ return json({error:String(e)},500); }
});
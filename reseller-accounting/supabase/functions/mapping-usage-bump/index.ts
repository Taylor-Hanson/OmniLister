import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type Row = { bucket: string; external_account_id: string };
type Body = { orgId: string; rows: Row[] };

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

serve(async (req)=>{
  try{
    if (req.method !== 'POST') return json({error:'POST required'},405);
    const { orgId, rows } = await req.json() as Body;
    if (!orgId || !Array.isArray(rows) || rows.length === 0) return json({error:'orgId + rows[] required'},400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    for (const r of rows) {
      await supabase.rpc('upsert_mapping_usage', {
        p_org_id: orgId,
        p_bucket: r.bucket,
        p_ext_id: r.external_account_id
      });
    }
    return json({ok:true, count: rows.length});
  }catch(e){ return json({error:String(e)},500); }
});

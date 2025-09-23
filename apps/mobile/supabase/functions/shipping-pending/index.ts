import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

serve(async (req)=>{
  try {
    if (req.method !== 'GET') return json({error:'GET required'},405);
    
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');
    
    if (!orgId) return json({error:'orgId required'},400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('org_id', orgId)
      .in('status', ['created', 'label_generated'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return json({error:error.message},500);

    return json({ shipments: shipments || [] });

  } catch(e){ 
    return json({error:String(e)},500); 
  }
});
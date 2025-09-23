import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// You can import or inline your qb-diagnostics logic here
async function runForOrg(orgId:string){
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/qb-diagnostics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orgId, save:true })
  });
}

serve(async ()=>{
  const { data: orgs } = await supabase.from('orgs').select('id');
  for (const o of orgs||[]) {
    await runForOrg(o.id);
  }
  return new Response('ok');
});
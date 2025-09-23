import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}
const QBO_AUTH = "https://appcenter.intuit.com/connect/oauth2";

function randomState() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');
    if(!orgId) return json({error:'orgId required'},400);

    const clientId = Deno.env.get("QBO_CLIENT_ID")!;
    const redirectUri = Deno.env.get("QBO_REDIRECT_URL")!;
    const scope = encodeURIComponent([
      "com.intuit.quickbooks.accounting",
      "openid","profile","email","phone","address"
    ].join(' '));

    const state = randomState();

    // store state
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabase.from('oauth_states').insert({ state, org_id: orgId, provider:'quickbooks' });
    if (error) return json({error: error.message},500);

    const authorizeUrl =
      `${QBO_AUTH}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`+
      `&response_type=code&scope=${scope}&state=${state}`;

    return json({ url: authorizeUrl, state });
  } catch(e){ return json({error:String(e)},500); }
});

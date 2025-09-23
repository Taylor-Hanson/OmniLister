import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const QBO_TOKEN = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

function html(body: string, s=200){return new Response(body,{status:s,headers:{'content-type':'text/html'}})}
function nowPlus(seconds:number){ return new Date(Date.now()+seconds*1000).toISOString(); }

async function exchangeCode(code: string, redirectUri: string, id: string, secret: string) {
  const creds = btoa(`${id}:${secret}`);
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const res = await fetch(QBO_TOKEN, {
    method: "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded", Authorization:`Basic ${creds}` },
    body: params.toString()
  });
  if(!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return await res.json();
}

serve(async (req) => {
  try {
    const u = new URL(req.url);
    const code = u.searchParams.get('code')!;
    const state = u.searchParams.get('state')!;
    const realmId = u.searchParams.get('realmId')!; // QBO company id

    if(!code || !state || !realmId) return html("<h3>Missing params</h3>",400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: st, error: stErr } = await supabase.from('oauth_states').select('*').eq('state',state).single();
    if (stErr || !st) return html("<h3>Invalid or expired state</h3>",400);

    const clientId = Deno.env.get("QBO_CLIENT_ID")!;
    const clientSecret = Deno.env.get("QBO_CLIENT_SECRET")!;
    const redirect = Deno.env.get("QBO_REDIRECT_URL")!;

    const tok = await exchangeCode(code, redirect, clientId, clientSecret);
    // tok includes: access_token, refresh_token, expires_in, x_refresh_token_expires_in, token_type, id_token (optional)

    const expiresAt = nowPlus(Number(tok.expires_in ?? 3500));

    // upsert integration_tokens
    const { error: upErr } = await supabase.from('integration_tokens').upsert({
      org_id: st.org_id,
      provider: 'quickbooks',
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      realm_id: realmId,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'org_id' });
    if (upErr) return html(`<h3>Token save failed: ${upErr.message}</h3>`,500);

    // delete used state
    await supabase.from('oauth_states').delete().eq('state', state);

    // Simple success page
    return html(`
      <html><body style="font-family:system-ui;padding:24px">
        <h2>QuickBooks Connected ✅</h2>
        <p>You can close this window and return to the app.</p>
      </body></html>
    `);
  } catch(e){ return html(`<h3>Error: ${String(e)}</h3>`,500); }
});

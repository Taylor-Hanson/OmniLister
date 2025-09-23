import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);

    const { orgId, code, state } = await req.json();
    if (!orgId || !code) return json({ error: "orgId and code required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Exchange code for tokens (simplified - in production use proper OAuth flow)
    const tokenResp = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: Deno.env.get("XERO_REDIRECT_URI")!,
        client_id: Deno.env.get("XERO_CLIENT_ID")!,
        client_secret: Deno.env.get("XERO_CLIENT_SECRET")!
      })
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      return json({ error: `Token exchange failed: ${err}` }, 400);
    }

    const tokens = await tokenResp.json();

    // Get tenant info
    const tenantResp = await fetch("https://api.xero.com/connections", {
      headers: { "Authorization": `Bearer ${tokens.access_token}` }
    });

    if (!tenantResp.ok) {
      return json({ error: "Failed to fetch tenant info" }, 400);
    }

    const tenantData = await tenantResp.json();
    const tenant = tenantData[0];

    if (!tenant) {
      return json({ error: "No tenant found" }, 400);
    }

    // Store tokens
    await supabase.from("integration_tokens").upsert({
      org_id: orgId,
      provider: "xero",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      company_id: tenant.tenantId,
      company_name: tenant.tenantName,
      updated_at: Date.now()
    });

    return json({ ok: true, tenantId: tenant.tenantId, companyName: tenant.tenantName });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

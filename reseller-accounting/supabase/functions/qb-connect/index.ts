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
    const tokenResp = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: Deno.env.get("QB_REDIRECT_URI")!,
        client_id: Deno.env.get("QB_CLIENT_ID")!,
        client_secret: Deno.env.get("QB_CLIENT_SECRET")!
      })
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      return json({ error: `Token exchange failed: ${err}` }, 400);
    }

    const tokens = await tokenResp.json();

    // Get company info
    const companyResp = await fetch("https://sandbox-quickbooks.api.intuit.com/v3/company/me", {
      headers: { "Authorization": `Bearer ${tokens.access_token}` }
    });

    if (!companyResp.ok) {
      return json({ error: "Failed to fetch company info" }, 400);
    }

    const companyData = await companyResp.json();
    const companyId = companyData.QueryResponse?.Company?.[0]?.Id;

    if (!companyId) {
      return json({ error: "No company found" }, 400);
    }

    // Store tokens
    await supabase.from("integration_tokens").upsert({
      org_id: orgId,
      provider: "quickbooks",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      company_id: companyId,
      company_name: companyData.QueryResponse?.Company?.[0]?.CompanyName,
      updated_at: Date.now()
    });

    return json({ ok: true, companyId, companyName: companyData.QueryResponse?.Company?.[0]?.CompanyName });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

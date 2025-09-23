import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "GET") return json({ error: "GET required" }, 405);

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return json({ error: `OAuth error: ${error}` }, 400);
    }

    if (!code) {
      return json({ error: "No authorization code received" }, 400);
    }

    // In a real app, you'd redirect back to the mobile app with the code
    // For now, just return the code for the mobile app to handle
    return json({ code, state });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

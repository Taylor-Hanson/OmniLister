import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@3.23.8";

const ExpenseRow = z.object({
  occurredAt: z.string(),
  amount: z.string().or(z.number()),
  category: z.string(),
  vendor: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  mileageMiles: z.string().or(z.number()).optional().nullable(),
  vehicleRate: z.string().or(z.number()).optional().nullable()
});

function moneyToCents(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
  return Math.round(n * 100);
}

function parseMaybeDate(s: string) {
  const tryFormats = ['yyyy-MM-dd', 'M/d/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd', 'dd-MMM-yyyy'];
  for (const f of tryFormats) {
    try {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    } catch {}
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  throw new Error(`Unrecognized date: ${s}`);
}

function sha256(s: string) {
  // Simple hash for demo; in production use crypto.subtle.digest
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);

    const { orgId, sourceLabel = "unknown", rows } = await req.json();
    if (!orgId || !Array.isArray(rows)) return json({ error: "orgId and rows[] required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const out: any[] = [];
    const errs: string[] = [];

    for (const row of rows) {
      try {
        const v = ExpenseRow.parse({
          occurredAt: row.occurredAt ?? row.date ?? row['Date'],
          amount: row.amount ?? row['Amount'],
          category: row.category ?? row['Category'],
          vendor: row.vendor ?? row['Vendor'],
          method: row.method ?? row['Method'],
          note: row.note ?? row['Note'],
          mileageMiles: row.mileageMiles ?? row['Mileage'],
          vehicleRate: row.vehicleRate ?? row['Vehicle Rate']
        });

        const occurredAt = parseMaybeDate(v.occurredAt);
        const rec = {
          id: crypto.randomUUID(),
          org_id: orgId,
          occurred_at: occurredAt,
          amount_cents: moneyToCents(v.amount as any),
          category: v.category.trim(),
          vendor: v.vendor ?? null,
          method: v.method ?? null,
          note: v.note ?? null,
          mileage_miles: v.mileageMiles != null ? Number(v.mileageMiles) : null,
          vehicle_rate: v.vehicleRate != null ? Number(v.vehicleRate) : null,
          row_hash: sha256(JSON.stringify([sourceLabel, occurredAt, v.amount, v.category, v.vendor ?? '']))
        };

        // Idempotent upsert
        const { data: existing } = await supabase
          .from("expenses")
          .select("id")
          .eq("org_id", orgId)
          .eq("row_hash", rec.row_hash)
          .single();

        if (existing) {
          errs.push(`Duplicate row skipped: ${rec.row_hash}`);
          continue;
        }

        const { error } = await supabase.from("expenses").insert(rec);
        if (error) throw error;
        out.push(rec.id);
      } catch (e: any) {
        errs.push(e.message ?? String(e));
      }
    }

    return json({ ok: true, inserted: out.length, errors: errs });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

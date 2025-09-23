const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type ExternalAccount = {
  external_id: string;
  name: string;
  acct_type?: string | null;
  acct_subtype?: string | null;
  active?: boolean | null;
};

export async function getCachedAccounts(orgId: string): Promise<ExternalAccount[]> {
  const url = `${BASE}/rest/v1/external_accounts_cache?org_id=eq.${orgId}&provider=eq.quickbooks&select=external_id,name,acct_type,acct_subtype,active&order=name.asc`;
  const r = await fetch(url, { headers: { apikey: ANON } });
  if (!r.ok) throw new Error(`accounts fetch failed: ${r.status}`);
  return r.json();
}

export type MappingRow = {
  id?: string;
  org_id: string;
  provider: 'quickbooks';
  account_type: string;          // our logical bucket key
  external_account_id: string;   // QBO Account.Id
  name?: string | null;
};

export async function getAccountMappings(orgId: string): Promise<MappingRow[]> {
  const url = `${BASE}/rest/v1/account_mappings?org_id=eq.${orgId}&provider=eq.quickbooks&select=org_id,provider,account_type,external_account_id,name`;
  const r = await fetch(url, { headers: { apikey: ANON } });
  if (!r.ok) throw new Error(`mappings fetch failed: ${r.status}`);
  return r.json();
}

export async function upsertAccountMappings(rows: MappingRow[]) {
  const url = `${BASE}/rest/v1/account_mappings`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: ANON,
      'content-type': 'application/json',
      // Upsert via PostgREST: requires unique(org_id, provider, account_type)
      'prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(rows)
  });
  if (!r.ok) {
    const text = await r.text().catch(()=>'');
    throw new Error(`save failed: ${r.status} ${text}`);
  }
  return r.json();
}

export async function getRecentAccounts(orgId: string, bucket: string) {
  const url = `${BASE}/rest/v1/account_mapping_usage?org_id=eq.${orgId}&provider=eq.quickbooks&bucket=eq.${bucket}&select=external_account_id,use_count,used_at&order=used_at.desc,use_count.desc&limit=5`;
  const r = await fetch(url, { headers: { apikey: ANON } });
  if (!r.ok) return [];
  return r.json() as Promise<Array<{ external_account_id: string; use_count: number; used_at: string }>>;
}

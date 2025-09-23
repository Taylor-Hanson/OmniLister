import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, FlatList } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!;

async function getStatus(orgId: string){
  const r = await fetch(`${BASE}/functions/v1/qb-status?orgId=${orgId}`);
  if(!r.ok) throw new Error('status failed'); return r.json();
}
async function startConnect(orgId: string){
  const r = await fetch(`${BASE}/functions/v1/qb-auth-init?orgId=${orgId}`);
  if(!r.ok) throw new Error('init failed'); return r.json();
}
async function syncAccounts(orgId: string){
  const r = await fetch(`${BASE}/functions/v1/qb-accounts-sync?orgId=${orgId}`);
  if(!r.ok) throw new Error('sync failed'); return r.json();
}
async function fetchCachedAccounts(orgId: string){
  // If you expose a REST for external_accounts_cache via RLS, call it; otherwise build a tiny function.
  const r = await fetch(`${BASE}/rest/v1/external_accounts_cache?org_id=eq.${orgId}&provider=eq.quickbooks`,{
    headers:{ 'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! }
  });
  if(!r.ok) return [];
  return r.json();
}

export default function QuickBooksConnect(){
  const orgId = "00000000-0000-0000-0000-000000000000"; // get from auth/org store
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);

  async function refresh(){
    setLoading(true);
    try { setStatus(await getStatus(orgId)); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ refresh(); },[]);

  const onConnect = async () => {
    try {
      const { url } = await startConnect(orgId);
      const res = await WebBrowser.openBrowserAsync(url);
      // After user authorizes, they'll see a success page. Let them come back and tap "Refresh".
    } catch(e:any){ Alert.alert('Connect failed', e.message); }
  };

  const onSyncAccounts = async () => {
    try{
      await syncAccounts(orgId);
      const list = await fetchCachedAccounts(orgId);
      setAccounts(list);
      Alert.alert('Synced', `Fetched ${list.length} accounts`);
    }catch(e:any){ Alert.alert('Sync failed', e.message); }
  };

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:18, fontWeight:'600' }}>QuickBooks Online</Text>
      {loading ? <ActivityIndicator/> : (
        <View>
          <Text>Connected: {status?.connected ? 'Yes' : 'No'}</Text>
          {status?.connected && <Text>Expires in: {status.expiresInSec}s</Text>}
        </View>
      )}

      {!status?.connected && (
        <Pressable onPress={onConnect} style={{ backgroundColor:'#111', padding:12, borderRadius:10 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Connect QuickBooks</Text>
        </Pressable>
      )}

      {status?.connected && (
        <>
          <Pressable onPress={refresh} style={{ backgroundColor:'#eee', padding:12, borderRadius:10 }}>
            <Text style={{ textAlign:'center' }}>Refresh Status</Text>
          </Pressable>

          <Pressable onPress={onSyncAccounts} style={{ backgroundColor:'#111', padding:12, borderRadius:10 }}>
            <Text style={{ color:'#fff', textAlign:'center' }}>Sync Chart of Accounts</Text>
          </Pressable>

          <FlatList
            data={accounts}
            keyExtractor={(x)=>x.external_id}
            renderItem={({item}) => (
              <View style={{ paddingVertical:8, borderBottomWidth:0.5, borderColor:'#ddd' }}>
                <Text style={{ fontWeight:'500' }}>{item.name}</Text>
                <Text style={{ color:'#666' }}>{item.acct_type} {item.acct_subtype ? `• ${item.acct_subtype}` : ''}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Modal, FlatList, TextInput } from 'react-native';
import { REQUIRED_BUCKETS, BucketKey, RECOMMENDED_BY_BUCKET } from '@/src/constants/accounts';
import { ExternalAccount, getCachedAccounts, getAccountMappings, upsertAccountMappings, getRecentAccounts } from '@/src/api/qbo';

type Selection = Record<BucketKey, string | undefined>; // external_account_id per bucket

function isRecommended(bucket: BucketKey, acct?: { acct_type?: string | null; acct_subtype?: string | null }) {
  if (!acct) return false;
  const rule = RECOMMENDED_BY_BUCKET[bucket];
  const t = (acct.acct_type ?? '').toLowerCase();
  const st = (acct.acct_subtype ?? '').toLowerCase();
  const types = (rule.acct_type ?? []).map(x=>x.toLowerCase());
  const subtypes = (rule.acct_subtype ?? []).map(x=>x.toLowerCase());
  const typeOk = types.length ? types.includes(t) : true;
  const subtypeOk = subtypes.length ? subtypes.includes(st) : true;
  return typeOk && subtypeOk;
}

// Simple searchable modal list for picking an account
function AccountPickerModal({
  visible, onClose, accounts, onSelect, bucket, recentIds = []
}: {
  visible: boolean; onClose: ()=>void; accounts: ExternalAccount[]; onSelect: (id: string)=>void; bucket: BucketKey; recentIds?: string[];
}) {
  const [q, setQ] = useState('');
  const [recOnly, setRecOnly] = useState(false);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    let list = accounts.filter(a => {
      if (recOnly && !isRecommended(bucket, a)) return false;
      if (!s) return true;
      return (
        a.name?.toLowerCase().includes(s) ||
        a.external_id.toLowerCase().includes(s) ||
        (a.acct_type ?? '').toLowerCase().includes(s) ||
        (a.acct_subtype ?? '').toLowerCase().includes(s)
      );
    });

    // Sort: recent first, then recommended, then name
    const recentRank = new Map(recentIds.map((id, i) => [id, i]));
    list.sort((a,b)=>{
      const ar = recentRank.has(a.external_id) ? 0 : 1;
      const br = recentRank.has(b.external_id) ? 0 : 1;
      if (ar !== br) return ar - br;

      const aRec = isRecommended(bucket, a) ? 0 : 1;
      const bRec = isRecommended(bucket, b) ? 0 : 1;
      if (aRec !== bRec) return aRec - bRec;

      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    return list;
  }, [q, accounts, recOnly, bucket, recentIds]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex:1, padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:'600', marginBottom:8 }}>Select QuickBooks Account</Text>

        <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
          <TextInput
            placeholder="Search name, id, type…"
            style={{ flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:10 }}
            value={q} onChangeText={setQ}
          />
          <Pressable
            onPress={()=> setRecOnly(v => !v)}
            style={{ paddingHorizontal:12, justifyContent:'center', borderWidth:1, borderColor:'#ddd', borderRadius:10, backgroundColor: recOnly ? '#111' : '#fff' }}
          >
            <Text style={{ color: recOnly ? '#fff' : '#111' }}>Recommended</Text>
          </Pressable>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(x)=>x.external_id}
          renderItem={({item})=>{
            const rec = isRecommended(bucket, item);
            return (
              <Pressable
                onPress={()=>{ onSelect(item.external_id); onClose(); }}
                style={({pressed})=>({ paddingVertical:10, borderBottomWidth:0.5, borderColor:'#eee', opacity: pressed?0.6:1 })}
              >
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View>
                    <Text style={{ fontWeight:'500' }}>{item.name}</Text>
                    <Text style={{ color:'#666', fontSize:12 }}>
                      {item.external_id} • {item.acct_type ?? 'Type'}{item.acct_subtype ? ` • ${item.acct_subtype}` : ''}
                    </Text>
                  </View>
                  {rec && (
                    <View style={{ paddingHorizontal:8, paddingVertical:4, backgroundColor:'#E7F7EA', borderRadius:8 }}>
                      <Text style={{ color:'#087443', fontSize:12 }}>Recommended</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />

        <Pressable onPress={onClose} style={{ marginTop:8, padding:12, borderRadius:10, backgroundColor:'#eee' }}>
          <Text style={{ textAlign:'center' }}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function QuickBooksMappingScreen(){
  // TODO: pull from your auth/org store
  const orgId = "00000000-0000-0000-0000-000000000000";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<ExternalAccount[]>([]);
  const [sel, setSel] = useState<Selection>({} as Selection);
  const [pickerFor, setPickerFor] = useState<BucketKey | null>(null);
  const [recentByBucket, setRecentByBucket] = useState<Record<BucketKey, string[]>>({} as any);

  const allSet = REQUIRED_BUCKETS.every(b => sel[b.key]);

  async function load() {
    setLoading(true);
    try {
      const [acc, map] = await Promise.all([ getCachedAccounts(orgId), getAccountMappings(orgId) ]);
      setAccounts(acc);
      // hydrate selection from existing mappings
      const base: Selection = {} as Selection;
      for (const b of REQUIRED_BUCKETS) {
        const m = map.find(x => x.account_type === b.key);
        base[b.key] = m?.external_account_id;
      }
      setSel(base);
    } catch (e:any) {
      Alert.alert('Load failed', e.message);
    } finally { setLoading(false); }
  }

  async function loadRecent(bucket: BucketKey) {
    const rows = await getRecentAccounts(orgId, bucket);
    setRecentByBucket(prev => ({ ...prev, [bucket]: rows.map(r => r.external_account_id) }));
  }

  useEffect(()=>{ load(); }, []);

  async function onSave() {
    try {
      if (!allSet) return Alert.alert('Incomplete', 'Map every required bucket before saving.');
      
      const bad: string[] = [];
      for (const b of REQUIRED_BUCKETS) {
        const id = sel[b.key];
        const acct = accounts.find(a => a.external_id === id);
        if (!isRecommended(b.key, acct)) bad.push(b.label);
      }
      if (bad.length) {
        const msg = `These mappings aren't using a typical account type:\n\n• ${bad.join('\n• ')}\n\nContinue anyway?`;
        const proceed = await new Promise<boolean>((resolve)=>{
          Alert.alert('Check mappings', msg, [
            { text:'Cancel', style:'cancel', onPress:()=>resolve(false) },
            { text:'Continue', style:'destructive', onPress:()=>resolve(true) }
          ]);
        });
        if (!proceed) return;
      }

      setSaving(true);
      const rows = REQUIRED_BUCKETS.map(b => ({
        org_id: orgId,
        provider: 'quickbooks' as const,
        account_type: b.key,
        external_account_id: sel[b.key]!,
        name: accounts.find(a => a.external_id === sel[b.key])?.name ?? null
      }));
      await upsertAccountMappings(rows);
      
      // Bump usage
      await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mapping-usage-bump`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId, rows: rows.map(r => ({ bucket: r.account_type, external_account_id: r.external_account_id })) })
      });
      
      Alert.alert('Saved', 'Account mappings updated.');
    } catch (e:any) {
      Alert.alert('Save failed', e.message);
    } finally { setSaving(false); }
  }

  const selectedName = (id?: string) => accounts.find(a => a.external_id === id)?.name ?? 'Not set';

  if (loading) {
    return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View>;
  }

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:18, fontWeight:'700' }}>QuickBooks Account Mapping</Text>
      <Text style={{ color:'#555' }}>
        Map each logical bucket to a QuickBooks account. You must complete all mappings before posting journals.
      </Text>

      <View style={{ borderWidth:1, borderColor:'#eee', borderRadius:12 }}>
        {REQUIRED_BUCKETS.map((b, idx)=>(
          <View key={b.key} style={{
            padding:12,
            borderTopWidth: idx===0?0:1,
            borderColor:'#eee',
            backgroundColor:'#fff'
          }}>
            <Text style={{ fontWeight:'600' }}>{b.label}</Text>
            {!!b.hint && <Text style={{ color:'#777', fontSize:12, marginTop:2 }}>{b.hint}</Text>}
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
              <Text style={{ color: sel[b.key] ? '#111' : '#c00' }}>
                {selectedName(sel[b.key])} {sel[b.key] ? '' : '(required)'}
              </Text>
              <Pressable
                onPress={() => { setPickerFor(b.key); loadRecent(b.key as BucketKey).catch(()=>{}); }}
                style={{ paddingVertical:8, paddingHorizontal:12, backgroundColor:'#111', borderRadius:10 }}
              >
                <Text style={{ color:'#fff' }}>Select account</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        disabled={!allSet || saving}
        onPress={onSave}
        style={{
          backgroundColor: (!allSet || saving) ? '#aaa' : '#0a0',
          padding:14, borderRadius:12
        }}
      >
        <Text style={{ color:'#fff', textAlign:'center', fontWeight:'700' }}>{saving ? 'Saving…' : 'Save mappings'}</Text>
      </Pressable>

      <Pressable
        onPress={async ()=>{
          try {
            const r = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/qb-test-journal-reverse`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                orgId,
                sameDay: false,         // false => reverse tomorrow (default accounting best practice)
                noteSuffix: 'Smoke test before enabling live exports'
              })
            });
            const data = await r.json();
            if (!r.ok || !data.ok) {
              throw new Error(data?.error ? JSON.stringify(data.error) : 'Auto-reverse test failed');
            }
            Alert.alert('Test Posted', `Forward #${data.forwardId}\nReverse #${data.reverseId}\nDates: ${data.date} → ${data.reverseDate}`);
          } catch (e:any) {
            Alert.alert('Test failed', String(e.message ?? e));
          }
        }}
        style={{ backgroundColor:'#111', padding:12, borderRadius:10 }}
      >
        <Text style={{ color:'#fff', textAlign:'center' }}>Run $0.01 Auto-Reverse Test</Text>
      </Pressable>

      <AccountPickerModal
        visible={pickerFor !== null}
        onClose={()=> setPickerFor(null)}
        accounts={accounts}
        bucket={pickerFor ?? 'revenue'}
        recentIds={pickerFor ? (recentByBucket[pickerFor] ?? []) : []}
        onSelect={(id)=> {
          if (!pickerFor) return;
          setSel(prev => ({ ...prev, [pickerFor]: id }));
        }}
      />
    </View>
  );
}

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Alert, ScrollView } from 'react-native';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export default function QBDiagnostics(){
  const orgId = "00000000-0000-0000-0000-000000000000"; // TODO: from store
  const [diag,setDiag] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  const [running,setRunning] = useState(false);
  const [testIds, setTestIds] = useState<{forwardId?:string; reverseId?:string}>({});
  const [verifying, setVerifying] = useState(false);
  const [verifyRes, setVerifyRes] = useState<{id:string; ok:boolean; found:boolean; txnDate?:string|null}[]|null>(null);

  async function saveSnapshot(payload: {
    orgId: string;
    overall?: 'green'|'yellow'|'red';
    lastTestForwardId?: string;
    lastTestReverseId?: string;
    lastVerifiedAt?: string;
  }) {
    const r = await fetch(`${BASE}/functions/v1/qb-diagnostics`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // save=true tells the function to upsert diagnostics_status
      body: JSON.stringify({ ...payload, save: true })
    });
    return r.json();
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/functions/v1/qb-diagnostics`, {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ orgId })
      });
      const d = await r.json();
      setDiag(d);
      // Save current snapshot
      await saveSnapshot({ orgId });
    } catch(e:any) {
      Alert.alert('Diagnostics failed', String(e.message));
    } finally { setLoading(false); }
  }

  async function runTest() {
    setRunning(true);
    try {
      const r = await fetch(`${BASE}/functions/v1/qb-test-journal-reverse`, {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ orgId })
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Test failed');
      setTestIds({ forwardId: d.forwardId, reverseId: d.reverseId });
      setVerifyRes(null);
      
      // Save test IDs to snapshot
      await saveSnapshot({
        orgId,
        lastTestForwardId: d.forwardId,
        lastTestReverseId: d.reverseId
      });
      
      Alert.alert('Test Posted',
        `Forward #${d.forwardId}\nReverse #${d.reverseId}\nDates: ${d.date} → ${d.reverseDate}`
      );
    } catch(e:any) {
      Alert.alert('Test export failed', String(e.message));
    } finally { setRunning(false); }
  }

  async function verifyIds() {
    if (!testIds.forwardId && !testIds.reverseId) {
      return Alert.alert('Nothing to verify', 'Run a test export first.');
    }
    setVerifying(true);
    try{
      const ids = [testIds.forwardId, testIds.reverseId].filter(Boolean);
      const r = await fetch(`${BASE}/functions/v1/qb-get-journal`, {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ orgId, ids })
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Verify failed');
      setVerifyRes(d.results);
      
      // Save verification timestamp
      const nowIso = new Date().toISOString();
      await saveSnapshot({
        orgId,
        lastTestForwardId: testIds.forwardId,
        lastTestReverseId: testIds.reverseId,
        lastVerifiedAt: nowIso
      });
    }catch(e:any){
      Alert.alert('Verification failed', String(e.message));
    }finally{
      setVerifying(false);
    }
  }

  useEffect(()=>{ load(); },[]);

  if (loading) return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>;

  return (
    <ScrollView style={{flex:1,padding:16}}>
      <Text style={{fontSize:20,fontWeight:'700',marginBottom:12}}>QuickBooks Diagnostics</Text>

      <Text style={{fontWeight:'600'}}>Connection</Text>
      {diag?.health?.connected
        ? <Text>✅ Connected • Expires in {Math.round(diag.health.expiresInSec/60)} min</Text>
        : <Text>❌ Not connected</Text>}

      <Text style={{fontWeight:'600',marginTop:16}}>Mappings</Text>
      {diag?.missing?.length
        ? <Text>❌ Missing: {diag.missing.join(', ')}</Text>
        : <Text>✅ All required buckets mapped</Text>}

      <Text style={{fontWeight:'600',marginTop:16}}>Warnings</Text>
      {diag?.warnings?.length
        ? diag.warnings.map((w:string,i:number)=><Text key={i}>⚠️ {w}</Text>)
        : <Text>✅ No type mismatches</Text>}

      {/* Actions */}
      <Pressable onPress={load} style={{backgroundColor:'#eee',padding:12,borderRadius:10,marginTop:20}}>
        <Text style={{textAlign:'center'}}>Refresh Diagnostics</Text>
      </Pressable>

      <Pressable
        onPress={runTest}
        disabled={running}
        style={{backgroundColor: running?'#aaa':'#111',padding:14,borderRadius:12,marginTop:12}}
      >
        <Text style={{color:'#fff',textAlign:'center',fontWeight:'700'}}>
          {running?'Running…':'Run $0.01 Auto-Reverse Test'}
        </Text>
      </Pressable>

      {(testIds.forwardId || testIds.reverseId) && (
        <View style={{marginTop:16}}>
          <Text style={{fontWeight:'600'}}>Last Test IDs</Text>
          {testIds.forwardId ? <Text>Forward: {testIds.forwardId}</Text> : null}
          {testIds.reverseId ? <Text>Reverse: {testIds.reverseId}</Text> : null}

          <Pressable
            onPress={verifyIds}
            disabled={verifying}
            style={{backgroundColor: verifying?'#aaa':'#0a0',padding:12,borderRadius:10,marginTop:8}}
          >
            <Text style={{color:'#fff',textAlign:'center',fontWeight:'700'}}>
              {verifying?'Verifying…':'Verify in QuickBooks'}
            </Text>
          </Pressable>

          {verifyRes && (
            <View style={{marginTop:10}}>
              {verifyRes.map(r => (
                <Text key={r.id}>
                  {r.found ? '✅' : '❌'} {r.id} {r.found && r.txnDate ? `• ${r.txnDate}` : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

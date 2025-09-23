import { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useAuthStore } from '@/src/state/useAuthStore';
import TrafficLightBadge, { DiagColor } from '@/src/components/TrafficLightBadge';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export default function SettingsScreen(){
  const { orgId } = useAuthStore();
  const [snap, setSnap] = useState<any>(null);

  async function loadSnapshot(){
    const r = await fetch(`${BASE}/functions/v1/qb-diagnostics-get?orgId=${orgId}`);
    const d = await r.json();
    setSnap(d?.snapshot ?? null);
  }

  useEffect(()=>{ loadSnapshot().catch(()=>{}); },[]);

  const status: DiagColor =
    snap?.overall ?? (snap ? 'yellow' : 'gray');

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ fontSize:20, fontWeight:'700' }}>Settings</Text>
        <TrafficLightBadge status={status} small />
      </View>

      <View style={{ backgroundColor:'#fff', padding:16, borderRadius:12, borderWidth:1, borderColor:'#eee' }}>
        <Text style={{ fontWeight:'600' }}>QuickBooks Diagnostics</Text>
        <Text style={{ color:'#666', marginTop:4 }}>
          {snap?.overall ? `Status: ${snap.overall.toUpperCase()} • Updated ${new Date(snap.updated_at).toLocaleString()}` : 'Not yet run'}
        </Text>
        
        <Pressable
          onPress={async ()=>{
            try {
              await fetch(`${BASE}/functions/v1/qb-diagnostics`, {
                method:'POST',
                headers:{'content-type':'application/json'},
                body: JSON.stringify({ orgId, save:true })
              });
              await loadSnapshot(); // re-pull snapshot
            } catch(e:any){
              Alert.alert('Recheck failed', String(e.message));
            }
          }}
          style={{ marginTop:8, padding:10, borderRadius:8, backgroundColor:'#eee' }}
        >
          <Text style={{ textAlign:'center' }}>Recheck now</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor:'#fff', padding:16, borderRadius:12, borderWidth:1, borderColor:'#eee' }}>
        <Text style={{ fontWeight:'600' }}>Your Org ID</Text>
        <Text style={{ color:'#666', marginTop:4 }}>{orgId}</Text>
      </View>
    </View>
  );
}

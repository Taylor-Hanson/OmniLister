import { View, Text } from 'react-native';

export type DiagColor = 'green'|'yellow'|'red'|'gray';

export default function TrafficLightBadge({ status, small=false }: { status: DiagColor; small?: boolean }) {
  const size = small ? 8 : 10;
  const bg = status === 'green' ? '#E7F7EA' : status === 'yellow' ? '#FFF7D6' : status === 'red' ? '#FFE5E5' : '#eee';
  const dot = status === 'green' ? '#17A34A' : status === 'yellow' ? '#B88200' : status === 'red' ? '#B80D0D' : '#999';
  const label = status === 'green' ? 'Healthy'
              : status === 'yellow' ? 'Needs attention'
              : status === 'red' ? 'Action required'
              : 'Unknown';
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:bg, paddingHorizontal:10, paddingVertical:6, borderRadius:999 }}>
      <View style={{ width:size, height:size, borderRadius:999, backgroundColor:dot }} />
      <Text style={{ fontWeight:'600', color:'#111' }}>{label}</Text>
    </View>
  );
}

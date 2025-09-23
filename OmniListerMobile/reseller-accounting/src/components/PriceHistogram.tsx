import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PriceBucket } from '../types/ebay';

interface PriceHistogramProps {
  data: PriceBucket[];
  height?: number;
}

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64; // Account for padding
const CHART_HEIGHT = 150;

export default function PriceHistogram({ data, height = CHART_HEIGHT }: PriceHistogramProps) {
  if (data.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>No distribution data available</Text>
      </View>
    );
  }

  // Calculate chart dimensions
  const padding = 20;
  const chartWidth = CHART_WIDTH - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Find max count for scaling
  const maxCount = Math.max(...data.map(bucket => bucket.count));
  const barWidth = chartWidth / data.length;

  return (
    <View style={{ height }}>
      {/* Y-axis labels */}
      <View style={{ position: 'absolute', left: 0, top: padding, height: chartHeight, justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: '#666' }}>{maxCount}</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>{Math.round(maxCount * 0.5)}</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>0</Text>
      </View>

      {/* Chart area */}
      <View style={{ marginLeft: 40, marginRight: padding, marginTop: padding, marginBottom: padding }}>
        {/* Grid lines */}
        <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
          {[0, 0.5, 1].map((ratio, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                top: ratio * chartHeight,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: '#f0f0f0',
              }}
            />
          ))}
        </View>

        {/* Bars */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: '100%' }}>
          {data.map((bucket, index) => {
            const barHeight = (bucket.count / maxCount) * chartHeight;
            const barColor = bucket.percentage > 20 ? '#007AFF' : 
                           bucket.percentage > 10 ? '#5AC8FA' : '#AFEEEE';
            
            return (
              <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                {/* Bar */}
                <View
                  style={{
                    width: barWidth * 0.8,
                    height: barHeight,
                    backgroundColor: barColor,
                    borderRadius: 2,
                    marginBottom: 4,
                  }}
                />
                
                {/* Count label */}
                {bucket.count > 0 && (
                  <Text style={{ 
                    fontSize: 8, 
                    color: '#666', 
                    textAlign: 'center',
                    marginTop: 2,
                  }}>
                    {bucket.count}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 40, marginRight: padding, marginTop: 8 }}>
        {data.map((bucket, index) => (
          <Text 
            key={index} 
            style={{ 
              fontSize: 8, 
              color: '#666',
              textAlign: 'center',
              flex: 1,
              transform: [{ rotate: '-45deg' }],
            }}
            numberOfLines={1}
          >
            ${bucket.min.toFixed(0)}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 8, backgroundColor: '#007AFF', borderRadius: 1 }} />
          <Text style={{ fontSize: 10, color: '#666' }}>High volume (20%+)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 8, backgroundColor: '#5AC8FA', borderRadius: 1 }} />
          <Text style={{ fontSize: 10, color: '#666' }}>Medium (10-20%)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 8, backgroundColor: '#AFEEEE', borderRadius: 1 }} />
          <Text style={{ fontSize: 10, color: '#666' }}>Low (10%-)</Text>
        </View>
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PriceTrendPoint } from '../types/ebay';

interface PriceChartProps {
  data: PriceTrendPoint[];
  height?: number;
}

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64; // Account for padding
const CHART_HEIGHT = 200;

export default function PriceChart({ data, height = CHART_HEIGHT }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>No trend data available</Text>
      </View>
    );
  }

  // Calculate chart dimensions
  const padding = 20;
  const chartWidth = CHART_WIDTH - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Find min/max values for scaling
  const prices = data.map(d => Math.max(d.averagePrice, d.medianPrice));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Calculate points for the line
  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.averagePrice - minPrice) / priceRange) * chartHeight;
    return { x, y, point };
  });

  // Create SVG path for the line
  const pathData = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');

  return (
    <View style={{ height }}>
      {/* Y-axis labels */}
      <View style={{ position: 'absolute', left: 0, top: padding, height: chartHeight, justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: '#666' }}>${maxPrice.toFixed(0)}</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>${((maxPrice + minPrice) / 2).toFixed(0)}</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>${minPrice.toFixed(0)}</Text>
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

        {/* Data points and line */}
        <View style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Simple line representation using View components */}
          {points.map((point, index) => (
            <View key={index}>
              {/* Line segment to next point */}
              {index < points.length - 1 && (
                <View
                  style={{
                    position: 'absolute',
                    left: point.x - padding,
                    top: point.y - padding,
                    width: Math.sqrt(
                      Math.pow(points[index + 1].x - point.x, 2) + 
                      Math.pow(points[index + 1].y - point.y, 2)
                    ),
                    height: 2,
                    backgroundColor: '#007AFF',
                    transform: [
                      {
                        rotate: `${Math.atan2(
                          points[index + 1].y - point.y,
                          points[index + 1].x - point.x
                        )}rad`
                      }
                    ],
                    transformOrigin: '0 0',
                  }}
                />
              )}
              
              {/* Data point */}
              <View
                style={{
                  position: 'absolute',
                  left: point.x - padding - 4,
                  top: point.y - padding - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#007AFF',
                  borderWidth: 2,
                  borderColor: 'white',
                }}
              />
            </View>
          ))}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 40, marginRight: padding, marginTop: 8 }}>
        {data.filter((_, index) => index % Math.ceil(data.length / 4) === 0).map((point, index) => (
          <Text key={index} style={{ fontSize: 10, color: '#666' }}>
            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 2, backgroundColor: '#007AFF' }} />
          <Text style={{ fontSize: 12, color: '#666' }}>Average Price</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 2, backgroundColor: '#34C759' }} />
          <Text style={{ fontSize: 12, color: '#666' }}>Median Price</Text>
        </View>
      </View>
    </View>
  );
}

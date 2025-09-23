import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { PriceRecommendation } from '../types/ebay';

interface PriceRecommendationsProps {
  recommendations: PriceRecommendation[];
}

export default function PriceRecommendations({ recommendations }: PriceRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>No recommendations available</Text>
      </View>
    );
  }

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'competitive':
        return '#007AFF';
      case 'premium':
        return '#FF9500';
      case 'budget':
        return '#34C759';
      default:
        return '#666';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'competitive':
        return '⚖️';
      case 'premium':
        return '💎';
      case 'budget':
        return '💰';
      default:
        return '💡';
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#34C759';
    if (confidence >= 0.6) return '#FF9500';
    return '#FF3B30';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <View style={{ gap: 12 }}>
      {recommendations.map((recommendation, index) => (
        <View
          key={index}
          style={{
            backgroundColor: '#f8f9fa',
            padding: 16,
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: getRecommendationColor(recommendation.type),
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>{getRecommendationIcon(recommendation.type)}</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', textTransform: 'capitalize' }}>
                {recommendation.type} Pricing
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: getRecommendationColor(recommendation.type) }}>
                {formatCurrency(recommendation.price)}
              </Text>
              <View style={{ 
                backgroundColor: getConfidenceColor(recommendation.confidence),
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                marginTop: 2,
              }}>
                <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>
                  {getConfidenceText(recommendation.confidence)} Confidence
                </Text>
              </View>
            </View>
          </View>

          {/* Reasoning */}
          <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
            {recommendation.reasoning}
          </Text>

          {/* Action Button */}
          <Pressable
            style={{
              backgroundColor: getRecommendationColor(recommendation.type),
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
              Use This Price
            </Text>
          </Pressable>
        </View>
      ))}

      {/* Additional Info */}
      <View style={{ backgroundColor: '#f0f8ff', padding: 12, borderRadius: 8, marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '600', marginBottom: 4 }}>
          💡 Pricing Tips
        </Text>
        <Text style={{ fontSize: 12, color: '#666', lineHeight: 16 }}>
          • Competitive pricing balances visibility with profit margins{'\n'}
          • Premium pricing works for unique or high-quality items{'\n'}
          • Budget pricing helps move inventory quickly{'\n'}
          • Consider your item's condition and market demand
        </Text>
      </View>
    </View>
  );
}

// Advanced Profit Analytics Screen - Comprehensive profit tracking dashboard

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { profitAnalyticsService, ProfitAnalytics } from '../services/profitAnalytics';

const { width } = Dimensions.get('window');

export default function AdvancedProfitAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<ProfitAnalytics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const data = await profitAnalyticsService.calculateProfitAnalytics(startDate, endDate);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      Alert.alert('Error', 'Failed to load profit analytics');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  };

  const exportAnalytics = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const filename = await profitAnalyticsService.exportAnalytics(format);
      Alert.alert('Success', `Analytics exported to ${filename}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export analytics');
    }
  };

  const scheduleReport = async () => {
    Alert.alert(
      'Schedule Report',
      'Choose report frequency:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Daily', onPress: () => profitAnalyticsService.scheduleReport('daily', 'user@example.com') },
        { text: 'Weekly', onPress: () => profitAnalyticsService.scheduleReport('weekly', 'user@example.com') },
        { text: 'Monthly', onPress: () => profitAnalyticsService.scheduleReport('monthly', 'user@example.com') },
      ]
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['7d', '30d', '90d', '1y'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {period.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderKeyMetrics = () => {
    if (!analytics) return null;

    const { metrics } = analytics;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={['rgba(52,199,89,0.1)', 'rgba(52,199,89,0.05)']}
              style={styles.metricGradient}
            >
              <Ionicons name="trending-up" size={24} color="#34C759" />
              <Text style={styles.metricValue}>${metrics.totalRevenue.toFixed(0)}</Text>
              <Text style={styles.metricLabel}>Total Revenue</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
              style={styles.metricGradient}
            >
              <Ionicons name="cash" size={24} color="#007AFF" />
              <Text style={styles.metricValue}>${metrics.netProfit.toFixed(0)}</Text>
              <Text style={styles.metricLabel}>Net Profit</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['rgba(255,149,0,0.1)', 'rgba(255,149,0,0.05)']}
              style={styles.metricGradient}
            >
              <Ionicons name="percent" size={24} color="#FF9500" />
              <Text style={styles.metricValue}>{metrics.profitMargin.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Profit Margin</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['rgba(175,82,222,0.1)', 'rgba(175,82,222,0.05)']}
              style={styles.metricGradient}
            >
              <Ionicons name="analytics" size={24} color="#AF52DE" />
              <Text style={styles.metricValue}>{metrics.roi.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>ROI</Text>
            </LinearGradient>
          </View>
        </View>
      </View>
    );
  };

  const renderCostBreakdown = () => {
    if (!analytics) return null;

    const { costBreakdown } = analytics;
    const chartData = [
      {
        name: 'Product Cost',
        population: costBreakdown.productCost,
        color: '#007AFF',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Marketplace Fees',
        population: costBreakdown.marketplaceFees,
        color: '#34C759',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Shipping',
        population: costBreakdown.shippingCost,
        color: '#FF9500',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Storage',
        population: costBreakdown.storageCost,
        color: '#AF52DE',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Labor',
        population: costBreakdown.laborCost,
        color: '#FF3B30',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            width={width - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>
    );
  };

  const renderMarketplacePerformance = () => {
    if (!analytics) return null;

    const { marketplacePerformance } = analytics;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketplace Performance</Text>
        {marketplacePerformance.map((marketplace, index) => (
          <View key={index} style={styles.marketplaceCard}>
            <View style={styles.marketplaceHeader}>
              <Text style={styles.marketplaceName}>{marketplace.marketplace}</Text>
              <Text style={styles.marketplaceMargin}>{marketplace.margin.toFixed(1)}%</Text>
            </View>
            <View style={styles.marketplaceStats}>
              <View style={styles.marketplaceStat}>
                <Text style={styles.marketplaceStatValue}>${marketplace.revenue.toFixed(0)}</Text>
                <Text style={styles.marketplaceStatLabel}>Revenue</Text>
              </View>
              <View style={styles.marketplaceStat}>
                <Text style={styles.marketplaceStatValue}>${marketplace.profit.toFixed(0)}</Text>
                <Text style={styles.marketplaceStatLabel}>Profit</Text>
              </View>
              <View style={styles.marketplaceStat}>
                <Text style={styles.marketplaceStatValue}>{marketplace.orders}</Text>
                <Text style={styles.marketplaceStatLabel}>Orders</Text>
              </View>
              <View style={styles.marketplaceStat}>
                <Text style={styles.marketplaceStatValue}>${marketplace.averageOrderValue.toFixed(0)}</Text>
                <Text style={styles.marketplaceStatLabel}>AOV</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTrends = () => {
    if (!analytics) return null;

    const { trends } = analytics;

    const revenueData = {
      labels: trends.revenue.slice(-7).map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: trends.revenue.slice(-7).map(item => item.value),
          color: (opacity = 1) => `rgba(0,122,255,${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    const profitData = {
      labels: trends.profit.slice(-7).map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: trends.profit.slice(-7).map(item => item.value),
          color: (opacity = 1) => `rgba(52,199,89,${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trends</Text>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Revenue Trend</Text>
          <LineChart
            data={revenueData}
            width={width - 40}
            height={220}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#007AFF',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Profit Trend</Text>
          <LineChart
            data={profitData}
            width={width - 40}
            height={220}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#34C759',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>
    );
  };

  const renderInsights = () => {
    if (!analytics) return null;

    const { insights, recommendations } = analytics;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Insights & Recommendations</Text>
        
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>Key Insights</Text>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Ionicons name="bulb" size={16} color="#FF9500" />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => exportAnalytics('csv')}>
          <Ionicons name="download" size={24} color="#007AFF" />
          <Text style={styles.actionTitle}>Export CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => exportAnalytics('pdf')}>
          <Ionicons name="document-text" size={24} color="#FF3B30" />
          <Text style={styles.actionTitle}>Export PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={scheduleReport}>
          <Ionicons name="calendar" size={24} color="#34C759" />
          <Text style={styles.actionTitle}>Schedule Report</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => exportAnalytics('excel')}>
          <Ionicons name="table" size={24} color="#FF9500" />
          <Text style={styles.actionTitle}>Export Excel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Advanced Profit Analytics</Text>
        <Text style={styles.headerSubtitle}>
          Comprehensive profit tracking and analysis
        </Text>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      {/* Key Metrics */}
      {renderKeyMetrics()}

      {/* Cost Breakdown */}
      {renderCostBreakdown()}

      {/* Marketplace Performance */}
      {renderMarketplacePerformance()}

      {/* Trends */}
      {renderTrends()}

      {/* Insights */}
      {renderInsights()}

      {/* Actions */}
      {renderActions()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 20,
    alignItems: 'center',
  },
  metricValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  metricLabel: {
    color: '#666',
    fontSize: 12,
  },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  chartTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  marketplaceCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  marketplaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  marketplaceName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  marketplaceMargin: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
  },
  marketplaceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketplaceStat: {
    alignItems: 'center',
  },
  marketplaceStatValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  marketplaceStatLabel: {
    color: '#666',
    fontSize: 12,
  },
  insightsCard: {
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
  },
  insightsTitle: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  insightText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  recommendationsCard: {
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
  },
  recommendationsTitle: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  actionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
});

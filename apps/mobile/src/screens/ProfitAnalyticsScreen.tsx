// Profit Analytics Screen - Comprehensive profit tracking

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { profitAnalytics, ProfitAnalytics as ProfitAnalyticsType, MarketplacePerformance, CategoryPerformance } from '../services/profitAnalytics';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

export default function ProfitAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<ProfitAnalyticsType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await profitAnalytics.generateProfitAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  };

  const periodOptions = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ];

  const chartConfig = {
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
  };

  if (!analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profit Analytics</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periodOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.periodButton,
              selectedPeriod === option.key && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(option.key)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === option.key && styles.periodButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>${analytics.overall.netProfit.toFixed(2)}</Text>
          <Text style={styles.metricLabel}>Net Profit</Text>
          <View style={styles.metricTrend}>
            <Ionicons name="trending-up" size={16} color="#34C759" />
            <Text style={styles.trendText}>+12%</Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{analytics.overall.profitMargin.toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>Profit Margin</Text>
          <View style={styles.metricTrend}>
            <Ionicons name="trending-up" size={16} color="#34C759" />
            <Text style={styles.trendText}>+2.1%</Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{analytics.overall.roi.toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>ROI</Text>
          <View style={styles.metricTrend}>
            <Ionicons name="trending-up" size={16} color="#34C759" />
            <Text style={styles.trendText}>+5.3%</Text>
          </View>
        </View>
      </View>

      {/* Cost Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        <View style={styles.costBreakdownCard}>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Sourcing Cost</Text>
            <Text style={styles.costValue}>${analytics.overall.costBreakdown.sourcingCost.toFixed(2)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Marketplace Fees</Text>
            <Text style={styles.costValue}>${analytics.overall.costBreakdown.marketplaceFees.toFixed(2)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Shipping Cost</Text>
            <Text style={styles.costValue}>${analytics.overall.costBreakdown.shippingCost.toFixed(2)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Payment Processing</Text>
            <Text style={styles.costValue}>${analytics.overall.costBreakdown.paymentProcessingFees.toFixed(2)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Packaging</Text>
            <Text style={styles.costValue}>${analytics.overall.costBreakdown.packagingCost.toFixed(2)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Labor</Text>
            <Text style={styles.costValue}>${analytics.overall.costBreakdown.laborCost.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Marketplace Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketplace Performance</Text>
        {analytics.byMarketplace.map((marketplace, index) => (
          <View key={index} style={styles.marketplaceCard}>
            <View style={styles.marketplaceHeader}>
              <Text style={styles.marketplaceName}>{marketplace.marketplace}</Text>
              <View style={styles.marketplaceStats}>
                <Text style={styles.marketplaceProfit}>${marketplace.netProfit.toFixed(2)}</Text>
                <Text style={styles.marketplaceMargin}>{marketplace.profitMargin.toFixed(1)}%</Text>
              </View>
            </View>
            <View style={styles.marketplaceDetails}>
              <View style={styles.marketplaceDetail}>
                <Text style={styles.marketplaceDetailLabel}>Sales</Text>
                <Text style={styles.marketplaceDetailValue}>{marketplace.totalSales}</Text>
              </View>
              <View style={styles.marketplaceDetail}>
                <Text style={styles.marketplaceDetailLabel}>Revenue</Text>
                <Text style={styles.marketplaceDetailValue}>${marketplace.totalRevenue.toFixed(2)}</Text>
              </View>
              <View style={styles.marketplaceDetail}>
                <Text style={styles.marketplaceDetailLabel}>AOV</Text>
                <Text style={styles.marketplaceDetailValue}>${marketplace.averageOrderValue.toFixed(2)}</Text>
              </View>
              <View style={styles.marketplaceDetail}>
                <Text style={styles.marketplaceDetailLabel}>Fees</Text>
                <Text style={styles.marketplaceDetailValue}>{marketplace.feePercentage.toFixed(1)}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Category Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Performance</Text>
        {analytics.byCategory.map((category, index) => (
          <View key={index} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category.category}</Text>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryProfit}>${category.netProfit.toFixed(2)}</Text>
                <Text style={styles.categoryMargin}>{category.profitMargin.toFixed(1)}%</Text>
              </View>
            </View>
            <View style={styles.categoryDetails}>
              <View style={styles.categoryDetail}>
                <Text style={styles.categoryDetailLabel}>Items</Text>
                <Text style={styles.categoryDetailValue}>{category.totalSales}</Text>
              </View>
              <View style={styles.categoryDetail}>
                <Text style={styles.categoryDetailLabel}>ASP</Text>
                <Text style={styles.categoryDetailValue}>${category.averageSellingPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.categoryDetail}>
                <Text style={styles.categoryDetailLabel}>Cost Basis</Text>
                <Text style={styles.categoryDetailValue}>${category.averageCostBasis.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Tax Report */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax Report</Text>
        <View style={styles.taxCard}>
          <View style={styles.taxHeader}>
            <Text style={styles.taxPeriod}>{analytics.taxReport.period}</Text>
            <Text style={styles.taxAmount}>${analytics.taxReport.estimatedTax.toFixed(2)}</Text>
          </View>
          <View style={styles.taxBreakdown}>
            <View style={styles.taxItem}>
              <Text style={styles.taxLabel}>Total Revenue</Text>
              <Text style={styles.taxValue}>${analytics.taxReport.totalRevenue.toFixed(2)}</Text>
            </View>
            <View style={styles.taxItem}>
              <Text style={styles.taxLabel}>Total Costs</Text>
              <Text style={styles.taxValue}>${analytics.taxReport.totalCosts.toFixed(2)}</Text>
            </View>
            <View style={styles.taxItem}>
              <Text style={styles.taxLabel}>Net Profit</Text>
              <Text style={styles.taxValue}>${analytics.taxReport.netProfit.toFixed(2)}</Text>
            </View>
            <View style={styles.taxItem}>
              <Text style={styles.taxLabel}>Taxable Income</Text>
              <Text style={styles.taxValue}>${analytics.taxReport.taxableIncome.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* AI Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Recommendations</Text>
        <View style={styles.recommendationsCard}>
          {analytics.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Ionicons name="bulb" size={16} color="#FF9500" />
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 5,
    borderRadius: 10,
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
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  metricValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  metricLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
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
  costBreakdownCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  costLabel: {
    color: '#666',
    fontSize: 14,
  },
  costValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
  marketplaceStats: {
    alignItems: 'flex-end',
  },
  marketplaceProfit: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
  },
  marketplaceMargin: {
    color: '#666',
    fontSize: 12,
  },
  marketplaceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketplaceDetail: {
    alignItems: 'center',
  },
  marketplaceDetailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  marketplaceDetailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryProfit: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryMargin: {
    color: '#666',
    fontSize: 12,
  },
  categoryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryDetail: {
    alignItems: 'center',
  },
  categoryDetailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  categoryDetailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taxCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
  },
  taxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  taxPeriod: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taxAmount: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
  },
  taxBreakdown: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  taxItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  taxLabel: {
    color: '#666',
    fontSize: 14,
  },
  taxValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recommendationsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
});

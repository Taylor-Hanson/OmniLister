// Analytics Screen - Modern UI with charts and metrics

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

export default function AnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43],
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const revenueData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        data: [100, 150, 200, 300],
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      },
    ],
  };

  const marketplaceData = [
    {
      name: 'eBay',
      population: 35,
      color: '#E53238',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Amazon',
      population: 25,
      color: '#FF9900',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Etsy',
      population: 20,
      color: '#F16521',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Others',
      population: 20,
      color: '#8E8E93',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
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

  const periodOptions = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#007AFF" />
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
          <Text style={styles.metricValue}>$1,200</Text>
          <Text style={styles.metricLabel}>Total Sales</Text>
          <View style={styles.metricTrend}>
            <Ionicons name="trending-up" size={16} color="#34C759" />
            <Text style={styles.trendText}>+15%</Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>$1,200</Text>
          <Text style={styles.metricLabel}>Monthly Sales</Text>
          <View style={styles.metricTrend}>
            <Ionicons name="trending-up" size={16} color="#34C759" />
            <Text style={styles.trendText}>+12%</Text>
          </View>
        </View>
      </View>

      {/* Sales Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Sales Performance</Text>
          <Text style={styles.chartSubtitle}>Year-over-Year Growth</Text>
        </View>
        <View style={styles.chartWrapper}>
          <LineChart
            data={salesData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      </View>

      {/* Revenue Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Profit Margins</Text>
          <Text style={styles.chartSubtitle}>Quarterly Revenue</Text>
        </View>
        <View style={styles.chartWrapper}>
          <BarChart
            data={revenueData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>
      </View>

      {/* Marketplace Distribution */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Marketplace Comparison</Text>
          <Text style={styles.chartSubtitle}>Sales Distribution</Text>
        </View>
        <View style={styles.chartWrapper}>
          <PieChart
            data={marketplaceData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>
      </View>

      {/* Growth Metrics */}
      <View style={styles.growthContainer}>
        <View style={styles.growthCard}>
          <View style={styles.growthIcon}>
            <Ionicons name="trending-up" size={24} color="#34C759" />
          </View>
          <View style={styles.growthContent}>
            <Text style={styles.growthValue}>+15%</Text>
            <Text style={styles.growthLabel}>Monthly Growth</Text>
          </View>
        </View>

        <View style={styles.growthCard}>
          <View style={styles.growthIcon}>
            <Ionicons name="people" size={24} color="#007AFF" />
          </View>
          <View style={styles.growthContent}>
            <Text style={styles.growthValue}>1,234</Text>
            <Text style={styles.growthLabel}>Total Views</Text>
          </View>
        </View>
      </View>

      {/* AI Insights */}
      <View style={styles.aiInsightsContainer}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.aiInsightsCard}
        >
          <View style={styles.aiInsightsHeader}>
            <Ionicons name="sparkles" size={24} color="#007AFF" />
            <Text style={styles.aiInsightsTitle}>AI Insights</Text>
          </View>
          <Text style={styles.aiInsightsText}>
            Your listings perform 25% better on weekends. Consider scheduling new posts for Friday evenings.
          </Text>
          <TouchableOpacity style={styles.aiInsightsButton}>
            <Text style={styles.aiInsightsButtonText}>View More Insights</Text>
            <Ionicons name="arrow-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  filterButton: {
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
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  chartSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  growthContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  growthCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
  },
  growthIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  growthContent: {
    flex: 1,
  },
  growthValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  growthLabel: {
    color: '#666',
    fontSize: 14,
  },
  aiInsightsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  aiInsightsCard: {
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  aiInsightsTitle: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  aiInsightsText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  aiInsightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  aiInsightsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
  },
});

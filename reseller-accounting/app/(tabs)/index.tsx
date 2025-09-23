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
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis } from 'victory-native';
import { useAuthStore } from '@/src/state/useAuthStore';
import { useSyncStore } from '@/src/state/useSyncStore';
import { formatMoney } from '@/src/utils/money';

export default function DashboardScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const { isOnline, isSyncing, setSyncing } = useSyncStore();
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState({
    revenue: 0,
    grossProfit: 0,
    netProfit: 0,
    itemsSold: 0,
    averageSalePrice: 0,
  });

  // Mock data for demonstration
  const mockTrendData = [
    { x: '2024-01-01', y: 1200 },
    { x: '2024-01-02', y: 1500 },
    { x: '2024-01-03', y: 1800 },
    { x: '2024-01-04', y: 1600 },
    { x: '2024-01-05', y: 2000 },
    { x: '2024-01-06', y: 2200 },
    { x: '2024-01-07', y: 1900 },
  ];

  const loadDashboardData = async () => {
    setSyncing(true);
    try {
      // In a real app, this would fetch from your API
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setKpis({
        revenue: 15000, // $150.00
        grossProfit: 8000, // $80.00
        netProfit: 6000, // $60.00
        itemsSold: 25,
        averageSalePrice: 600, // $6.00
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setSyncing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome to Reseller Accounting</Text>
        <Text style={styles.subText}>Please sign in to continue</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#FF3B30' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'} {isSyncing && '• Syncing...'}
          </Text>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Revenue</Text>
          <Text style={styles.kpiValue}>{formatMoney(kpis.revenue)}</Text>
          <Text style={styles.kpiChange}>+12% vs last month</Text>
        </View>
        
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Gross Profit</Text>
          <Text style={styles.kpiValue}>{formatMoney(kpis.grossProfit)}</Text>
          <Text style={styles.kpiChange}>+8% vs last month</Text>
        </View>
        
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Net Profit</Text>
          <Text style={styles.kpiValue}>{formatMoney(kpis.netProfit)}</Text>
          <Text style={styles.kpiChange}>+15% vs last month</Text>
        </View>
        
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Items Sold</Text>
          <Text style={styles.kpiValue}>{kpis.itemsSold}</Text>
          <Text style={styles.kpiChange}>+5 vs last month</Text>
        </View>
      </View>

      {/* Revenue Trend Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Trend (Last 7 Days)</Text>
        <VictoryChart
          height={200}
          padding={{ left: 50, top: 20, right: 20, bottom: 40 }}
        >
          <VictoryAxis
            dependentAxis
            tickFormat={(x) => `$${x / 100}`}
            style={{
              axis: { stroke: '#E5E5EA' },
              tickLabels: { fontSize: 12, fill: '#8E8E93' },
            }}
          />
          <VictoryAxis
            tickFormat={(x) => new Date(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            style={{
              axis: { stroke: '#E5E5EA' },
              tickLabels: { fontSize: 12, fill: '#8E8E93' },
            }}
          />
          <VictoryArea
            data={mockTrendData}
            style={{
              data: { fill: '#007AFF', fillOpacity: 0.3, stroke: '#007AFF', strokeWidth: 2 },
            }}
          />
        </VictoryChart>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Add Sale</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="receipt" size={24} color="#34C759" />
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document" size={24} color="#FF9500" />
            <Text style={styles.actionText}>Create Invoice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="cloud-upload" size={24} color="#AF52DE" />
            <Text style={styles.actionText}>Import CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Ionicons name="trending-up" size={20} color="#34C759" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Sale: iPhone 13</Text>
              <Text style={styles.activitySubtitle}>eBay • $650.00</Text>
            </View>
            <Text style={styles.activityTime}>2h ago</Text>
          </View>
          
          <View style={styles.activityItem}>
            <Ionicons name="receipt" size={20} color="#FF9500" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Expense: Shipping</Text>
              <Text style={styles.activitySubtitle}>$12.50</Text>
            </View>
            <Text style={styles.activityTime}>4h ago</Text>
          </View>
          
          <View style={styles.activityItem}>
            <Ionicons name="document" size={20} color="#007AFF" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Invoice: INV-001</Text>
              <Text style={styles.activitySubtitle}>$150.00</Text>
            </View>
            <Text style={styles.activityTime}>1d ago</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginRight: '2%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  kpiChange: {
    fontSize: 12,
    color: '#34C759',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginTop: 8,
  },
  recentActivity: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 100,
    color: '#000',
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    color: '#8E8E93',
  },
});

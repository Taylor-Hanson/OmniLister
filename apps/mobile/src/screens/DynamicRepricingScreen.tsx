// Dynamic Repricing Screen - Real-time competitor monitoring and automatic price adjustments

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { dynamicRepricingEngine, RepricingRule, RepricingResult, RepricingAnalytics } from '../services/dynamicRepricingEngine';

export default function DynamicRepricingScreen() {
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [rules, setRules] = useState<RepricingRule[]>([]);
  const [results, setResults] = useState<RepricingResult[]>([]);
  const [analytics, setAnalytics] = useState<RepricingAnalytics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRepricingData();
  }, []);

  const loadRepricingData = async () => {
    try {
      const status = dynamicRepricingEngine.getEngineStatus();
      setIsEngineRunning(status.isRunning);
      
      const repricingRules = dynamicRepricingEngine.getRepricingRules();
      setRules(repricingRules);
      
      const repricingResults = dynamicRepricingEngine.getRepricingResults(20);
      setResults(repricingResults);
      
      const repricingAnalytics = await dynamicRepricingEngine.getRepricingAnalytics();
      setAnalytics(repricingAnalytics);
    } catch (error) {
      console.error('Failed to load repricing data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRepricingData();
    setIsRefreshing(false);
  };

  const toggleEngine = async () => {
    try {
      if (isEngineRunning) {
        await dynamicRepricingEngine.stopRepricing();
        setIsEngineRunning(false);
        Alert.alert('Success', 'Repricing engine stopped');
      } else {
        const success = await dynamicRepricingEngine.startRepricing();
        if (success) {
          setIsEngineRunning(true);
          Alert.alert('Success', 'Repricing engine started');
        } else {
          Alert.alert('Error', 'Failed to start repricing engine');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle repricing engine');
    }
  };

  const addNewRule = () => {
    Alert.alert(
      'Add Repricing Rule',
      'This will open the rule creation screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create Rule', onPress: () => {
          // In real app, navigate to rule creation screen
          console.log('Navigate to rule creation screen');
        }}
      ]
    );
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const success = await dynamicRepricingEngine.updateRepricingRule(ruleId, { enabled });
      if (success) {
        await loadRepricingData();
      } else {
        Alert.alert('Error', 'Failed to update rule');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this repricing rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const success = await dynamicRepricingEngine.deleteRepricingRule(ruleId);
          if (success) {
            await loadRepricingData();
            Alert.alert('Success', 'Rule deleted successfully');
          } else {
            Alert.alert('Error', 'Failed to delete rule');
          }
        }}
      ]
    );
  };

  const renderEngineStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Repricing Engine</Text>
      <View style={styles.statusCard}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.statusGradient}
        >
          <View style={styles.statusHeader}>
            <Ionicons name="settings" size={24} color="#007AFF" />
            <Text style={styles.statusTitle}>Engine Status</Text>
            <Switch
              value={isEngineRunning}
              onValueChange={toggleEngine}
              trackColor={{ false: '#767577', true: '#007AFF' }}
              thumbColor={isEngineRunning ? '#fff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, { color: isEngineRunning ? '#34C759' : '#FF3B30' }]}>
              {isEngineRunning ? 'Running' : 'Stopped'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Rules:</Text>
            <Text style={styles.statusValue}>{rules.filter(r => r.enabled).length}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Run:</Text>
            <Text style={styles.statusValue}>
              {analytics?.lastRun ? new Date(analytics.lastRun).toLocaleString() : 'Never'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repricing Analytics</Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(52,199,89,0.1)', 'rgba(52,199,89,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="list" size={24} color="#34C759" />
              <Text style={styles.analyticsValue}>{analytics.repricedListings}</Text>
              <Text style={styles.analyticsLabel}>Repriced</Text>
            </LinearGradient>
          </View>

          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="trending-up" size={24} color="#007AFF" />
              <Text style={styles.analyticsValue}>${analytics.averagePriceChange.toFixed(2)}</Text>
              <Text style={styles.analyticsLabel}>Avg Change</Text>
            </LinearGradient>
          </View>

          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(255,149,0,0.1)', 'rgba(255,149,0,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="cash" size={24} color="#FF9500" />
              <Text style={styles.analyticsValue}>${analytics.totalRevenueImpact.toFixed(2)}</Text>
              <Text style={styles.analyticsLabel}>Revenue Impact</Text>
            </LinearGradient>
          </View>

          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(175,82,222,0.1)', 'rgba(175,82,222,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="settings" size={24} color="#AF52DE" />
              <Text style={styles.analyticsValue}>{analytics.topPerformingRules.length}</Text>
              <Text style={styles.analyticsLabel}>Active Rules</Text>
            </LinearGradient>
          </View>
        </View>
      </View>
    );
  };

  const renderRepricingRules = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Repricing Rules</Text>
        <TouchableOpacity style={styles.addButton} onPress={addNewRule}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Rule</Text>
        </TouchableOpacity>
      </View>
      
      {rules.map((rule) => (
        <View key={rule.id} style={styles.ruleCard}>
          <View style={styles.ruleHeader}>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleName}>{rule.name}</Text>
              <Text style={styles.ruleDescription}>
                {rule.conditions.marketplace.join(', ')} • {rule.actions.type.replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.ruleActions}>
              <Switch
                value={rule.enabled}
                onValueChange={(enabled) => toggleRule(rule.id, enabled)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={rule.enabled ? '#fff' : '#f4f3f4'}
              />
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => deleteRule(rule.id)}
              >
                <Ionicons name="trash" size={16} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.ruleDetails}>
            <View style={styles.ruleDetail}>
              <Text style={styles.ruleDetailLabel}>Marketplaces:</Text>
              <Text style={styles.ruleDetailValue}>{rule.conditions.marketplace.join(', ')}</Text>
            </View>
            <View style={styles.ruleDetail}>
              <Text style={styles.ruleDetailLabel}>Categories:</Text>
              <Text style={styles.ruleDetailValue}>{rule.conditions.category.join(', ')}</Text>
            </View>
            <View style={styles.ruleDetail}>
              <Text style={styles.ruleDetailLabel}>Action:</Text>
              <Text style={styles.ruleDetailValue}>
                {rule.actions.type.replace('_', ' ')} {rule.actions.value > 0 ? `(${rule.actions.value}${rule.actions.type.includes('percentage') ? '%' : '$'})` : ''}
              </Text>
            </View>
            <View style={styles.ruleDetail}>
              <Text style={styles.ruleDetailLabel}>Schedule:</Text>
              <Text style={styles.ruleDetailValue}>
                {rule.schedule.frequency} • {rule.schedule.timeRange.start}-{rule.schedule.timeRange.end}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderRecentResults = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Repricing Results</Text>
      {results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="refresh" size={48} color="#666" />
          <Text style={styles.emptyStateText}>No repricing results yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start the repricing engine to see automatic price adjustments
          </Text>
        </View>
      ) : (
        results.map((result) => (
          <View key={result.listingId} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultListingId}>{result.listingId}</Text>
              <View style={[styles.resultStatus, { backgroundColor: result.applied ? '#34C759' : '#FF3B30' }]}>
                <Text style={styles.resultStatusText}>
                  {result.applied ? 'Applied' : 'Failed'}
                </Text>
              </View>
            </View>
            
            <View style={styles.resultDetails}>
              <View style={styles.resultPrice}>
                <Text style={styles.resultPriceLabel}>Price Change:</Text>
                <Text style={styles.resultPriceValue}>
                  ${result.currentPrice.toFixed(2)} → ${result.newPrice.toFixed(2)}
                </Text>
              </View>
              <View style={styles.resultReason}>
                <Text style={styles.resultReasonText}>{result.reason}</Text>
              </View>
              <View style={styles.resultMetrics}>
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricLabel}>Margin:</Text>
                  <Text style={styles.resultMetricValue}>{result.margin.toFixed(1)}%</Text>
                </View>
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricLabel}>Confidence:</Text>
                  <Text style={styles.resultMetricValue}>{(result.confidence * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricLabel}>Competitors:</Text>
                  <Text style={styles.resultMetricValue}>{result.competitors.length}</Text>
                </View>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderMarketplacePerformance = () => {
    if (!analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketplace Performance</Text>
        {analytics.marketplacePerformance.map((marketplace, index) => (
          <View key={index} style={styles.marketplaceCard}>
            <View style={styles.marketplaceHeader}>
              <Text style={styles.marketplaceName}>{marketplace.marketplace}</Text>
              <Text style={[styles.marketplaceImpact, { color: marketplace.revenueImpact >= 0 ? '#34C759' : '#FF3B30' }]}>
                ${marketplace.revenueImpact.toFixed(2)}
              </Text>
            </View>
            <View style={styles.marketplaceStats}>
              <View style={styles.marketplaceStat}>
                <Text style={styles.marketplaceStatValue}>{marketplace.repricedCount}</Text>
                <Text style={styles.marketplaceStatLabel}>Repriced</Text>
              </View>
              <View style={styles.marketplaceStat}>
                <Text style={styles.marketplaceStatValue}>${marketplace.averageChange.toFixed(2)}</Text>
                <Text style={styles.marketplaceStatLabel}>Avg Change</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dynamic Repricing</Text>
        <Text style={styles.headerSubtitle}>
          Real-time competitor monitoring and automatic price adjustments
        </Text>
      </View>

      {/* Engine Status */}
      {renderEngineStatus()}

      {/* Analytics */}
      {renderAnalytics()}

      {/* Repricing Rules */}
      {renderRepricingRules()}

      {/* Recent Results */}
      {renderRecentResults()}

      {/* Marketplace Performance */}
      {renderMarketplacePerformance()}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  statusGradient: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    color: '#666',
    fontSize: 14,
  },
  statusValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  analyticsGradient: {
    padding: 20,
    alignItems: 'center',
  },
  analyticsValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  analyticsLabel: {
    color: '#666',
    fontSize: 12,
  },
  ruleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  ruleDescription: {
    color: '#666',
    fontSize: 14,
  },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 15,
    padding: 8,
  },
  ruleDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  ruleDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ruleDetailLabel: {
    color: '#666',
    fontSize: 14,
  },
  ruleDetailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultListingId: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  resultStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  resultPrice: {
    marginBottom: 10,
  },
  resultPriceLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5,
  },
  resultPriceValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultReason: {
    marginBottom: 15,
  },
  resultReasonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  resultMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultMetric: {
    alignItems: 'center',
  },
  resultMetricLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  resultMetricValue: {
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
  marketplaceImpact: {
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
});

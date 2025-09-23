// Repricing Engine Screen - Dynamic repricing management

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { repricingEngine, RepricingRule, RepricingResult } from '../services/repricingEngine';

export default function RepricingEngineScreen() {
  const [repricingRules, setRepricingRules] = useState<RepricingRule[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadRepricingData();
  }, []);

  const loadRepricingData = async () => {
    try {
      const rules = repricingEngine.getRepricingRules();
      setRepricingRules(rules);
    } catch (error) {
      console.error('Failed to load repricing data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRepricingData();
    setLastUpdate(new Date());
    setIsRefreshing(false);
  };

  const toggleRule = async (ruleId: string) => {
    try {
      const rule = repricingRules.find(r => r.id === ruleId);
      if (rule) {
        rule.enabled = !rule.enabled;
        await repricingEngine.updateRepricingRule(rule);
        setRepricingRules([...repricingRules]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update repricing rule');
    }
  };

  const runRepricing = async () => {
    try {
      Alert.alert(
        'Run Repricing',
        'This will analyze all active listings and suggest price adjustments. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Run', onPress: async () => {
            // Mock listing IDs - in real app, get from database
            const listingIds = ['1', '2', '3', '4', '5'];
            const results = await repricingEngine.applyRepricingToListings(listingIds);
            
            Alert.alert(
              'Repricing Complete',
              `Analyzed ${results.length} listings. ${results.filter(r => r.adjustment !== 0).length} price adjustments suggested.`,
              [{ text: 'OK' }]
            );
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to run repricing analysis');
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'aggressive': return '#FF3B30';
      case 'moderate': return '#FF9500';
      case 'conservative': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'aggressive': return 'trending-down';
      case 'moderate': return 'trending-up';
      case 'conservative': return 'shield-checkmark';
      default: return 'help-circle';
    }
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dynamic Repricing Engine</Text>
          <Text style={styles.headerSubtitle}>
            Real-time competitor monitoring with AI-powered price optimization
          </Text>
        </View>
        <TouchableOpacity style={styles.monitoringButton}>
          <Ionicons 
            name={isMonitoring ? 'pause-circle' : 'play-circle'} 
            size={24} 
            color={isMonitoring ? '#FF9500' : '#34C759'} 
          />
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.statusGradient}
        >
          <View style={styles.statusHeader}>
            <Ionicons name="analytics" size={24} color="#007AFF" />
            <Text style={styles.statusTitle}>System Status</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Monitoring:</Text>
            <Text style={[styles.statusValue, { color: isMonitoring ? '#34C759' : '#FF3B30' }]}>
              {isMonitoring ? 'Active' : 'Paused'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Update:</Text>
            <Text style={styles.statusValue}>{lastUpdate.toLocaleTimeString()}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Rules:</Text>
            <Text style={styles.statusValue}>{repricingRules.filter(r => r.enabled).length}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={runRepricing}>
            <View style={styles.actionIcon}>
              <Ionicons name="refresh" size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionTitle}>Run Repricing</Text>
            <Text style={styles.actionSubtitle}>Analyze all listings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="settings" size={24} color="#FF9500" />
            </View>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionSubtitle}>Configure rules</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="analytics" size={24} color="#34C759" />
            </View>
            <Text style={styles.actionTitle}>Analytics</Text>
            <Text style={styles.actionSubtitle}>View performance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="add-circle" size={24} color="#AF52DE" />
            </View>
            <Text style={styles.actionTitle}>New Rule</Text>
            <Text style={styles.actionSubtitle}>Create custom rule</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Repricing Rules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repricing Rules</Text>
        {repricingRules.map((rule) => (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Text style={styles.ruleCategory}>{rule.category}</Text>
              </View>
              <Switch
                value={rule.enabled}
                onValueChange={() => toggleRule(rule.id)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={rule.enabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.ruleDetails}>
              <View style={styles.ruleDetail}>
                <Text style={styles.ruleDetailLabel}>Strategy:</Text>
                <View style={styles.strategyBadge}>
                  <Ionicons 
                    name={getStrategyIcon(rule.priceAdjustment)} 
                    size={16} 
                    color={getStrategyColor(rule.priceAdjustment)} 
                  />
                  <Text style={[styles.strategyText, { color: getStrategyColor(rule.priceAdjustment) }]}>
                    {rule.priceAdjustment.charAt(0).toUpperCase() + rule.priceAdjustment.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.ruleDetail}>
                <Text style={styles.ruleDetailLabel}>Margin Range:</Text>
                <Text style={styles.ruleDetailValue}>
                  {rule.minMargin}% - {rule.maxMargin}%
                </Text>
              </View>

              <View style={styles.ruleDetail}>
                <Text style={styles.ruleDetailLabel}>Competitor Threshold:</Text>
                <Text style={styles.ruleDetailValue}>{rule.competitorThreshold} listings</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* AI Features */}
      <View style={styles.aiSection}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.aiCard}
        >
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={24} color="#007AFF" />
            <Text style={styles.aiTitle}>AI-Powered Repricing</Text>
          </View>
          <Text style={styles.aiDescription}>
            Our dual AI system (GPT-5 + Claude) continuously monitors competitor prices and 
            optimizes your listings for maximum profitability while protecting your margins.
          </Text>
          <View style={styles.aiFeatures}>
            <View style={styles.aiFeature}>
              <Ionicons name="eye" size={16} color="#007AFF" />
              <Text style={styles.aiFeatureText}>Real-time monitoring</Text>
            </View>
            <View style={styles.aiFeature}>
              <Ionicons name="shield-checkmark" size={16} color="#007AFF" />
              <Text style={styles.aiFeatureText}>Margin protection</Text>
            </View>
            <View style={styles.aiFeature}>
              <Ionicons name="trending-up" size={16} color="#007AFF" />
              <Text style={styles.aiFeatureText}>Profit optimization</Text>
            </View>
          </View>
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
  headerContent: {
    flex: 1,
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
  monitoringButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  statusGradient: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
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
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  actionSubtitle: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
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
  ruleCategory: {
    color: '#666',
    fontSize: 14,
  },
  ruleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ruleDetail: {
    flex: 1,
  },
  ruleDetailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  ruleDetailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  strategyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strategyText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  aiSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  aiCard: {
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  aiTitle: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  aiDescription: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  aiFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  aiFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  aiFeatureText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

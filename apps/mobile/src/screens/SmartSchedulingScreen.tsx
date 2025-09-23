// Smart Scheduling AI Screen - ML-driven posting optimization

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { smartSchedulingAI, SchedulingRule, OptimalTimeSlot } from '../services/smartSchedulingAI';

export default function SmartSchedulingScreen() {
  const [schedulingRules, setSchedulingRules] = useState<SchedulingRule[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [lastAnalysis, setLastAnalysis] = useState<Date>(new Date());

  useEffect(() => {
    loadSchedulingData();
  }, []);

  const loadSchedulingData = async () => {
    try {
      const rules = smartSchedulingAI.getSchedulingRules();
      setSchedulingRules(rules);
    } catch (error) {
      console.error('Failed to load scheduling data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSchedulingData();
    setLastAnalysis(new Date());
    setIsRefreshing(false);
  };

  const getOptimalTimes = async () => {
    try {
      const recommendation = await smartSchedulingAI.getOptimalPostingTimes(
        'sample_listing',
        'eBay',
        'Electronics'
      );
      
      Alert.alert(
        'Optimal Posting Times',
        `Recommended times for eBay Electronics:\n\n${recommendation.recommendedTimes.map(time => 
          `${getDayName(time.dayOfWeek)} ${time.hour}:00 - ${time.reasoning} (${(time.confidence * 100).toFixed(0)}% confidence)`
        ).join('\n\n')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to get optimal posting times');
    }
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'alert-circle';
      case 'medium': return 'time';
      case 'low': return 'checkmark-circle';
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
          <Text style={styles.headerTitle}>Smart Scheduling AI</Text>
          <Text style={styles.headerSubtitle}>
            ML-driven posting optimization for maximum visibility
          </Text>
        </View>
        <TouchableOpacity style={styles.analysisButton}>
          <Ionicons 
            name={isAnalyzing ? 'pause-circle' : 'play-circle'} 
            size={24} 
            color={isAnalyzing ? '#FF9500' : '#34C759'} 
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
            <Text style={styles.statusTitle}>AI Analysis Status</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Analysis:</Text>
            <Text style={[styles.statusValue, { color: isAnalyzing ? '#34C759' : '#FF3B30' }]}>
              {isAnalyzing ? 'Active' : 'Paused'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Analysis:</Text>
            <Text style={styles.statusValue}>{lastAnalysis.toLocaleTimeString()}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Rules:</Text>
            <Text style={styles.statusValue}>{schedulingRules.filter(r => r.enabled).length}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={getOptimalTimes}>
            <View style={styles.actionIcon}>
              <Ionicons name="time" size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionTitle}>Get Optimal Times</Text>
            <Text style={styles.actionSubtitle}>AI recommendations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="calendar" size={24} color="#FF9500" />
            </View>
            <Text style={styles.actionTitle}>Schedule Posting</Text>
            <Text style={styles.actionSubtitle}>Plan ahead</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="analytics" size={24} color="#34C759" />
            </View>
            <Text style={styles.actionTitle}>Performance</Text>
            <Text style={styles.actionSubtitle}>View analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="settings" size={24} color="#AF52DE" />
            </View>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionSubtitle}>Configure rules</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scheduling Rules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduling Rules</Text>
        {schedulingRules.map((rule) => (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Text style={styles.ruleMarketplace}>{rule.marketplace} • {rule.category}</Text>
              </View>
              <View style={styles.priorityBadge}>
                <Ionicons 
                  name={getPriorityIcon(rule.priority)} 
                  size={16} 
                  color={getPriorityColor(rule.priority)} 
                />
                <Text style={[styles.priorityText, { color: getPriorityColor(rule.priority) }]}>
                  {rule.priority.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.ruleStatus}>
              <View style={styles.statusBadge}>
                <Ionicons 
                  name={rule.enabled ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color={rule.enabled ? '#34C759' : '#FF3B30'} 
                />
                <Text style={[styles.statusText, { color: rule.enabled ? '#34C759' : '#FF3B30' }]}>
                  {rule.enabled ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            {rule.customTimes && rule.customTimes.length > 0 && (
              <View style={styles.optimalTimes}>
                <Text style={styles.optimalTimesTitle}>Optimal Times:</Text>
                {rule.customTimes.slice(0, 3).map((time, index) => (
                  <View key={index} style={styles.timeSlot}>
                    <Text style={styles.timeText}>
                      {getDayName(time.dayOfWeek)} {time.hour}:00
                    </Text>
                    <Text style={styles.confidenceText}>
                      {(time.confidence * 100).toFixed(0)}% confidence
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
            <Text style={styles.aiTitle}>AI-Powered Scheduling</Text>
          </View>
          <Text style={styles.aiDescription}>
            Our machine learning algorithms analyze historical sales data, buyer behavior patterns, 
            and seasonal trends to determine the optimal posting times for maximum visibility and sales.
          </Text>
          <View style={styles.aiFeatures}>
            <View style={styles.aiFeature}>
              <Ionicons name="trending-up" size={16} color="#007AFF" />
              <Text style={styles.aiFeatureText}>Sales optimization</Text>
            </View>
            <View style={styles.aiFeature}>
              <Ionicons name="people" size={16} color="#007AFF" />
              <Text style={styles.aiFeatureText}>Buyer behavior</Text>
            </View>
            <View style={styles.aiFeature}>
              <Ionicons name="calendar" size={16} color="#007AFF" />
              <Text style={styles.aiFeatureText}>Seasonal trends</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.insightsCard}>
          <View style={styles.insightItem}>
            <Ionicons name="trending-up" size={20} color="#34C759" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Peak Performance</Text>
              <Text style={styles.insightDescription}>
                Wednesday 2:00 PM shows 25% higher conversion rates
              </Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <Ionicons name="time" size={20} color="#FF9500" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Optimal Window</Text>
              <Text style={styles.insightDescription}>
                Electronics perform best between 10 AM - 6 PM
              </Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <Ionicons name="calendar" size={20} color="#007AFF" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Seasonal Trend</Text>
              <Text style={styles.insightDescription}>
                Weekend postings show 15% higher engagement
              </Text>
            </View>
          </View>
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
  analysisButton: {
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
  ruleMarketplace: {
    color: '#666',
    fontSize: 14,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  ruleStatus: {
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  optimalTimes: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  optimalTimesTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confidenceText: {
    color: '#666',
    fontSize: 12,
  },
  aiSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  insightsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  insightContent: {
    flex: 1,
    marginLeft: 15,
  },
  insightTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  insightDescription: {
    color: '#666',
    fontSize: 12,
  },
});

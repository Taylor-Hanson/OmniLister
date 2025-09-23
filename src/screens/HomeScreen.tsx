// Home Screen with Quick Actions

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';
import { marketplaceService } from '../services/marketplaceService';

export default function HomeScreen({ navigation }: any) {
  const [connectedMarketplaces, setConnectedMarketplaces] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load connected marketplaces
      const marketplaces = marketplaceService.getPriorityMarketplaces();
      setConnectedMarketplaces(marketplaces.length);

      // Mock data - in real app, load from API
      setActiveListings(12);
      setRecentActivity([
        { type: 'sale', message: 'iPhone 13 sold for $650', time: '2 hours ago' },
        { type: 'offer', message: 'New offer: $45 for AirPods', time: '4 hours ago' },
        { type: 'cross_posting', message: 'Posted to 3 marketplaces', time: '1 day ago' },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const quickActions = [
    {
      id: 'list_product',
      title: 'List Product',
      subtitle: 'AI Recognition',
      icon: 'add-circle',
      color: '#007AFF',
      onPress: () => navigation.navigate('ProductListing'),
    },
    {
      id: 'inventory',
      title: 'Inventory',
      subtitle: 'Manage Products',
      icon: 'cube',
      color: '#34C759',
      onPress: () => navigation.navigate('Inventory'),
    },
    {
      id: 'analytics',
      title: 'Analytics',
      subtitle: 'View Metrics',
      icon: 'analytics',
      color: '#FF9500',
      onPress: () => navigation.navigate('Analytics'),
    },
    {
      id: 'pricing',
      title: 'Pricing Rules',
      subtitle: 'Set Marketplace Pricing',
      icon: 'library',
      color: '#FF3B30',
      onPress: () => navigation.navigate('PricingRules'),
    },
  ];

  const marketplaceStats = [
    { name: 'eBay', listings: 5, sales: 2 },
    { name: 'Amazon', listings: 3, sales: 1 },
    { name: 'Poshmark', listings: 4, sales: 3 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.subtitle}>Ready to sell more?</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="storefront" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{connectedMarketplaces}</Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="list" size={24} color="#34C759" />
          <Text style={styles.statNumber}>{activeListings}</Text>
          <Text style={styles.statLabel}>Active Listings</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#FF9500" />
          <Text style={styles.statNumber}>$2,450</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionCard, { backgroundColor: action.color }]}
              onPress={action.onPress}
            >
              <Ionicons name={action.icon as any} size={32} color="white" />
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Marketplace Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketplace Performance</Text>
        <View style={styles.marketplaceContainer}>
          {marketplaceStats.map((marketplace, index) => (
            <View key={index} style={styles.marketplaceCard}>
              <Text style={styles.marketplaceName}>{marketplace.name}</Text>
              <View style={styles.marketplaceStats}>
                <View style={styles.marketplaceStat}>
                  <Text style={styles.marketplaceStatNumber}>{marketplace.listings}</Text>
                  <Text style={styles.marketplaceStatLabel}>Listings</Text>
                </View>
                <View style={styles.marketplaceStat}>
                  <Text style={styles.marketplaceStatNumber}>{marketplace.sales}</Text>
                  <Text style={styles.marketplaceStatLabel}>Sales</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityContainer}>
          {recentActivity.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={[
                styles.activityIcon,
                { backgroundColor: activity.type === 'sale' ? '#34C759' : 
                                 activity.type === 'offer' ? '#FF9500' : '#007AFF' }
              ]}>
                <Ionicons 
                  name={activity.type === 'sale' ? 'checkmark' : 
                        activity.type === 'offer' ? 'pricetag' : 'share'} 
                  size={16} 
                  color="white" 
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityMessage}>{activity.message}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* AI Features Highlight */}
      <View style={styles.aiSection}>
        <View style={styles.aiCard}>
          <Ionicons name="sparkles" size={32} color="#007AFF" />
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>Dual AI Technology</Text>
            <Text style={styles.aiDescription}>
              First platform to use GPT-5 + Claude simultaneously for maximum accuracy
            </Text>
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
    paddingBottom: 30,
  },
  greeting: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    marginTop: 5,
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 15,
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  quickActionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  quickActionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 5,
  },
  marketplaceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketplaceCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 15,
  },
  marketplaceName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  marketplaceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketplaceStat: {
    alignItems: 'center',
  },
  marketplaceStatNumber: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  marketplaceStatLabel: {
    color: '#666',
    fontSize: 10,
  },
  activityContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    color: 'white',
    fontSize: 14,
  },
  activityTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  aiSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  aiCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,122,255,0.1)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  aiContent: {
    flex: 1,
    marginLeft: 15,
  },
  aiTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  aiDescription: {
    color: 'white',
    fontSize: 14,
  },
});

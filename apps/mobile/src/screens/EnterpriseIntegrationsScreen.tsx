// Enterprise Integrations Screen - Amazon & Walmart integration management

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { amazonIntegration, AmazonAnalytics } from '../services/amazonIntegration';
import { walmartIntegration, WalmartAnalytics } from '../services/walmartIntegration';

export default function EnterpriseIntegrationsScreen() {
  const [isAmazonConnected, setIsAmazonConnected] = useState(false);
  const [isWalmartConnected, setIsWalmartConnected] = useState(false);
  const [amazonAnalytics, setAmazonAnalytics] = useState<AmazonAnalytics | null>(null);
  const [walmartAnalytics, setWalmartAnalytics] = useState<WalmartAnalytics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      setIsAmazonConnected(amazonIntegration.isAmazonConnected());
      setIsWalmartConnected(walmartIntegration.isWalmartConnected());
      
      if (isAmazonConnected) {
        const analytics = await amazonIntegration.getAnalytics();
        setAmazonAnalytics(analytics);
      }
      
      if (isWalmartConnected) {
        const analytics = await walmartIntegration.getAnalytics();
        setWalmartAnalytics(analytics);
      }
    } catch (error) {
      console.error('Failed to load integration status:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadIntegrationStatus();
    setIsRefreshing(false);
  };

  const connectToAmazon = async () => {
    try {
      Alert.alert(
        'Connect to Amazon',
        'This will open Amazon Seller Central to authorize OmniLister access. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: async () => {
            const success = await amazonIntegration.connectToAmazon();
            if (success) {
              setIsAmazonConnected(true);
              Alert.alert('Success', 'Successfully connected to Amazon Seller Central!');
            } else {
              Alert.alert('Error', 'Failed to connect to Amazon. Please try again.');
            }
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Amazon');
    }
  };

  const connectToWalmart = async () => {
    try {
      Alert.alert(
        'Connect to Walmart',
        'This will open Walmart Marketplace to authorize OmniLister access. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: async () => {
            const success = await walmartIntegration.connectToWalmart();
            if (success) {
              setIsWalmartConnected(true);
              Alert.alert('Success', 'Successfully connected to Walmart Marketplace!');
            } else {
              Alert.alert('Error', 'Failed to connect to Walmart. Please try again.');
            }
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Walmart');
    }
  };

  const syncInventory = async (marketplace: 'amazon' | 'walmart') => {
    try {
      Alert.alert(
        'Sync Inventory',
        `This will sync your inventory with ${marketplace === 'amazon' ? 'Amazon' : 'Walmart'}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sync', onPress: async () => {
            const success = marketplace === 'amazon' 
              ? await amazonIntegration.syncInventory()
              : await walmartIntegration.syncInventory();
            
            if (success) {
              Alert.alert('Success', `Inventory synced with ${marketplace === 'amazon' ? 'Amazon' : 'Walmart'}!`);
            } else {
              Alert.alert('Error', `Failed to sync inventory with ${marketplace === 'amazon' ? 'Amazon' : 'Walmart'}`);
            }
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to sync inventory with ${marketplace === 'amazon' ? 'Amazon' : 'Walmart'}`);
    }
  };

  const renderMarketplaceCard = (
    name: string,
    isConnected: boolean,
    analytics: any,
    onConnect: () => void,
    onSync: () => void,
    color: string,
    icon: string
  ) => (
    <View style={styles.marketplaceCard}>
      <View style={styles.marketplaceHeader}>
        <View style={styles.marketplaceInfo}>
          <View style={[styles.marketplaceIcon, { backgroundColor: color }]}>
            <Ionicons name={icon as any} size={24} color="white" />
          </View>
          <View style={styles.marketplaceDetails}>
            <Text style={styles.marketplaceName}>{name}</Text>
            <Text style={styles.marketplaceStatus}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
        </View>
        <View style={styles.marketplaceActions}>
          {isConnected ? (
            <TouchableOpacity style={styles.syncButton} onPress={onSync}>
              <Ionicons name="refresh" size={16} color="#007AFF" />
              <Text style={styles.syncButtonText}>Sync</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.connectButton} onPress={onConnect}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isConnected && analytics && (
        <View style={styles.analyticsContainer}>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{analytics.totalListings}</Text>
              <Text style={styles.analyticsLabel}>Listings</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{analytics.totalSales}</Text>
              <Text style={styles.analyticsLabel}>Sales</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>${analytics.totalRevenue.toFixed(0)}</Text>
              <Text style={styles.analyticsLabel}>Revenue</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{analytics.conversionRate.toFixed(1)}%</Text>
              <Text style={styles.analyticsLabel}>Conversion</Text>
            </View>
          </View>
        </View>
      )}
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
        <Text style={styles.headerTitle}>Enterprise Integrations</Text>
        <Text style={styles.headerSubtitle}>
          Connect to major marketplaces for enterprise-level selling
        </Text>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.statusGradient}
        >
          <View style={styles.statusHeader}>
            <Ionicons name="business" size={24} color="#007AFF" />
            <Text style={styles.statusTitle}>Enterprise Status</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Amazon:</Text>
            <Text style={[styles.statusValue, { color: isAmazonConnected ? '#34C759' : '#FF3B30' }]}>
              {isAmazonConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Walmart:</Text>
            <Text style={[styles.statusValue, { color: isWalmartConnected ? '#34C759' : '#FF3B30' }]}>
              {isWalmartConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Enterprise Features:</Text>
            <Text style={[styles.statusValue, { color: (isAmazonConnected || isWalmartConnected) ? '#34C759' : '#FF3B30' }]}>
              {(isAmazonConnected || isWalmartConnected) ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Marketplace Integrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketplace Integrations</Text>
        
        {renderMarketplaceCard(
          'Amazon Seller Central',
          isAmazonConnected,
          amazonAnalytics,
          connectToAmazon,
          () => syncInventory('amazon'),
          '#FF9900',
          'logo-amazon'
        )}

        {renderMarketplaceCard(
          'Walmart Marketplace',
          isWalmartConnected,
          walmartAnalytics,
          connectToWalmart,
          () => syncInventory('walmart'),
          '#004C91',
          'storefront'
        )}
      </View>

      {/* Enterprise Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enterprise Features</Text>
        
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <Ionicons name="analytics" size={24} color="#007AFF" />
            <Text style={styles.featureTitle}>Advanced Analytics</Text>
            <Text style={styles.featureDescription}>
              Comprehensive reporting across all marketplaces
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="sync" size={24} color="#34C759" />
            <Text style={styles.featureTitle}>Real-time Sync</Text>
            <Text style={styles.featureDescription}>
              Automatic inventory and order synchronization
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="trending-up" size={24} color="#FF9500" />
            <Text style={styles.featureTitle}>Dynamic Repricing</Text>
            <Text style={styles.featureDescription}>
              AI-powered price optimization across platforms
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="people" size={24} color="#AF52DE" />
            <Text style={styles.featureTitle}>Team Management</Text>
            <Text style={styles.featureDescription}>
              Multi-user access with role-based permissions
            </Text>
          </View>
        </View>
      </View>

      {/* Competitive Advantage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Competitive Advantage</Text>
        <View style={styles.advantageCard}>
          <LinearGradient
            colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
            style={styles.advantageGradient}
          >
            <View style={styles.advantageHeader}>
              <Ionicons name="trophy" size={24} color="#007AFF" />
              <Text style={styles.advantageTitle}>Market Leader</Text>
            </View>
            <Text style={styles.advantageDescription}>
              OmniLister is the only affordable cross-listing platform with full Amazon 
              and Walmart integration. While competitors charge $200+/month for enterprise 
              features, we provide them at a fraction of the cost.
            </Text>
            <View style={styles.advantageStats}>
              <View style={styles.advantageStat}>
                <Text style={styles.advantageStatValue}>$200+</Text>
                <Text style={styles.advantageStatLabel}>Competitor Cost</Text>
              </View>
              <View style={styles.advantageStat}>
                <Text style={styles.advantageStatValue}>$47.99</Text>
                <Text style={styles.advantageStatLabel}>Our Cost</Text>
              </View>
              <View style={styles.advantageStat}>
                <Text style={styles.advantageStatValue}>75%</Text>
                <Text style={styles.advantageStatLabel}>Savings</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="download" size={24} color="#007AFF" />
            <Text style={styles.actionTitle}>Import Products</Text>
            <Text style={styles.actionSubtitle}>Bulk import from marketplaces</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="upload" size={24} color="#34C759" />
            <Text style={styles.actionTitle}>Export Listings</Text>
            <Text style={styles.actionSubtitle}>Export to other platforms</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="settings" size={24} color="#FF9500" />
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionSubtitle}>Configure integrations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="help-circle" size={24} color="#AF52DE" />
            <Text style={styles.actionTitle}>Support</Text>
            <Text style={styles.actionSubtitle}>Get help with setup</Text>
          </TouchableOpacity>
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
  marketplaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  marketplaceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  marketplaceDetails: {
    flex: 1,
  },
  marketplaceName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  marketplaceStatus: {
    color: '#666',
    fontSize: 14,
  },
  marketplaceActions: {
    alignItems: 'flex-end',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  syncButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  analyticsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  analyticsLabel: {
    color: '#666',
    fontSize: 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  featureTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  featureDescription: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  advantageCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  advantageGradient: {
    padding: 20,
  },
  advantageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  advantageTitle: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  advantageDescription: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  advantageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  advantageStat: {
    alignItems: 'center',
  },
  advantageStatValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  advantageStatLabel: {
    color: '#666',
    fontSize: 12,
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
    marginBottom: 5,
    textAlign: 'center',
  },
  actionSubtitle: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});

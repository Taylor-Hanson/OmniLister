// Poshmark Automation Screen - Beyond API stubs for real automation

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
import { poshmarkAutomation, PoshmarkAccount, PoshmarkAnalytics, PoshmarkOffer } from '../services/poshmarkAutomation';

export default function PoshmarkAutomationScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<PoshmarkAccount | null>(null);
  const [analytics, setAnalytics] = useState<PoshmarkAnalytics | null>(null);
  const [offers, setOffers] = useState<PoshmarkOffer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSharingAutomated, setIsSharingAutomated] = useState(false);
  const [isOfferAutomated, setIsOfferAutomated] = useState(false);

  useEffect(() => {
    loadPoshmarkData();
  }, []);

  const loadPoshmarkData = async () => {
    try {
      setIsConnected(poshmarkAutomation.isPoshmarkConnected());
      setAccount(poshmarkAutomation.getAccount());
      
      if (isConnected) {
        const analyticsData = await poshmarkAutomation.getAnalytics();
        setAnalytics(analyticsData);
        
        const offersData = await poshmarkAutomation.getOffers();
        setOffers(offersData);
      }
    } catch (error) {
      console.error('Failed to load Poshmark data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPoshmarkData();
    setIsRefreshing(false);
  };

  const connectToPoshmark = async () => {
    try {
      Alert.alert(
        'Connect to Poshmark',
        'Enter your Poshmark credentials to enable automation features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: async () => {
            // Mock connection - in real app, show login form
            const success = await poshmarkAutomation.connectToPoshmark('username', 'password');
            if (success) {
              setIsConnected(true);
              setAccount(poshmarkAutomation.getAccount());
              Alert.alert('Success', 'Successfully connected to Poshmark!');
            } else {
              Alert.alert('Error', 'Failed to connect to Poshmark. Please check your credentials.');
            }
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Poshmark');
    }
  };

  const toggleSharingAutomation = async (enabled: boolean) => {
    try {
      if (enabled) {
        const success = await poshmarkAutomation.startSharingAutomation();
        if (success) {
          setIsSharingAutomated(true);
          Alert.alert('Success', 'Sharing automation started!');
        } else {
          Alert.alert('Error', 'Failed to start sharing automation');
        }
      } else {
        await poshmarkAutomation.stopAutomation();
        setIsSharingAutomated(false);
        Alert.alert('Success', 'Sharing automation stopped');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle sharing automation');
    }
  };

  const toggleOfferAutomation = async (enabled: boolean) => {
    try {
      if (enabled) {
        const success = await poshmarkAutomation.startOfferAutomation();
        if (success) {
          setIsOfferAutomated(true);
          Alert.alert('Success', 'Offer automation started!');
        } else {
          Alert.alert('Error', 'Failed to start offer automation');
        }
      } else {
        await poshmarkAutomation.stopAutomation();
        setIsOfferAutomated(false);
        Alert.alert('Success', 'Offer automation stopped');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle offer automation');
    }
  };

  const respondToOffer = async (offer: PoshmarkOffer, action: 'accept' | 'decline' | 'counter') => {
    try {
      let counterAmount;
      if (action === 'counter') {
        // In real app, show counter amount input
        counterAmount = offer.amount * 1.1; // 10% higher counter
      }
      
      const success = await poshmarkAutomation.respondToOffer(offer.id, action, counterAmount);
      if (success) {
        Alert.alert('Success', `Offer ${action}ed successfully!`);
        // Refresh offers
        const updatedOffers = await poshmarkAutomation.getOffers();
        setOffers(updatedOffers);
      } else {
        Alert.alert('Error', `Failed to ${action} offer`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${action} offer`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'accepted': return '#34C759';
      case 'declined': return '#FF3B30';
      case 'expired': return '#8E8E93';
      default: return '#8E8E93';
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
        <Text style={styles.headerTitle}>Poshmark Automation</Text>
        <Text style={styles.headerSubtitle}>
          Automate sharing, offers, and engagement on Poshmark
        </Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusCard}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.statusGradient}
        >
          <View style={styles.statusHeader}>
            <Ionicons name="logo-instagram" size={24} color="#007AFF" />
            <Text style={styles.statusTitle}>Poshmark Status</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text style={[styles.statusValue, { color: isConnected ? '#34C759' : '#FF3B30' }]}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
          {account && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Username:</Text>
                <Text style={styles.statusValue}>{account.username}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Followers:</Text>
                <Text style={styles.statusValue}>{account.stats.followers.toLocaleString()}</Text>
              </View>
            </>
          )}
        </LinearGradient>
      </View>

      {/* Connection Button */}
      {!isConnected && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.connectButton} onPress={connectToPoshmark}>
            <LinearGradient
              colors={['#007AFF', '#0056CC']}
              style={styles.gradientButton}
            >
              <Ionicons name="link" size={20} color="white" />
              <Text style={styles.connectButtonText}>Connect to Poshmark</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Automation Controls */}
      {isConnected && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation Controls</Text>
          
          <View style={styles.automationCard}>
            <View style={styles.automationHeader}>
              <View style={styles.automationInfo}>
                <Ionicons name="share" size={24} color="#007AFF" />
                <View style={styles.automationDetails}>
                  <Text style={styles.automationTitle}>Sharing Automation</Text>
                  <Text style={styles.automationDescription}>
                    Automatically share your listings to followers and parties
                  </Text>
                </View>
              </View>
              <Switch
                value={isSharingAutomated}
                onValueChange={toggleSharingAutomation}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={isSharingAutomated ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={styles.automationCard}>
            <View style={styles.automationHeader}>
              <View style={styles.automationInfo}>
                <Ionicons name="pricetag" size={24} color="#34C759" />
                <View style={styles.automationDetails}>
                  <Text style={styles.automationTitle}>Offer Automation</Text>
                  <Text style={styles.automationDescription}>
                    AI-powered automatic responses to offers
                  </Text>
                </View>
              </View>
              <Switch
                value={isOfferAutomated}
                onValueChange={toggleOfferAutomation}
                trackColor={{ false: '#767577', true: '#34C759' }}
                thumbColor={isOfferAutomated ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>
      )}

      {/* Analytics */}
      {isConnected && analytics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.totalListings}</Text>
                <Text style={styles.analyticsLabel}>Total Listings</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.totalSales}</Text>
                <Text style={styles.analyticsLabel}>Total Sales</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>${analytics.totalRevenue.toFixed(0)}</Text>
                <Text style={styles.analyticsLabel}>Total Revenue</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.conversionRate.toFixed(1)}%</Text>
                <Text style={styles.analyticsLabel}>Conversion Rate</Text>
              </View>
            </View>
            
            <View style={styles.sharingStats}>
              <Text style={styles.sharingStatsTitle}>Sharing Statistics</Text>
              <View style={styles.sharingStatsRow}>
                <View style={styles.sharingStat}>
                  <Text style={styles.sharingStatValue}>{analytics.sharingStats.totalShares}</Text>
                  <Text style={styles.sharingStatLabel}>Total Shares</Text>
                </View>
                <View style={styles.sharingStat}>
                  <Text style={styles.sharingStatValue}>{analytics.sharingStats.sharesToday}</Text>
                  <Text style={styles.sharingStatLabel}>Today</Text>
                </View>
                <View style={styles.sharingStat}>
                  <Text style={styles.sharingStatValue}>{analytics.sharingStats.averageSharesPerListing.toFixed(1)}</Text>
                  <Text style={styles.sharingStatLabel}>Avg per Listing</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Pending Offers */}
      {isConnected && offers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Offers</Text>
          {offers.filter(offer => offer.status === 'pending').map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.offerInfo}>
                  <Text style={styles.offerBuyer}>@{offer.buyerUsername}</Text>
                  <Text style={styles.offerAmount}>${offer.amount.toFixed(2)}</Text>
                </View>
                <View style={[styles.offerStatus, { backgroundColor: getStatusColor(offer.status) }]}>
                  <Text style={styles.offerStatusText}>{offer.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.offerActions}>
                <TouchableOpacity 
                  style={[styles.offerAction, styles.acceptAction]} 
                  onPress={() => respondToOffer(offer, 'accept')}
                >
                  <Ionicons name="checkmark" size={16} color="white" />
                  <Text style={styles.offerActionText}>Accept</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.offerAction, styles.counterAction]} 
                  onPress={() => respondToOffer(offer, 'counter')}
                >
                  <Ionicons name="arrow-up" size={16} color="white" />
                  <Text style={styles.offerActionText}>Counter</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.offerAction, styles.declineAction]} 
                  onPress={() => respondToOffer(offer, 'decline')}
                >
                  <Ionicons name="close" size={16} color="white" />
                  <Text style={styles.offerActionText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* AI Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI-Powered Features</Text>
        <View style={styles.aiCard}>
          <LinearGradient
            colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
            style={styles.aiGradient}
          >
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={24} color="#007AFF" />
              <Text style={styles.aiTitle}>Smart Automation</Text>
            </View>
            <Text style={styles.aiDescription}>
              Our AI analyzes offer patterns, listing performance, and market trends to 
              automatically respond to offers with optimal counter-offers or acceptances.
            </Text>
            <View style={styles.aiFeatures}>
              <View style={styles.aiFeature}>
                <Ionicons name="brain" size={16} color="#007AFF" />
                <Text style={styles.aiFeatureText}>AI Offer Analysis</Text>
              </View>
              <View style={styles.aiFeature}>
                <Ionicons name="trending-up" size={16} color="#007AFF" />
                <Text style={styles.aiFeatureText}>Market Trends</Text>
              </View>
              <View style={styles.aiFeature}>
                <Ionicons name="time" size={16} color="#007AFF" />
                <Text style={styles.aiFeatureText}>Optimal Timing</Text>
              </View>
            </View>
          </LinearGradient>
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
  connectButton: {
    marginBottom: 20,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 15,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  automationCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  automationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  automationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  automationDetails: {
    marginLeft: 15,
    flex: 1,
  },
  automationTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  automationDescription: {
    color: '#666',
    fontSize: 14,
  },
  analyticsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  analyticsLabel: {
    color: '#666',
    fontSize: 12,
  },
  sharingStats: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  sharingStatsTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sharingStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sharingStat: {
    alignItems: 'center',
  },
  sharingStatValue: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sharingStatLabel: {
    color: '#666',
    fontSize: 12,
  },
  offerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  offerInfo: {
    flex: 1,
  },
  offerBuyer: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  offerAmount: {
    color: '#34C759',
    fontSize: 18,
    fontWeight: 'bold',
  },
  offerStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  offerStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  acceptAction: {
    backgroundColor: '#34C759',
  },
  counterAction: {
    backgroundColor: '#007AFF',
  },
  declineAction: {
    backgroundColor: '#FF3B30',
  },
  offerActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  aiCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  aiGradient: {
    padding: 20,
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

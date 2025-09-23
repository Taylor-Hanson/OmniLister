// Marketplace Connections Screen - Connect to various marketplaces

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMarketplaceConnections, useConnectMarketplace } from '../hooks/useApi';
import { marketplaceService } from '../services/marketplaceService';
import { Marketplace, MarketplaceConnection } from '../types';

export default function MarketplaceConnectionsScreen({ navigation }: any) {
  const { data: connections, isLoading, error, refetch } = useMarketplaceConnections();
  const { connectMarketplace, isLoading: isConnecting } = useConnectMarketplace();
  const [refreshing, setRefreshing] = useState(false);

  const availableMarketplaces = marketplaceService.getPriorityMarketplaces();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleConnect = async (marketplace: Marketplace) => {
    if (marketplace.enterpriseOnly) {
      Alert.alert(
        'Enterprise Feature',
        `${marketplace.name} integration is available for Enterprise users only. Please upgrade your plan.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (marketplace.authType === 'oauth') {
      // For OAuth marketplaces, show connection flow
      Alert.alert(
        'Connect to ' + marketplace.name,
        'This will open the marketplace authorization page in your browser.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: () => initiateOAuthConnection(marketplace) },
        ]
      );
    } else {
      // For API key or username/password marketplaces, show credential form
      showCredentialForm(marketplace);
    }
  };

  const initiateOAuthConnection = async (marketplace: Marketplace) => {
    try {
      // In a real implementation, this would open the OAuth flow
      Alert.alert('OAuth Flow', `Initiating ${marketplace.name} OAuth connection...`);
      
      // Mock connection for demo
      const mockCredentials = { token: 'mock-oauth-token' };
      const result = await connectMarketplace(marketplace.id, mockCredentials);
      
      if (result) {
        Alert.alert('Success', `Successfully connected to ${marketplace.name}!`);
        refetch();
      }
    } catch (error) {
      Alert.alert('Connection Failed', 'Failed to connect to marketplace. Please try again.');
    }
  };

  const showCredentialForm = (marketplace: Marketplace) => {
    // In a real implementation, this would show a form for credentials
    Alert.prompt(
      'Enter API Key',
      `Please enter your ${marketplace.name} API key:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async (apiKey) => {
            if (apiKey) {
              const credentials = { apiKey };
              const result = await connectMarketplace(marketplace.id, credentials);
              
              if (result) {
                Alert.alert('Success', `Successfully connected to ${marketplace.name}!`);
                refetch();
              }
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleDisconnect = (marketplaceId: string) => {
    Alert.alert(
      'Disconnect Marketplace',
      'Are you sure you want to disconnect this marketplace?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => {
          // Implement disconnect logic
          Alert.alert('Disconnected', 'Marketplace has been disconnected.');
          refetch();
        }},
      ]
    );
  };

  const isConnected = (marketplaceId: string): boolean => {
    return connections?.some(conn => 
      conn.marketplace === marketplaceId && conn.isConnected
    ) || false;
  };

  const getConnectionStatus = (marketplaceId: string): MarketplaceConnection | null => {
    return connections?.find(conn => conn.marketplace === marketplaceId) || null;
  };

  const renderMarketplace = ({ item }: { item: Marketplace }) => {
    const connected = isConnected(item.id);
    const connection = getConnectionStatus(item.id);

    return (
      <TouchableOpacity
        style={[styles.marketplaceCard, connected && styles.connectedCard]}
        onPress={() => connected ? handleDisconnect(item.id) : handleConnect(item)}
        disabled={isConnecting}
      >
        <View style={styles.marketplaceHeader}>
          <View style={styles.marketplaceInfo}>
            <View style={[styles.marketplaceIcon, { backgroundColor: item.color }]}>
              <Ionicons name="storefront" size={24} color="white" />
            </View>
            <View style={styles.marketplaceDetails}>
              <Text style={styles.marketplaceName}>{item.name}</Text>
              <Text style={styles.marketplaceDescription}>{item.description}</Text>
              {item.priority && (
                <View style={styles.priorityBadge}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.priorityText}>Priority</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.marketplaceStatus}>
            {connected ? (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.connectedText}>Connected</Text>
                {connection?.lastSyncAt && (
                  <Text style={styles.lastSyncText}>
                    Last sync: {new Date(connection.lastSyncAt).toLocaleDateString()}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.connectText}>Connect</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {item.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featureTag}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {item.enterpriseOnly && (
          <View style={styles.enterpriseBadge}>
            <Ionicons name="diamond" size={16} color="#FFD700" />
            <Text style={styles.enterpriseText}>Enterprise Only</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="storefront-outline" size={64} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No Marketplaces Available</Text>
      <Text style={styles.emptySubtitle}>
        Marketplace integrations are being loaded...
      </Text>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorState}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Failed to Load Marketplaces</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace Connections</Text>
        <Text style={styles.headerSubtitle}>
          Connect to {availableMarketplaces.length} marketplaces
        </Text>
      </View>

      <FlatList
        data={availableMarketplaces}
        renderItem={renderMarketplace}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  marketplaceCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  connectedCard: {
    borderColor: '#34C759',
    backgroundColor: 'rgba(52,199,89,0.1)',
  },
  marketplaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  marketplaceInfo: {
    flexDirection: 'row',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  marketplaceDescription: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priorityText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  marketplaceStatus: {
    alignItems: 'center',
  },
  connectedText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  connectText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  lastSyncText: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  featureTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 5,
  },
  featureText: {
    color: 'white',
    fontSize: 12,
  },
  enterpriseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  enterpriseText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  errorSubtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

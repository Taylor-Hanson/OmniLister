// Listings Screen - Display and manage user listings

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListings, useCreateListing } from '../hooks/useApi';
import { Listing } from '../types';

export default function ListingsScreen({ navigation }: any) {
  const { data: listings, isLoading, error, refetch } = useListings();
  const { createListing, isLoading: isCreating } = useCreateListing();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreateListing = () => {
    navigation.navigate('CreateListing');
  };

  const handleListingPress = (listing: Listing) => {
    navigation.navigate('ListingDetails', { listingId: listing.id });
  };

  const handleCrossPost = (listing: Listing) => {
    navigation.navigate('CrossPosting', { listingId: listing.id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'draft': return '#FF9500';
      case 'sold': return '#007AFF';
      case 'paused': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'draft': return 'create-outline';
      case 'sold': return 'trophy';
      case 'paused': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  const renderListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => handleListingPress(item)}
    >
      <View style={styles.listingHeader}>
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.listingPrice}>
            ${item.price.toFixed(2)} {item.currency}
          </Text>
        </View>
        <View style={styles.listingStatus}>
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={20}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {item.images.length > 0 && (
        <Image source={{ uri: item.images[0] }} style={styles.listingImage} />
      )}

      <View style={styles.listingFooter}>
        <View style={styles.marketplaceInfo}>
          <Ionicons name="storefront" size={16} color="#666" />
          <Text style={styles.marketplaceText}>{item.marketplace}</Text>
        </View>
        
        <View style={styles.listingActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCrossPost(item)}
          >
            <Ionicons name="share" size={16} color="#007AFF" />
            <Text style={styles.actionText}>Cross-Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {item.aiGenerated && (
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={12} color="#007AFF" />
          <Text style={styles.aiBadgeText}>AI Generated</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={64} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No Listings Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first listing to start selling across multiple marketplaces
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateListing}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.createButtonText}>Create Listing</Text>
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorState}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Failed to Load Listings</Text>
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
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateListing}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={listings || []}
        renderItem={renderListing}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listingCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    position: 'relative',
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  listingInfo: {
    flex: 1,
    marginRight: 10,
  },
  listingTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  listingPrice: {
    color: '#34C759',
    fontSize: 18,
    fontWeight: 'bold',
  },
  listingStatus: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  listingImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketplaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketplaceText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 5,
    textTransform: 'capitalize',
  },
  listingActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 15,
  },
  actionText: {
    color: '#007AFF',
    fontSize: 12,
    marginLeft: 5,
  },
  aiBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aiBadgeText: {
    color: 'white',
    fontSize: 10,
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
    marginBottom: 30,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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

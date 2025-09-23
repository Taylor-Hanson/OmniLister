// Marketplace Listings Screen - Modern UI with platform status

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MarketplaceListing {
  id: string;
  title: string;
  platform: string;
  status: 'active' | 'paused' | 'sold' | 'draft';
  price: number;
  views: number;
  lastUpdated: string;
  platformIcon: string;
  platformColor: string;
}

export default function MarketplaceListingsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<MarketplaceListing[]>([
    {
      id: '1',
      title: 'Vintage Watch',
      platform: 'eBay',
      status: 'active',
      price: 199.99,
      views: 45,
      lastUpdated: '2 hours ago',
      platformIcon: 'bag',
      platformColor: '#E53238',
    },
    {
      id: '2',
      title: 'Handmade Ceramic Bowl',
      platform: 'Etsy',
      status: 'active',
      price: 35.00,
      views: 23,
      lastUpdated: '1 day ago',
      platformIcon: 'storefront',
      platformColor: '#F16521',
    },
    {
      id: '3',
      title: 'Wireless Headphones',
      platform: 'Amazon',
      status: 'active',
      price: 89.99,
      views: 67,
      lastUpdated: '3 hours ago',
      platformIcon: 'logo-amazon',
      platformColor: '#FF9900',
    },
    {
      id: '4',
      title: 'Antique Watch',
      platform: 'eBay',
      status: 'active',
      price: 299.99,
      views: 12,
      lastUpdated: '5 hours ago',
      platformIcon: 'bag',
      platformColor: '#E53238',
    },
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'paused': return '#FF9500';
      case 'sold': return '#007AFF';
      case 'draft': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'sold': return 'Sold';
      case 'draft': return 'Draft';
      default: return 'Unknown';
    }
  };

  const handleListingPress = (listing: MarketplaceListing) => {
    Alert.alert(
      listing.title,
      `Platform: ${listing.platform}\nPrice: $${listing.price}\nViews: ${listing.views}\nStatus: ${getStatusText(listing.status)}`,
      [{ text: 'OK' }]
    );
  };

  const renderListing = ({ item }: { item: MarketplaceListing }) => (
    <TouchableOpacity 
      style={styles.listingCard}
      onPress={() => handleListingPress(item)}
    >
      <View style={styles.listingHeader}>
        <View style={styles.platformInfo}>
          <View style={[styles.platformIcon, { backgroundColor: item.platformColor }]}>
            <Ionicons name={item.platformIcon as any} size={20} color="white" />
          </View>
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.platformName}>{item.platform}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.listingDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={styles.detailValue}>${item.price.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Views</Text>
          <Text style={styles.detailValue}>{item.views}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Updated</Text>
          <Text style={styles.detailValue}>{item.lastUpdated}</Text>
        </View>
      </View>

      <View style={styles.listingActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="pencil" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="analytics" size={16} color="#007AFF" />
          <Text style={styles.actionText}>Analytics</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Marketplace Listings</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{listings.length}</Text>
            <Text style={styles.statLabel}>Total Listings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>
              {listings.filter(listing => listing.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#007AFF' }]}>
              {listings.reduce((sum, listing) => sum + listing.views, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        renderItem={renderListing}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderHeader}
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
    alignItems: 'flex-start',
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
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
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
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  platformName: {
    color: '#666',
    fontSize: 14,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 15,
  },
  actionText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

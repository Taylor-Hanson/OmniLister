// Cross-Posting Screen - Manage cross-posting jobs

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCrossPostingJobs, useCrossPosting } from '../hooks/useApi';
import { useListings } from '../hooks/useApi';
import { CrossPostingJob } from '../types';

export default function CrossPostingScreen({ navigation, route }: any) {
  const { data: jobs, isLoading, error, refetch } = useCrossPostingJobs();
  const { data: listings } = useListings();
  const { createCrossPostingJob, isLoading: isCreating } = useCrossPosting();
  const [refreshing, setRefreshing] = useState(false);

  const { listingId } = route?.params || {};

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreateJob = async () => {
    if (!listings || listings.length === 0) {
      Alert.alert('No Listings', 'Please create a listing first before cross-posting.');
      return;
    }

    // For demo, use the first listing
    const listing = listingId 
      ? listings.find(l => l.id === listingId)
      : listings[0];

    if (!listing) {
      Alert.alert('Listing Not Found', 'The selected listing could not be found.');
      return;
    }

    // Demo marketplaces
    const marketplaces = ['ebay', 'poshmark', 'mercari'];
    
    const job = await createCrossPostingJob(listing.id, marketplaces, {
      delay: 5, // 5 second delay between posts
      optimizeImages: true,
      adjustPricing: true,
    });

    if (job) {
      Alert.alert('Success', 'Cross-posting job created successfully!');
      refetch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'processing': return '#FF9500';
      case 'pending': return '#007AFF';
      case 'failed': return '#FF3B30';
      case 'partial': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'processing': return 'time';
      case 'pending': return 'hourglass';
      case 'failed': return 'close-circle';
      case 'partial': return 'warning';
      default: return 'help-circle';
    }
  };

  const renderJob = ({ item }: { item: CrossPostingJob }) => (
    <TouchableOpacity style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>Cross-Posting Job</Text>
          <Text style={styles.jobDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.jobStatus}>
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

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${item.progress}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{item.progress}%</Text>
      </View>

      <View style={styles.jobStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{item.data.totalMarketplaces}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#34C759' }]}>
            {item.data.completedMarketplaces}
          </Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
            {item.data.failedMarketplaces}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      <View style={styles.marketplaceList}>
        {item.data.results.map((result, index) => (
          <View key={index} style={styles.marketplaceItem}>
            <Ionicons
              name={result.status === 'success' ? 'checkmark' : 
                    result.status === 'failed' ? 'close' : 'time'}
              size={16}
              color={result.status === 'success' ? '#34C759' : 
                     result.status === 'failed' ? '#FF3B30' : '#FF9500'}
            />
            <Text style={styles.marketplaceName}>{result.marketplace}</Text>
            {result.error && (
              <Text style={styles.errorText}>{result.error}</Text>
            )}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="share-outline" size={64} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No Cross-Posting Jobs</Text>
      <Text style={styles.emptySubtitle}>
        Create a cross-posting job to list your items across multiple marketplaces
      </Text>
      <TouchableOpacity 
        style={styles.createButton} 
        onPress={handleCreateJob}
        disabled={isCreating}
      >
        {isCreating ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.createButtonText}>Create Job</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorState}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Failed to Load Jobs</Text>
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
        <Text style={styles.headerTitle}>Cross-Posting</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleCreateJob}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="add" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobs || []}
        renderItem={renderJob}
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
  jobCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  jobDate: {
    color: '#666',
    fontSize: 12,
  },
  jobStatus: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  marketplaceList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  marketplaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketplaceName: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    textTransform: 'capitalize',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginLeft: 8,
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

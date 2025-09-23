// Advanced Crosslisting Screen - Multichannel listing management

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { advancedCrosslistingEngine, CrosslistingJob, InventoryItem } from '../services/advancedCrosslistingEngine';

export default function AdvancedCrosslistingScreen() {
  const [loading, setLoading] = useState(true);
  const [crosslistingJobs, setCrosslistingJobs] = useState<CrosslistingJob[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoDelistEnabled, setAutoDelistEnabled] = useState(true);
  const [platformOptimizationEnabled, setPlatformOptimizationEnabled] = useState(true);

  useEffect(() => {
    loadCrosslistingData();
  }, []);

  const loadCrosslistingData = async () => {
    setLoading(true);
    try {
      // Mock user ID
      const userId = 'user_001';
      
      const jobs = advancedCrosslistingEngine.getUserCrosslistingJobs(userId);
      setCrosslistingJobs(jobs);

      const items = advancedCrosslistingEngine.getInventoryItems(userId);
      setInventoryItems(items);

      const supportedPlatforms = advancedCrosslistingEngine.getSupportedPlatforms();
      setSelectedPlatforms(supportedPlatforms.slice(0, 3)); // Select first 3 by default
    } catch (error) {
      console.error('Failed to load crosslisting data:', error);
      Alert.alert('Error', 'Could not load crosslisting data.');
    } finally {
      setLoading(false);
    }
  };

  const createCrosslistingJob = async () => {
    if (!selectedItem) {
      Alert.alert('Error', 'Please select an item to crosslist.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      Alert.alert('Error', 'Please select at least one platform.');
      return;
    }

    try {
      setLoading(true);
      
      const jobId = await advancedCrosslistingEngine.createCrosslistingJob(
        'user_001',
        {
          id: selectedItem.id,
          title: selectedItem.title,
          description: selectedItem.description,
          price: selectedItem.price,
          images: selectedItem.images,
          category: selectedItem.category,
          condition: selectedItem.condition,
          brand: selectedItem.brand,
          tags: selectedItem.tags,
        },
        selectedPlatforms,
        {
          autoDelist: autoDelistEnabled,
          platformSpecificOptimization: platformOptimizationEnabled,
          retryAttempts: 3,
        }
      );

      Alert.alert('Success', `Crosslisting job created: ${jobId}`);
      await loadCrosslistingData();
    } catch (error) {
      console.error('Failed to create crosslisting job:', error);
      Alert.alert('Error', 'Failed to create crosslisting job.');
    } finally {
      setLoading(false);
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'processing': return '#007AFF';
      case 'failed': return '#FF3B30';
      case 'partial': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const getPlatformStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'processing': return 'time';
      case 'failed': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Advanced Crosslisting</Text>
      <Text style={styles.headerSubtitle}>
        Automatically list items across multiple platforms with AI optimization
      </Text>
    </View>
  );

  const renderItemSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Item to Crosslist</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsContainer}>
        {inventoryItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.itemCard,
              selectedItem?.id === item.id && styles.itemCardSelected,
            ]}
            onPress={() => setSelectedItem(item)}
          >
            <View style={styles.itemImage}>
              <Ionicons name="image" size={40} color="#666" />
            </View>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.itemPrice}>${item.price}</Text>
            <Text style={styles.itemPlatforms}>
              {item.platforms.length} platform{item.platforms.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPlatformSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Target Platforms</Text>
      <View style={styles.platformsGrid}>
        {advancedCrosslistingEngine.getSupportedPlatforms().map((platform) => (
          <TouchableOpacity
            key={platform}
            style={[
              styles.platformCard,
              selectedPlatforms.includes(platform) && styles.platformCardSelected,
            ]}
            onPress={() => {
              if (selectedPlatforms.includes(platform)) {
                setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
              } else {
                setSelectedPlatforms([...selectedPlatforms, platform]);
              }
            }}
          >
            <Ionicons
              name={selectedPlatforms.includes(platform) ? 'checkmark-circle' : 'ellipse'}
              size={24}
              color={selectedPlatforms.includes(platform) ? '#34C759' : '#666'}
            />
            <Text style={styles.platformName}>{platform}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Crosslisting Settings</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="sync" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Auto-Delist</Text>
              <Text style={styles.settingDescription}>
                Automatically remove from other platforms when sold
              </Text>
            </View>
          </View>
          <Switch
            value={autoDelistEnabled}
            onValueChange={setAutoDelistEnabled}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={autoDelistEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="sparkles" size={24} color="#FF9500" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Platform Optimization</Text>
              <Text style={styles.settingDescription}>
                AI-optimize titles and descriptions for each platform
              </Text>
            </View>
          </View>
          <Switch
            value={platformOptimizationEnabled}
            onValueChange={setPlatformOptimizationEnabled}
            trackColor={{ false: '#767577', true: '#FF9500' }}
            thumbColor={platformOptimizationEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  const renderCrosslistingJobs = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Crosslisting Jobs</Text>
      {crosslistingJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list" size={48} color="#666" />
          <Text style={styles.emptyStateText}>No crosslisting jobs yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create your first crosslisting job to get started
          </Text>
        </View>
      ) : (
        crosslistingJobs.slice(0, 5).map((job) => (
          <View key={job.id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobTitle}>{job.sourceListing.title}</Text>
              <View style={[styles.jobStatus, { backgroundColor: getJobStatusColor(job.status) }]}>
                <Text style={styles.jobStatusText}>{job.status.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.jobPlatforms}>
              {job.targetPlatforms.map((platform) => (
                <View key={platform.platform} style={styles.platformStatus}>
                  <Ionicons
                    name={getPlatformStatusIcon(platform.status) as any}
                    size={16}
                    color={getJobStatusColor(platform.status)}
                  />
                  <Text style={styles.platformStatusText}>{platform.platform}</Text>
                </View>
              ))}
            </View>
            
            <Text style={styles.jobDate}>
              Created: {job.createdAt.toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderActionButton = () => (
    <View style={styles.actionSection}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          (!selectedItem || selectedPlatforms.length === 0) && styles.actionButtonDisabled,
        ]}
        onPress={createCrosslistingJob}
        disabled={!selectedItem || selectedPlatforms.length === 0 || loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="rocket" size={24} color="white" />
            <Text style={styles.actionButtonText}>Start Crosslisting</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading && crosslistingJobs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading crosslisting data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderHeader()}
      {renderItemSelection()}
      {renderPlatformSelection()}
      {renderSettings()}
      {renderCrosslistingJobs()}
      {renderActionButton()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
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
  itemsContainer: {
    marginHorizontal: -20,
  },
  itemCard: {
    width: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    marginLeft: 20,
    alignItems: 'center',
  },
  itemCardSelected: {
    backgroundColor: 'rgba(0,122,255,0.2)',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  itemImage: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  itemPrice: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemPlatforms: {
    color: '#666',
    fontSize: 12,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  platformCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformCardSelected: {
    backgroundColor: 'rgba(0,122,255,0.2)',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  platformName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  settingDescription: {
    color: '#666',
    fontSize: 14,
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
  jobCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  jobStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  jobStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobPlatforms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  platformStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  platformStatusText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
  },
  jobDate: {
    color: '#666',
    fontSize: 12,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

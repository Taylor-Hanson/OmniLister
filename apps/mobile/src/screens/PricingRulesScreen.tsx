// Pricing Rules Screen - Modern UI for marketplace pricing and bulk actions

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PricingRulesScreen() {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(['amazon']);
  const [priceMarkup, setPriceMarkup] = useState('25');
  const [shippingAdjustment, setShippingAdjustment] = useState('5.00');
  const [bulkAction, setBulkAction] = useState('apply_all');
  const [schedulePosting, setSchedulePosting] = useState(false);
  const [exportCSV, setExportCSV] = useState(false);

  const marketplaces = [
    { id: 'amazon', name: 'Amazon', icon: 'logo-amazon', color: '#FF9900' },
    { id: 'ebay', name: 'eBay', icon: 'bag', color: '#E53238' },
    { id: 'etsy', name: 'Etsy', icon: 'storefront', color: '#F16521' },
  ];

  const toggleMarketplace = (marketplaceId: string) => {
    setSelectedMarketplaces(prev => 
      prev.includes(marketplaceId)
        ? prev.filter(id => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  const handleSaveRules = () => {
    Alert.alert(
      'Rules Saved',
      'Your pricing rules have been applied to all selected marketplaces.',
      [{ text: 'OK' }]
    );
  };

  const handleBulkAction = (action: string) => {
    setBulkAction(action);
    Alert.alert(
      'Bulk Action',
      `Selected: ${action.replace('_', ' ').toUpperCase()}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pricing Rules</Text>
        <TouchableOpacity style={styles.doneButton}>
          <Ionicons name="checkmark" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Select Marketplaces Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Marketplaces</Text>
        <View style={styles.marketplaceList}>
          {marketplaces.map((marketplace) => (
            <TouchableOpacity
              key={marketplace.id}
              style={[
                styles.marketplaceItem,
                selectedMarketplaces.includes(marketplace.id) && styles.marketplaceItemSelected
              ]}
              onPress={() => toggleMarketplace(marketplace.id)}
            >
              <View style={styles.marketplaceContent}>
                <View style={[styles.marketplaceIcon, { backgroundColor: marketplace.color }]}>
                  <Ionicons name={marketplace.icon as any} size={20} color="white" />
                </View>
                <Text style={styles.marketplaceName}>{marketplace.name}</Text>
              </View>
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color={selectedMarketplaces.includes(marketplace.id) ? "#007AFF" : "#666"} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pricing Rules Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="library" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Pricing Rules</Text>
        </View>
        
        <View style={styles.ruleItem}>
          <View style={styles.ruleContent}>
            <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
            <Text style={styles.ruleLabel}>Price Markup (%)</Text>
          </View>
          <View style={styles.ruleValue}>
            <Text style={styles.ruleValueText}>{priceMarkup}%</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </View>
        </View>

        <View style={styles.ruleItem}>
          <View style={styles.ruleContent}>
            <Ionicons name="document-text" size={20} color="#007AFF" />
            <Text style={styles.ruleLabel}>Shipping Cost Adjustment</Text>
          </View>
          <View style={styles.ruleValue}>
            <Text style={styles.ruleValueText}>${shippingAdjustment}</Text>
          </View>
        </View>
      </View>

      {/* Bulk Actions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bulk Actions</Text>
          <TouchableOpacity style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.bulkActionsList}>
          <TouchableOpacity
            style={[
              styles.bulkActionItem,
              bulkAction === 'apply_all' && styles.bulkActionItemSelected
            ]}
            onPress={() => handleBulkAction('apply_all')}
          >
            <View style={styles.bulkActionContent}>
              <Ionicons name="home" size={20} color="#007AFF" />
              <Text style={styles.bulkActionLabel}>Apply to All Listings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bulkActionItem,
              bulkAction === 'schedule_posting' && styles.bulkActionItemSelected
            ]}
            onPress={() => handleBulkAction('schedule_posting')}
          >
            <View style={styles.bulkActionContent}>
              <Ionicons name="calendar" size={20} color="#007AFF" />
              <Text style={styles.bulkActionLabel}>Schedule Posting</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bulkActionItem,
              bulkAction === 'export_csv' && styles.bulkActionItemSelected
            ]}
            onPress={() => handleBulkAction('export_csv')}
          >
            <View style={styles.bulkActionContent}>
              <Text style={styles.bulkActionLabel}>Export CSV</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Pricing Optimization */}
      <View style={styles.aiSection}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.aiCard}
        >
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={24} color="#007AFF" />
            <Text style={styles.aiTitle}>AI Pricing Optimization</Text>
          </View>
          <Text style={styles.aiDescription}>
            Let our dual AI system (GPT-5 + Claude) optimize your pricing based on market trends and competitor analysis.
          </Text>
          <TouchableOpacity style={styles.aiButton}>
            <Text style={styles.aiButtonText}>Enable AI Optimization</Text>
            <Ionicons name="arrow-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveRules}>
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.gradientButton}
        >
          <Text style={styles.saveButtonText}>Save Pricing Rules</Text>
          <Ionicons name="checkmark" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>
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
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  doneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeButton: {
    marginLeft: 'auto',
  },
  marketplaceList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  marketplaceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  marketplaceItemSelected: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  marketplaceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketplaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  marketplaceName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  ruleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  ruleValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleValueText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  bulkActionsList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  bulkActionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  bulkActionItemSelected: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  bulkActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkActionLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
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
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  aiButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
  },
  saveButton: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 15,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

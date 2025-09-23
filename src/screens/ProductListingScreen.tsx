// Product Listing Screen - Modern UI with AI Recognition

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProductListingScreen() {
  const navigation = useNavigation();
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [productImage, setProductImage] = useState<string | null>(null);

  const marketplaces = [
    { id: 'etsy', name: 'Etsy', icon: 'storefront', color: '#F16521' },
    { id: 'ebay', name: 'eBay', icon: 'bag', color: '#E53238' },
    { id: 'amazon', name: 'Amazon', icon: 'logo-amazon', color: '#FF9900' },
  ];

  const handleUploadPhoto = () => {
    Alert.alert(
      'Upload Photo',
      'Choose photo source',
      [
        { text: 'Camera', onPress: () => navigation.navigate('Camera') },
        { text: 'Gallery', onPress: () => console.log('Gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAIRecognition = () => {
    if (!productImage) {
      Alert.alert('No Image', 'Please upload a photo first');
      return;
    }
    
    Alert.alert(
      'AI Product Recognition',
      'Analyzing your product with dual AI technology (GPT-5 + Claude)...',
      [{ text: 'OK' }]
    );
  };

  const toggleMarketplace = (marketplaceId: string) => {
    setSelectedMarketplaces(prev => 
      prev.includes(marketplaceId)
        ? prev.filter(id => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  const handleContinue = () => {
    if (selectedMarketplaces.length === 0) {
      Alert.alert('Select Marketplaces', 'Please select at least one marketplace');
      return;
    }
    navigation.navigate('ListingDetails', { marketplaces: selectedMarketplaces });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List Your Product</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Upload Photo Section */}
      <View style={styles.section}>
        <View style={styles.uploadContainer}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.productImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPhoto}>
                <Ionicons name="camera" size={32} color="#007AFF" />
                <Text style={styles.uploadText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* AI Recognition Button */}
          <TouchableOpacity style={styles.aiButton} onPress={handleAIRecognition}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="brain" size={20} color="white" />
            </View>
            <Text style={styles.aiText}>AI Product Recognition</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Select Marketplace Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Marketplace</Text>
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
                name="chevron-forward" 
                size={20} 
                color={selectedMarketplaces.includes(marketplace.id) ? "#007AFF" : "#666"} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Continue Button */}
      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.gradientButton}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* AI Features Highlight */}
      <View style={styles.aiFeaturesContainer}>
        <View style={styles.aiFeature}>
          <Ionicons name="sparkles" size={16} color="#007AFF" />
          <Text style={styles.aiFeatureText}>GPT-5 + Claude AI</Text>
        </View>
        <View style={styles.aiFeature}>
          <Ionicons name="flash" size={16} color="#007AFF" />
          <Text style={styles.aiFeatureText}>Instant Recognition</Text>
        </View>
        <View style={styles.aiFeature}>
          <Ionicons name="shield-checkmark" size={16} color="#007AFF" />
          <Text style={styles.aiFeatureText}>99.9% Accuracy</Text>
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
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  uploadContainer: {
    position: 'relative',
  },
  uploadPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    alignItems: 'center',
  },
  uploadText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
  },
  aiButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
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
  continueButton: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 15,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  aiFeaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 30,
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

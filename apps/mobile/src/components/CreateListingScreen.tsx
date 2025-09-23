// Create Listing Screen with AI Integration

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { dualAIService } from '../services/aiService';
import { marketplaceService } from '../services/marketplaceService';
import { Listing, CameraResult, BarcodeResult } from '../types';

const listingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
  category: z.string().min(1, 'Category is required'),
  tags: z.string().optional(),
});

type ListingFormData = z.infer<typeof listingSchema>;

interface CreateListingScreenProps {
  imageUri?: string;
  barcodeData?: BarcodeResult;
  onSave: (listing: Listing) => void;
  onCancel: () => void;
}

export default function CreateListingScreen({
  imageUri,
  barcodeData,
  onSave,
  onCancel,
}: CreateListingScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [availableMarketplaces, setAvailableMarketplaces] = useState<any[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      condition: 'good',
      category: '',
      tags: '',
    },
  });

  useEffect(() => {
    loadMarketplaces();
    if (imageUri) {
      analyzeImage();
    }
    if (barcodeData) {
      populateFromBarcode();
    }
  }, [imageUri, barcodeData]);

  const loadMarketplaces = async () => {
    try {
      const marketplaces = marketplaceService.getPriorityMarketplaces();
      setAvailableMarketplaces(marketplaces);
    } catch (error) {
      console.error('Failed to load marketplaces:', error);
    }
  };

  const analyzeImage = async () => {
    if (!imageUri) return;

    setIsLoading(true);
    try {
      const analysis = await dualAIService.analyzeProductImage(imageUri);
      setAiAnalysis(analysis.output);
      
      // Auto-populate form with AI analysis
      if (analysis.output.consensus) {
        const consensus = analysis.output.consensus;
        if (consensus.content) {
          // Parse AI response to extract product details
          const lines = consensus.content.split('\n');
          lines.forEach(line => {
            if (line.includes('Product name:') || line.includes('1)')) {
              const title = line.split(':')[1]?.trim() || line.split(')')[1]?.trim();
              if (title) setValue('title', title);
            }
            if (line.includes('Category:') || line.includes('3)')) {
              const category = line.split(':')[1]?.trim() || line.split(')')[1]?.trim();
              if (category) setValue('category', category);
            }
          });
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      Alert.alert('AI Analysis Failed', 'Could not analyze the image. Please fill in the details manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const populateFromBarcode = () => {
    if (!barcodeData?.product) return;

    const product = barcodeData.product;
    setValue('title', product.name);
    setValue('description', product.description);
    setValue('category', product.category);
    if (product.averagePrice) {
      setValue('price', product.averagePrice);
    }
  };

  const generateDescription = async () => {
    const formData = watch();
    if (!formData.title || !formData.category) {
      Alert.alert('Missing Information', 'Please fill in title and category first.');
      return;
    }

    setIsLoading(true);
    try {
      const analysis = await dualAIService.generateProductDescription(
        formData,
        selectedMarketplaces[0] || 'general'
      );
      
      if (analysis.output.consensus?.content) {
        setValue('description', analysis.output.consensus.content);
      }
    } catch (error) {
      console.error('Description generation failed:', error);
      Alert.alert('Generation Failed', 'Could not generate description. Please write it manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const optimizePrice = async () => {
    const formData = watch();
    if (!formData.title || !formData.price) {
      Alert.alert('Missing Information', 'Please fill in title and price first.');
      return;
    }

    setIsLoading(true);
    try {
      const analysis = await dualAIService.optimizePricing(formData, []);
      
      if (analysis.output.consensus?.content) {
        // Parse price recommendation from AI response
        const content = analysis.output.consensus.content;
        const priceMatch = content.match(/\$?(\d+\.?\d*)/);
        if (priceMatch) {
          const recommendedPrice = parseFloat(priceMatch[1]);
          setValue('price', recommendedPrice);
        }
      }
    } catch (error) {
      console.error('Price optimization failed:', error);
      Alert.alert('Optimization Failed', 'Could not optimize price. Please set it manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMarketplace = (marketplaceId: string) => {
    setSelectedMarketplaces(prev =>
      prev.includes(marketplaceId)
        ? prev.filter(id => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  const onSubmit = async (data: ListingFormData) => {
    if (selectedMarketplaces.length === 0) {
      Alert.alert('No Marketplaces', 'Please select at least one marketplace.');
      return;
    }

    setIsLoading(true);
    try {
      const listing: Listing = {
        id: `listing_${Date.now()}`,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: 'USD',
        condition: data.condition,
        category: data.category,
        images: imageUri ? [imageUri] : [],
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
        status: 'draft',
        marketplace: selectedMarketplaces[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'current_user', // This would come from auth context
        aiGenerated: !!aiAnalysis,
        aiModel: 'dual',
      };

      onSave(listing);
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Save Failed', 'Could not save listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Create Listing</Text>
        
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="checkmark" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            {aiAnalysis && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={16} color="#007AFF" />
                <Text style={styles.aiBadgeText}>AI Analyzed</Text>
              </View>
            )}
          </View>
        )}

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <View style={styles.aiAnalysisContainer}>
            <Text style={styles.aiAnalysisTitle}>AI Analysis Results</Text>
            <Text style={styles.aiAnalysisText}>
              {aiAnalysis.consensus?.content || 'Analysis completed'}
            </Text>
            <Text style={styles.aiConfidence}>
              Confidence: {Math.round((aiAnalysis.confidence || 0) * 100)}%
            </Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Title */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter product title"
                  placeholderTextColor="#666"
                />
              )}
            />
            {errors.title && (
              <Text style={styles.errorText}>{errors.title.message}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Description *</Text>
              <TouchableOpacity 
                style={styles.aiButton}
                onPress={generateDescription}
                disabled={isLoading}
              >
                <Ionicons name="sparkles" size={16} color="#007AFF" />
                <Text style={styles.aiButtonText}>AI Generate</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.textArea, errors.description && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter product description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              )}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description.message}</Text>
            )}
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Price *</Text>
              <TouchableOpacity 
                style={styles.aiButton}
                onPress={optimizePrice}
                disabled={isLoading}
              >
                <Ionicons name="trending-up" size={16} color="#007AFF" />
                <Text style={styles.aiButtonText}>AI Optimize</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(parseFloat(text) || 0)}
                  value={value.toString()}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              )}
            />
            {errors.price && (
              <Text style={styles.errorText}>{errors.price.message}</Text>
            )}
          </View>

          {/* Condition */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Condition *</Text>
            <Controller
              control={control}
              name="condition"
              render={({ field: { onChange, value } }) => (
                <View style={styles.conditionContainer}>
                  {(['new', 'like_new', 'good', 'fair', 'poor'] as const).map((condition) => (
                    <TouchableOpacity
                      key={condition}
                      style={[
                        styles.conditionButton,
                        value === condition && styles.conditionButtonActive
                      ]}
                      onPress={() => onChange(condition)}
                    >
                      <Text style={[
                        styles.conditionText,
                        value === condition && styles.conditionTextActive
                      ]}>
                        {condition.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Category *</Text>
            <Controller
              control={control}
              name="category"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.category && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter category"
                  placeholderTextColor="#666"
                />
              )}
            />
            {errors.category && (
              <Text style={styles.errorText}>{errors.category.message}</Text>
            )}
          </View>

          {/* Tags */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Tags</Text>
            <Controller
              control={control}
              name="tags"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter tags separated by commas"
                  placeholderTextColor="#666"
                />
              )}
            />
          </View>

          {/* Marketplace Selection */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Select Marketplaces *</Text>
            <View style={styles.marketplaceContainer}>
              {availableMarketplaces.map((marketplace) => (
                <TouchableOpacity
                  key={marketplace.id}
                  style={[
                    styles.marketplaceButton,
                    selectedMarketplaces.includes(marketplace.id) && styles.marketplaceButtonActive
                  ]}
                  onPress={() => toggleMarketplace(marketplace.id)}
                >
                  <Text style={[
                    styles.marketplaceText,
                    selectedMarketplaces.includes(marketplace.id) && styles.marketplaceTextActive
                  ]}>
                    {marketplace.name}
                  </Text>
                  {marketplace.priority && (
                    <Ionicons name="star" size={16} color="#FFD700" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  aiBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  aiBadgeText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
  },
  aiAnalysisContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  aiAnalysisTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  aiAnalysisText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 10,
  },
  aiConfidence: {
    color: '#007AFF',
    fontSize: 12,
  },
  formContainer: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  aiButtonText: {
    color: '#007AFF',
    fontSize: 12,
    marginLeft: 5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
  conditionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  conditionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  conditionButtonActive: {
    backgroundColor: '#007AFF',
  },
  conditionText: {
    color: 'white',
    fontSize: 12,
  },
  conditionTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  marketplaceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  marketplaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  marketplaceButtonActive: {
    backgroundColor: '#007AFF',
  },
  marketplaceText: {
    color: 'white',
    fontSize: 12,
    marginRight: 5,
  },
  marketplaceTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
});

// Offline Photo Editor Component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { photoEditorService, PhotoEditOptions } from '../services/photoEditorService';
import { PhotoEditResult } from '../types';

interface PhotoEditorProps {
  imageUri: string;
  onSave: (result: PhotoEditResult) => void;
  onCancel: () => void;
}

export default function PhotoEditor({ imageUri, onSave, onCancel }: PhotoEditorProps) {
  const [currentUri, setCurrentUri] = useState(imageUri);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editOptions, setEditOptions] = useState<PhotoEditOptions>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = [
    { id: 'none', name: 'Original', icon: 'image' },
    { id: 'vintage', name: 'Vintage', icon: 'camera' },
    { id: 'blackwhite', name: 'B&W', icon: 'contrast' },
    { id: 'sepia', name: 'Sepia', icon: 'color-palette' },
    { id: 'enhance', name: 'Enhance', icon: 'flash' },
  ];

  const applyEdit = async (options: PhotoEditOptions) => {
    setIsProcessing(true);
    try {
      const result = await photoEditorService.editPhoto(currentUri, options);
      setCurrentUri(result.editedUri);
      setEditOptions({ ...editOptions, ...options });
    } catch (error) {
      console.error('Edit application error:', error);
      Alert.alert('Error', 'Failed to apply edit. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const result = await photoEditorService.editPhoto(imageUri, editOptions);
      onSave(result);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save edited image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async () => {
    const result = await photoEditorService.undo();
    if (result) {
      setCurrentUri(result.editedUri);
    }
  };

  const handleRedo = async () => {
    const result = await photoEditorService.redo();
    if (result) {
      setCurrentUri(result.editedUri);
    }
  };

  const handleFilterSelect = async (filterId: string) => {
    if (filterId === 'none') {
      setActiveFilter(null);
      setEditOptions({ ...editOptions, filters: [] });
    } else {
      setActiveFilter(filterId);
      await applyEdit({ ...editOptions, filters: [filterId] });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Edit Photo</Text>
        
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleSave}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="checkmark" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: currentUri }} style={styles.image} />
        
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </View>

      {/* Edit Controls */}
      <ScrollView style={styles.controlsContainer} showsVerticalScrollIndicator={false}>
        {/* Undo/Redo */}
        <View style={styles.controlSection}>
          <View style={styles.undoRedoContainer}>
            <TouchableOpacity style={styles.undoRedoButton} onPress={handleUndo}>
              <Ionicons name="arrow-undo" size={20} color="white" />
              <Text style={styles.undoRedoText}>Undo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.undoRedoButton} onPress={handleRedo}>
              <Ionicons name="arrow-redo" size={20} color="white" />
              <Text style={styles.undoRedoText}>Redo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersContainer}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterButton,
                    activeFilter === filter.id && styles.filterButtonActive
                  ]}
                  onPress={() => handleFilterSelect(filter.id)}
                >
                  <Ionicons 
                    name={filter.icon as any} 
                    size={24} 
                    color={activeFilter === filter.id ? '#007AFF' : 'white'} 
                  />
                  <Text style={[
                    styles.filterText,
                    activeFilter === filter.id && styles.filterTextActive
                  ]}>
                    {filter.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Brightness */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Brightness</Text>
          <View style={styles.sliderContainer}>
            <Ionicons name="sunny" size={20} color="white" />
            <Slider
              style={styles.slider}
              minimumValue={-1}
              maximumValue={1}
              value={editOptions.brightness || 0}
              onValueChange={(value) => applyEdit({ ...editOptions, brightness: value })}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbStyle={styles.sliderThumb}
            />
            <Ionicons name="sunny" size={20} color="white" />
          </View>
        </View>

        {/* Contrast */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Contrast</Text>
          <View style={styles.sliderContainer}>
            <Ionicons name="contrast" size={20} color="white" />
            <Slider
              style={styles.slider}
              minimumValue={-1}
              maximumValue={1}
              value={editOptions.contrast || 0}
              onValueChange={(value) => applyEdit({ ...editOptions, contrast: value })}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbStyle={styles.sliderThumb}
            />
            <Ionicons name="contrast" size={20} color="white" />
          </View>
        </View>

        {/* Saturation */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Saturation</Text>
          <View style={styles.sliderContainer}>
            <Ionicons name="color-palette" size={20} color="white" />
            <Slider
              style={styles.slider}
              minimumValue={-1}
              maximumValue={1}
              value={editOptions.saturation || 0}
              onValueChange={(value) => applyEdit({ ...editOptions, saturation: value })}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbStyle={styles.sliderThumb}
            />
            <Ionicons name="color-palette" size={20} color="white" />
          </View>
        </View>

        {/* Rotate */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Rotate</Text>
          <View style={styles.rotateContainer}>
            <TouchableOpacity 
              style={styles.rotateButton}
              onPress={() => applyEdit({ ...editOptions, rotate: -90 })}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text style={styles.rotateText}>-90°</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.rotateButton}
              onPress={() => applyEdit({ ...editOptions, rotate: 90 })}
            >
              <Ionicons name="arrow-forward" size={24} color="white" />
              <Text style={styles.rotateText}>+90°</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Flip */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Flip</Text>
          <View style={styles.flipContainer}>
            <TouchableOpacity 
              style={styles.flipButton}
              onPress={() => applyEdit({ ...editOptions, flip: 'horizontal' })}
            >
              <Ionicons name="swap-horizontal" size={24} color="white" />
              <Text style={styles.flipText}>Horizontal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.flipButton}
              onPress={() => applyEdit({ ...editOptions, flip: 'vertical' })}
            >
              <Ionicons name="swap-vertical" size={24} color="white" />
              <Text style={styles.flipText}>Vertical</Text>
            </TouchableOpacity>
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
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  controlsContainer: {
    maxHeight: 300,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  controlSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  undoRedoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  undoRedoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  undoRedoText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
  },
  filtersContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    minWidth: 70,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0,122,255,0.3)',
  },
  filterText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  filterTextActive: {
    color: '#007AFF',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  rotateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rotateButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
  },
  rotateText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  flipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  flipButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
  },
  flipText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
});

import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { Platform } from 'react-native';
import { flag } from '@omnilister/flags';
import { offlineQueueService } from './offlineQueue';

export interface CameraListingService {
  requestPermissions(): Promise<boolean>;
  takePhoto(): Promise<string | null>;
  pickFromGallery(): Promise<string | null>;
  createListingFromPhoto(imageUri: string, listingData: Partial<ListingData>): Promise<void>;
  scanBarcode(): Promise<string | null>;
}

export interface ListingData {
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  brand?: string;
  size?: string;
  color?: string;
  images: string[];
}

class ExpoCameraListingService implements CameraListingService {
  async requestPermissions(): Promise<boolean> {
    if (!flag('mobile.cameraListing')) {
      console.log('Camera listing disabled by feature flag');
      return false;
    }

    try {
      // Request camera permissions
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        console.log('Camera permission denied');
        return false;
      }

      // Request media library permissions
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        console.log('Media library permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  async takePhoto(): Promise<string | null> {
    if (!flag('mobile.cameraListing')) {
      return null;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  }

  async pickFromGallery(): Promise<string | null> {
    if (!flag('mobile.cameraListing')) {
      return null;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error picking from gallery:', error);
      return null;
    }
  }

  async createListingFromPhoto(imageUri: string, listingData: Partial<ListingData>): Promise<void> {
    if (!flag('mobile.cameraListing')) {
      return;
    }

    try {
      // Create listing data with the photo
      const fullListingData: ListingData = {
        title: listingData.title || 'New Listing',
        description: listingData.description || '',
        price: listingData.price || 0,
        condition: listingData.condition || 'NEW',
        category: listingData.category || 'OTHER',
        brand: listingData.brand,
        size: listingData.size,
        color: listingData.color,
        images: [imageUri, ...(listingData.images || [])],
      };

      // Add to offline queue for processing
      await offlineQueueService.addItem({
        type: 'CREATE_LISTING',
        payload: fullListingData,
        priority: 'HIGH',
        maxRetries: 3,
      });

      console.log('Listing queued for creation from photo');
    } catch (error) {
      console.error('Error creating listing from photo:', error);
    }
  }

  async scanBarcode(): Promise<string | null> {
    if (!flag('mobile.cameraListing')) {
      return null;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // This would integrate with expo-barcode-scanner
      // For now, return a placeholder
      console.log('Barcode scanning not yet implemented');
      return null;
    } catch (error) {
      console.error('Error scanning barcode:', error);
      return null;
    }
  }

  // Helper method to process multiple photos
  async takeMultiplePhotos(maxCount: number = 5): Promise<string[]> {
    if (!flag('mobile.cameraListing')) {
      return [];
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
        allowsMultipleSelection: true,
        selectionLimit: maxCount,
      });

      if (!result.canceled && result.assets) {
        return result.assets.map(asset => asset.uri);
      }

      return [];
    } catch (error) {
      console.error('Error taking multiple photos:', error);
      return [];
    }
  }

  // Helper method to compress image
  async compressImage(imageUri: string, quality: number = 0.8): Promise<string> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return imageUri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageUri;
    }
  }
}

// Export singleton instance
export const cameraListingService = new ExpoCameraListingService();

// Export types for use in other modules
export type { CameraListingService, ListingData };

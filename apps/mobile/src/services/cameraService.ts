// Camera Integration with Instant AI Recognition

import { Camera } from 'expo-camera';
import { ImagePicker } from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';
import { dualAIService } from './aiService';
import { BarcodeResult } from '../types';

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  aiAnalysis?: any;
  barcodeData?: BarcodeResult;
}

class CameraService {
  private cameraRef: Camera | null = null;
  private isProcessing = false;

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  /**
   * Take photo with instant AI recognition
   */
  async takePhotoWithAI(): Promise<CameraResult> {
    if (this.isProcessing) {
      throw new Error('Camera is already processing');
    }

    this.isProcessing = true;

    try {
      if (!this.cameraRef) {
        throw new Error('Camera not initialized');
      }

      // Take photo
      const photo = await this.cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      // Process image for AI analysis
      const processedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          { resize: { width: 1024 } }, // Optimize for AI processing
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Run AI analysis in background
      const aiAnalysis = await dualAIService.analyzeProductImage(processedImage.uri);

      return {
        uri: processedImage.uri,
        width: processedImage.width,
        height: processedImage.height,
        aiAnalysis: aiAnalysis.output
      };
    } catch (error) {
      console.error('Camera AI error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Scan barcode with camera
   */
  async scanBarcode(): Promise<BarcodeResult> {
    if (this.isProcessing) {
      throw new Error('Camera is already processing');
    }

    this.isProcessing = true;

    try {
      if (!this.cameraRef) {
        throw new Error('Camera not initialized');
      }

      // This would integrate with expo-barcode-scanner
      // For now, return mock data
      const mockBarcode: BarcodeResult = {
        type: 'upc',
        data: '123456789012',
        product: {
          name: 'Sample Product',
          brand: 'Sample Brand',
          category: 'Electronics',
          description: 'A sample product for testing',
          images: [],
          averagePrice: 99.99,
          marketplace: 'Amazon'
        }
      };

      return mockBarcode;
    } catch (error) {
      console.error('Barcode scan error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Pick image from gallery with AI analysis
   */
  async pickImageWithAI(): Promise<CameraResult> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        throw new Error('Image picker canceled');
      }

      const image = result.assets[0];
      
      // Process image for AI analysis
      const processedImage = await ImageManipulator.manipulateAsync(
        image.uri,
        [
          { resize: { width: 1024 } },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Run AI analysis
      const aiAnalysis = await dualAIService.analyzeProductImage(processedImage.uri);

      return {
        uri: processedImage.uri,
        width: processedImage.width,
        height: processedImage.height,
        aiAnalysis: aiAnalysis.output
      };
    } catch (error) {
      console.error('Image picker AI error:', error);
      throw error;
    }
  }

  /**
   * Set camera reference
   */
  setCameraRef(ref: Camera | null) {
    this.cameraRef = ref;
  }

  /**
   * Check if camera is processing
   */
  getProcessingStatus(): boolean {
    return this.isProcessing;
  }

  /**
   * Process multiple images with AI
   */
  async processMultipleImages(uris: string[]): Promise<CameraResult[]> {
    const results: CameraResult[] = [];

    for (const uri of uris) {
      try {
        const processedImage = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        const aiAnalysis = await dualAIService.analyzeProductImage(processedImage.uri);

        results.push({
          uri: processedImage.uri,
          width: processedImage.width,
          height: processedImage.height,
          aiAnalysis: aiAnalysis.output
        });
      } catch (error) {
        console.error(`Error processing image ${uri}:`, error);
      }
    }

    return results;
  }

  /**
   * Get camera capabilities
   */
  async getCameraCapabilities(): Promise<{
    hasFlash: boolean;
    hasTorch: boolean;
    supportedFormats: string[];
    maxZoom: number;
  }> {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission not granted');
      }

      // Mock capabilities - in real implementation, get from camera
      return {
        hasFlash: true,
        hasTorch: true,
        supportedFormats: ['jpeg', 'png'],
        maxZoom: 10
      };
    } catch (error) {
      console.error('Camera capabilities error:', error);
      throw error;
    }
  }
}

export const cameraService = new CameraService();

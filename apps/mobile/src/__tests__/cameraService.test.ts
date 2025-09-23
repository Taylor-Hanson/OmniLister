import { cameraService } from '../services/cameraService';
import { Camera } from 'expo-camera';
import { ImagePicker } from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';

// Mock the AI service
jest.mock('../services/aiService', () => ({
  dualAIService: {
    analyzeProductImage: jest.fn(() => Promise.resolve({
      output: {
        consensus: {
          content: 'AI analysis result'
        }
      }
    }))
  }
}));

describe('CameraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermissions', () => {
    it('should request camera permissions', async () => {
      const result = await cameraService.requestPermissions();
      expect(result).toBe(true);
      expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied'
      });

      const result = await cameraService.requestPermissions();
      expect(result).toBe(false);
    });
  });

  describe('takePhotoWithAI', () => {
    it('should take photo and analyze with AI', async () => {
      const mockCameraRef = {
        takePictureAsync: jest.fn(() => Promise.resolve({
          uri: 'test-photo-uri',
          width: 1000,
          height: 800
        }))
      };

      cameraService.setCameraRef(mockCameraRef as any);

      const result = await cameraService.takePhotoWithAI();

      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('aiAnalysis');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
    });

    it('should handle camera not initialized', async () => {
      cameraService.setCameraRef(null);

      await expect(cameraService.takePhotoWithAI())
        .rejects.toThrow('Camera not initialized');
    });

    it('should handle processing state', async () => {
      const mockCameraRef = {
        takePictureAsync: jest.fn(() => Promise.resolve({
          uri: 'test-photo-uri',
          width: 1000,
          height: 800
        }))
      };

      cameraService.setCameraRef(mockCameraRef as any);

      // Start first photo
      const promise1 = cameraService.takePhotoWithAI();
      
      // Try to start second photo while first is processing
      await expect(cameraService.takePhotoWithAI())
        .rejects.toThrow('Camera is already processing');

      // Wait for first to complete
      await promise1;
    });
  });

  describe('scanBarcode', () => {
    it('should scan barcode and return product data', async () => {
      const mockCameraRef = {
        // Mock barcode scanner functionality
      };

      cameraService.setCameraRef(mockCameraRef as any);

      const result = await cameraService.scanBarcode();

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('product');
    });
  });

  describe('pickImageWithAI', () => {
    it('should pick image from gallery and analyze with AI', async () => {
      const result = await cameraService.pickImageWithAI();

      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('aiAnalysis');
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
    });

    it('should handle image picker cancellation', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
        canceled: true
      });

      await expect(cameraService.pickImageWithAI())
        .rejects.toThrow('Image picker canceled');
    });
  });

  describe('processMultipleImages', () => {
    it('should process multiple images with AI', async () => {
      const imageUris = ['uri1', 'uri2', 'uri3'];

      const results = await cameraService.processMultipleImages(imageUris);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('uri');
        expect(result).toHaveProperty('aiAnalysis');
      });
    });
  });

  describe('getCameraCapabilities', () => {
    it('should return camera capabilities', async () => {
      const capabilities = await cameraService.getCameraCapabilities();

      expect(capabilities).toHaveProperty('hasFlash');
      expect(capabilities).toHaveProperty('hasTorch');
      expect(capabilities).toHaveProperty('supportedFormats');
      expect(capabilities).toHaveProperty('maxZoom');
    });

    it('should handle permission not granted', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied'
      });

      await expect(cameraService.getCameraCapabilities())
        .rejects.toThrow('Camera permission not granted');
    });
  });
});

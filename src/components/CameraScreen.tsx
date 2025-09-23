// Camera Screen with AI Recognition and Barcode Scanning

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { cameraService } from '../services/cameraService';
import { CameraResult, BarcodeResult } from '../types';

interface CameraScreenProps {
  mode: 'photo' | 'barcode' | 'ai_scan';
  onResult: (result: CameraResult) => void;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ mode, onResult, onClose }: CameraScreenProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    initializeCamera();
  }, []);

  const initializeCamera = async () => {
    const permission = await cameraService.requestPermissions();
    setHasPermission(permission);
    
    if (permission) {
      cameraService.setCameraRef(cameraRef.current);
    }
  };

  const handleTakePhoto = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      let result: CameraResult;

      if (mode === 'ai_scan') {
        result = await cameraService.takePhotoWithAI();
      } else if (mode === 'barcode') {
        const barcodeData = await cameraService.scanBarcode();
        result = {
          uri: '', // Barcode doesn't return image URI
          width: 0,
          height: 0,
          barcodeData,
        };
      } else {
        // Regular photo mode
        if (!cameraRef.current) throw new Error('Camera not ready');
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        result = {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        };
      }

      onResult(result);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => 
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      switch (current) {
        case 'off': return 'on';
        case 'on': return 'auto';
        case 'auto': return 'off';
        default: return 'off';
      }
    });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera permission is required to use this feature.
        </Text>
        <TouchableOpacity style={styles.button} onPress={initializeCamera}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        ratio="4:3"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {mode === 'ai_scan' ? 'AI Scan' : 
             mode === 'barcode' ? 'Barcode Scanner' : 'Camera'}
          </Text>
          
          <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
            <Ionicons 
              name={flashMode === 'off' ? 'flash-off' : 
                    flashMode === 'on' ? 'flash' : 'flash-outline'} 
              size={30} 
              color="white" 
            />
          </TouchableOpacity>
        </View>

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* AI Scan Overlay */}
          {mode === 'ai_scan' && (
            <View style={styles.aiOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.overlayText}>
                Position product in frame for AI analysis
              </Text>
            </View>
          )}

          {/* Barcode Overlay */}
          {mode === 'barcode' && (
            <View style={styles.barcodeOverlay}>
              <View style={styles.barcodeFrame}>
                <View style={styles.barcodeLine} />
              </View>
              <Text style={styles.overlayText}>
                Align barcode with the line
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
            <Ionicons name="camera-reverse" size={30} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            onPress={handleTakePhoto}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>

          <View style={styles.controlButton} />
        </View>

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.processingText}>
                {mode === 'ai_scan' ? 'Analyzing with AI...' :
                 mode === 'barcode' ? 'Scanning barcode...' : 'Processing...'}
              </Text>
            </View>
          </View>
        )}
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiOverlay: {
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  barcodeOverlay: {
    alignItems: 'center',
  },
  barcodeFrame: {
    width: 300,
    height: 100,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeLine: {
    width: 200,
    height: 2,
    backgroundColor: '#00ff00',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
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
  processingContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

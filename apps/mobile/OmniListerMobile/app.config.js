export default {
  expo: {
    name: "OmniLister",
    slug: "omnilister-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.omnilister.mobile",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "OmniLister needs access to your camera to take photos of items for listing.",
        NSPhotoLibraryUsageDescription: "OmniLister needs access to your photo library to select images for your listings.",
        NSMicrophoneUsageDescription: "OmniLister needs access to your microphone for voice-to-listing features.",
        NSLocationWhenInUseUsageDescription: "OmniLister uses your location to provide local marketplace recommendations."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.omnilister.mobile",
      versionCode: 1,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.WAKE_LOCK",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED"
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow OmniLister to access your camera to take photos of items for listing."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow OmniLister to access your photos to select images for your listings."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#3b82f6",
          sounds: ["./assets/notification.wav"]
        }
      ],
      [
        "expo-barcode-scanner",
        {
          cameraPermission: "Allow OmniLister to access your camera to scan barcodes for quick product lookup."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "your-project-id-here"
      }
    },
    owner: "your-expo-username",
    updates: {
      url: "https://u.expo.dev/your-project-id"
    },
    runtimeVersion: {
      policy: "appVersion"
    }
  }
};

import { platformUtils } from '@omnilister/core';

export type Platform = 'web' | 'mobile' | 'desktop';

export interface PlatformInfo {
  platform: Platform;
  isMobile: boolean;
  isWeb: boolean;
  isDesktop: boolean;
  userAgent: string;
  screenSize?: {
    width: number;
    height: number;
  };
}

export class PlatformDetector {
  private static instance: PlatformDetector;
  private platformInfo: PlatformInfo;

  private constructor() {
    this.platformInfo = this.detectPlatform();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PlatformDetector {
    if (!PlatformDetector.instance) {
      PlatformDetector.instance = new PlatformDetector();
    }
    return PlatformDetector.instance;
  }

  /**
   * Get current platform info
   */
  getPlatformInfo(): PlatformInfo {
    return { ...this.platformInfo };
  }

  /**
   * Get current platform
   */
  getPlatform(): Platform {
    return this.platformInfo.platform;
  }

  /**
   * Check if current platform is mobile
   */
  isMobile(): boolean {
    return this.platformInfo.isMobile;
  }

  /**
   * Check if current platform is web
   */
  isWeb(): boolean {
    return this.platformInfo.isWeb;
  }

  /**
   * Check if current platform is desktop
   */
  isDesktop(): boolean {
    return this.platformInfo.isDesktop;
  }

  /**
   * Detect platform
   */
  private detectPlatform(): PlatformInfo {
    const userAgent = platformUtils.getUserAgent();
    const isMobile = platformUtils.isMobile();
    const isWeb = platformUtils.isBrowser();
    const isDesktop = !isMobile && isWeb;

    let platform: Platform;
    if (isMobile) {
      platform = 'mobile';
    } else if (isDesktop) {
      platform = 'desktop';
    } else {
      platform = 'web';
    }

    const screenSize = isWeb ? this.getScreenSize() : undefined;

    return {
      platform,
      isMobile,
      isWeb,
      isDesktop,
      userAgent,
      screenSize
    };
  }

  /**
   * Get screen size (web only)
   */
  private getScreenSize(): { width: number; height: number } | undefined {
    if (!platformUtils.isBrowser()) {
      return undefined;
    }

    return {
      width: window.screen.width,
      height: window.screen.height
    };
  }

  /**
   * Refresh platform detection
   */
  refresh(): void {
    this.platformInfo = this.detectPlatform();
  }
}

// Platform utilities
export const platformUtils = {
  /**
   * Get platform detector instance
   */
  getDetector: (): PlatformDetector => {
    return PlatformDetector.getInstance();
  },

  /**
   * Get current platform
   */
  getCurrentPlatform: (): Platform => {
    return platformUtils.getDetector().getPlatform();
  },

  /**
   * Check if platform is mobile
   */
  isMobilePlatform: (): boolean => {
    return platformUtils.getDetector().isMobile();
  },

  /**
   * Check if platform is web
   */
  isWebPlatform: (): boolean => {
    return platformUtils.getDetector().isWeb();
  },

  /**
   * Check if platform is desktop
   */
  isDesktopPlatform: (): boolean => {
    return platformUtils.getDetector().isDesktop();
  },

  /**
   * Get platform info
   */
  getPlatformInfo: (): PlatformInfo => {
    return platformUtils.getDetector().getPlatformInfo();
  },

  /**
   * Check if feature is available on current platform
   */
  isFeatureAvailable: (feature: string): boolean => {
    const platform = platformUtils.getCurrentPlatform();
    
    const platformFeatures: Record<Platform, string[]> = {
      web: [
        'analytics',
        'scheduling',
        'automation',
        'sync',
        'webhooks',
        'bulk-operations'
      ],
      mobile: [
        'camera',
        'barcode-scanning',
        'voice-listing',
        'offline-mode',
        'push-notifications',
        'ai-recognition',
        'photo-editing'
      ],
      desktop: [
        'analytics',
        'scheduling',
        'automation',
        'sync',
        'webhooks',
        'bulk-operations',
        'advanced-editing'
      ]
    };

    return platformFeatures[platform]?.includes(feature) || false;
  },

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig: (): Record<string, any> => {
    const platform = platformUtils.getCurrentPlatform();
    
    const configs: Record<Platform, Record<string, any>> = {
      web: {
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxImagesPerListing: 12,
        offlineSupport: false,
        pushNotifications: false
      },
      mobile: {
        maxImageSize: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['jpg', 'jpeg', 'png'],
        maxImagesPerListing: 8,
        offlineSupport: true,
        pushNotifications: true,
        cameraSupport: true,
        barcodeSupport: true
      },
      desktop: {
        maxImageSize: 20 * 1024 * 1024, // 20MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'],
        maxImagesPerListing: 20,
        offlineSupport: false,
        pushNotifications: false
      }
    };

    return configs[platform] || configs.web;
  }
};

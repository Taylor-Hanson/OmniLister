import { platformUtils } from '@omnilister/core';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
  description?: string;
}

export interface FeatureFlagConfig {
  flags: Record<string, FeatureFlag>;
  environment: string;
  platform: string;
  userId?: string;
}

export class FeatureFlagManager {
  private config: FeatureFlagConfig;

  constructor(config: FeatureFlagConfig) {
    this.config = config;
  }

  /**
   * Check if feature flag is enabled
   */
  isEnabled(flagKey: string, userId?: string): boolean {
    const flag = this.config.flags[flagKey];
    if (!flag) {
      return false;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      const targetUserId = userId || this.config.userId;
      if (targetUserId) {
        const hash = this.hashUserId(targetUserId);
        const percentage = (hash % 100) + 1;
        if (percentage > flag.rolloutPercentage) {
          return false;
        }
      }
    }

    // Check conditions
    if (flag.conditions) {
      if (!this.evaluateConditions(flag.conditions)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get feature flag value
   */
  getFlag(flagKey: string, userId?: string): FeatureFlag | null {
    const flag = this.config.flags[flagKey];
    if (!flag) {
      return null;
    }

    return {
      ...flag,
      enabled: this.isEnabled(flagKey, userId)
    };
  }

  /**
   * Get all enabled flags
   */
  getEnabledFlags(userId?: string): Record<string, FeatureFlag> {
    const enabledFlags: Record<string, FeatureFlag> = {};
    
    Object.entries(this.config.flags).forEach(([key, flag]) => {
      if (this.isEnabled(key, userId)) {
        enabledFlags[key] = flag;
      }
    });

    return enabledFlags;
  }

  /**
   * Update feature flag
   */
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): void {
    if (this.config.flags[flagKey]) {
      this.config.flags[flagKey] = { ...this.config.flags[flagKey], ...updates };
    }
  }

  /**
   * Add feature flag
   */
  addFlag(flagKey: string, flag: FeatureFlag): void {
    this.config.flags[flagKey] = flag;
  }

  /**
   * Remove feature flag
   */
  removeFlag(flagKey: string): void {
    delete this.config.flags[flagKey];
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Evaluate flag conditions
   */
  private evaluateConditions(conditions: Record<string, any>): boolean {
    // Platform condition
    if (conditions.platform && conditions.platform !== this.config.platform) {
      return false;
    }

    // Environment condition
    if (conditions.environment && conditions.environment !== this.config.environment) {
      return false;
    }

    // User plan condition
    if (conditions.userPlan && this.config.userId) {
      // This would need to be implemented based on your user data structure
      // For now, we'll assume it's available in the config
      const userPlan = (this.config as any).userPlan;
      if (userPlan && !conditions.userPlan.includes(userPlan)) {
        return false;
      }
    }

    // Date range condition
    if (conditions.dateRange) {
      const now = new Date();
      const start = conditions.dateRange.start ? new Date(conditions.dateRange.start) : null;
      const end = conditions.dateRange.end ? new Date(conditions.dateRange.end) : null;

      if (start && now < start) return false;
      if (end && now > end) return false;
    }

    return true;
  }
}

// Default feature flags
export const DEFAULT_FEATURE_FLAGS: Record<string, FeatureFlag> = {
  'dualAi:enabled': {
    key: 'dualAi:enabled',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enable dual AI model integration (GPT-5 + Claude)'
  },
  'dualAi:routeSelection': {
    key: 'dualAi:routeSelection',
    enabled: true,
    rolloutPercentage: 50,
    description: 'Use dual AI for route selection optimization'
  },
  'offline:enabled': {
    key: 'offline:enabled',
    enabled: true,
    platform: 'mobile',
    description: 'Enable offline mode for mobile app'
  },
  'notifications:push': {
    key: 'notifications:push',
    enabled: true,
    platform: 'mobile',
    description: 'Enable push notifications'
  },
  'analytics:advanced': {
    key: 'analytics:advanced',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enable advanced analytics features'
  },
  'scheduling:smart': {
    key: 'scheduling:smart',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enable smart scheduling optimization'
  },
  'optimization:auto': {
    key: 'optimization:auto',
    enabled: true,
    rolloutPercentage: 75,
    description: 'Enable automatic listing optimization'
  },
  'camera:ai': {
    key: 'camera:ai',
    enabled: true,
    platform: 'mobile',
    description: 'Enable AI-powered camera features'
  },
  'voice:listing': {
    key: 'voice:listing',
    enabled: true,
    platform: 'mobile',
    rolloutPercentage: 50,
    description: 'Enable voice-to-listing functionality'
  },
  'barcode:scanning': {
    key: 'barcode:scanning',
    enabled: true,
    platform: 'mobile',
    description: 'Enable barcode scanning'
  }
};

// Feature flag utilities
export const flagUtils = {
  /**
   * Create feature flag manager for platform
   */
  createManager: (platform: string, environment: string, userId?: string): FeatureFlagManager => {
    return new FeatureFlagManager({
      flags: DEFAULT_FEATURE_FLAGS,
      environment,
      platform,
      userId
    });
  },

  /**
   * Check if feature is enabled (simple function)
   */
  isEnabled: (flagKey: string, platform: string, environment: string, userId?: string): boolean => {
    const manager = flagUtils.createManager(platform, environment, userId);
    return manager.isEnabled(flagKey, userId);
  },

  /**
   * Get feature flag value (simple function)
   */
  getFlag: (flagKey: string, platform: string, environment: string, userId?: string): FeatureFlag | null => {
    const manager = flagUtils.createManager(platform, environment, userId);
    return manager.getFlag(flagKey, userId);
  }
};

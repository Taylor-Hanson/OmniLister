export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  environment: Environment;
  apiUrl: string;
  wsUrl: string;
  debug: boolean;
  features: Record<string, boolean>;
}

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.detectEnvironment();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Get current environment
   */
  getEnvironment(): Environment {
    return this.config.environment;
  }

  /**
   * Get environment configuration
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Check if environment is development
   */
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Check if environment is staging
   */
  isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  /**
   * Check if environment is production
   */
  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.config.debug;
  }

  /**
   * Get API URL
   */
  getApiUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * Get WebSocket URL
   */
  getWsUrl(): string {
    return this.config.wsUrl;
  }

  /**
   * Check if feature is enabled in current environment
   */
  isFeatureEnabled(feature: string): boolean {
    return this.config.features[feature] || false;
  }

  /**
   * Detect environment
   */
  private detectEnvironment(): EnvironmentConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const environment = this.parseEnvironment(nodeEnv);

    return {
      environment,
      apiUrl: this.getApiUrl(environment),
      wsUrl: this.getWsUrl(environment),
      debug: environment !== 'production',
      features: this.getEnvironmentFeatures(environment)
    };
  }

  /**
   * Parse environment from string
   */
  private parseEnvironment(env: string): Environment {
    switch (env.toLowerCase()) {
      case 'production':
      case 'prod':
        return 'production';
      case 'staging':
      case 'stage':
        return 'staging';
      case 'development':
      case 'dev':
      default:
        return 'development';
    }
  }

  /**
   * Get API URL for environment
   */
  private getApiUrl(environment: Environment): string {
    const urls: Record<Environment, string> = {
      development: process.env.API_URL || 'http://localhost:3000/api',
      staging: process.env.API_URL || 'https://staging-api.omnilister.com/api',
      production: process.env.API_URL || 'https://api.omnilister.com/api'
    };

    return urls[environment];
  }

  /**
   * Get WebSocket URL for environment
   */
  private getWsUrl(environment: Environment): string {
    const urls: Record<Environment, string> = {
      development: process.env.WS_URL || 'ws://localhost:3000/ws',
      staging: process.env.WS_URL || 'wss://staging-api.omnilister.com/ws',
      production: process.env.WS_URL || 'wss://api.omnilister.com/ws'
    };

    return urls[environment];
  }

  /**
   * Get environment-specific features
   */
  private getEnvironmentFeatures(environment: Environment): Record<string, boolean> {
    const features: Record<Environment, Record<string, boolean>> = {
      development: {
        debugMode: true,
        verboseLogging: true,
        mockData: true,
        hotReload: true,
        devTools: true,
        errorBoundary: false,
        analytics: false,
        crashReporting: false
      },
      staging: {
        debugMode: true,
        verboseLogging: true,
        mockData: false,
        hotReload: false,
        devTools: true,
        errorBoundary: true,
        analytics: true,
        crashReporting: true
      },
      production: {
        debugMode: false,
        verboseLogging: false,
        mockData: false,
        hotReload: false,
        devTools: false,
        errorBoundary: true,
        analytics: true,
        crashReporting: true
      }
    };

    return features[environment];
  }
}

// Environment utilities
export const envUtils = {
  /**
   * Get environment manager instance
   */
  getManager: (): EnvironmentManager => {
    return EnvironmentManager.getInstance();
  },

  /**
   * Get current environment
   */
  getCurrentEnvironment: (): Environment => {
    return envUtils.getManager().getEnvironment();
  },

  /**
   * Check if environment is development
   */
  isDevelopment: (): boolean => {
    return envUtils.getManager().isDevelopment();
  },

  /**
   * Check if environment is staging
   */
  isStaging: (): boolean => {
    return envUtils.getManager().isStaging();
  },

  /**
   * Check if environment is production
   */
  isProduction: (): boolean => {
    return envUtils.getManager().isProduction();
  },

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled: (): boolean => {
    return envUtils.getManager().isDebugEnabled();
  },

  /**
   * Get API URL
   */
  getApiUrl: (): string => {
    return envUtils.getManager().getApiUrl();
  },

  /**
   * Get WebSocket URL
   */
  getWsUrl: (): string => {
    return envUtils.getManager().getWsUrl();
  },

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled: (feature: string): boolean => {
    return envUtils.getManager().isFeatureEnabled(feature);
  },

  /**
   * Get environment configuration
   */
  getConfig: (): EnvironmentConfig => {
    return envUtils.getManager().getConfig();
  }
};

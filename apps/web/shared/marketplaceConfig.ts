// Re-export marketplace configuration from the core package
export * from '../../../packages/core/dist/constants';

// Basic marketplace configuration
export interface MarketplaceConfig {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string;
  apiVersion: string;
  rateLimits: {
    hourly: number;
    daily: number;
  };
  supportedFeatures: string[];
  authType: 'oauth' | 'api_key' | 'basic';
}

export const marketplaces: Record<string, MarketplaceConfig> = {
  ebay: {
    id: 'ebay',
    name: 'eBay',
    displayName: 'eBay',
    baseUrl: 'https://api.ebay.com',
    apiVersion: 'v1',
    rateLimits: {
      hourly: 5000,
      daily: 50000
    },
    supportedFeatures: ['listings', 'inventory', 'orders'],
    authType: 'oauth'
  },
  poshmark: {
    id: 'poshmark',
    name: 'Poshmark',
    displayName: 'Poshmark',
    baseUrl: 'https://poshmark.com',
    apiVersion: 'v1',
    rateLimits: {
      hourly: 100,
      daily: 1000
    },
    supportedFeatures: ['listings', 'sharing'],
    authType: 'oauth'
  },
  mercari: {
    id: 'mercari',
    name: 'Mercari',
    displayName: 'Mercari',
    baseUrl: 'https://api.mercari.com',
    apiVersion: 'v1',
    rateLimits: {
      hourly: 200,
      daily: 2000
    },
    supportedFeatures: ['listings', 'orders'],
    authType: 'oauth'
  }
};

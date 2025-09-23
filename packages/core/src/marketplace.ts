import { MarketplaceCategory, AuthType } from './types';

export interface MarketplaceConfig {
  id: string;
  name: string;
  description: string;
  category: MarketplaceCategory;
  icon: string;
  color: string;
  authType: AuthType;
  features: string[];
  requiredCredentials?: {
    label: string;
    key: string;
    type: 'text' | 'password' | 'textarea';
    placeholder?: string;
    help?: string;
  }[];
  apiAvailable: boolean;
  popular: boolean;
  comingSoon?: boolean;
}

export interface MarketplaceConnection {
  id: string;
  userId: string;
  marketplace: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  lastSyncAt?: number;
  settings?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface MarketplaceStatus {
  marketplace: string;
  isConnected: boolean;
  isHealthy: boolean;
  lastSyncAt?: number;
  errorMessage?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'expired';
}

export class MarketplaceManager {
  private configs: Map<string, MarketplaceConfig> = new Map();
  private connections: Map<string, MarketplaceConnection> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Add marketplace configuration
   */
  addConfig(config: MarketplaceConfig): void {
    this.configs.set(config.id, config);
  }

  /**
   * Get marketplace configuration
   */
  getConfig(marketplaceId: string): MarketplaceConfig | undefined {
    return this.configs.get(marketplaceId);
  }

  /**
   * Get all marketplace configurations
   */
  getAllConfigs(): MarketplaceConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get marketplaces by category
   */
  getMarketplacesByCategory(category: MarketplaceCategory): MarketplaceConfig[] {
    return Array.from(this.configs.values()).filter(config => config.category === category);
  }

  /**
   * Get popular marketplaces
   */
  getPopularMarketplaces(): MarketplaceConfig[] {
    return Array.from(this.configs.values()).filter(config => config.popular);
  }

  /**
   * Get marketplaces with API available
   */
  getApiMarketplaces(): MarketplaceConfig[] {
    return Array.from(this.configs.values()).filter(config => config.apiAvailable);
  }

  /**
   * Add marketplace connection
   */
  addConnection(connection: MarketplaceConnection): void {
    this.connections.set(connection.id, connection);
  }

  /**
   * Get marketplace connection
   */
  getConnection(connectionId: string): MarketplaceConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get user's marketplace connections
   */
  getUserConnections(userId: string): MarketplaceConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.userId === userId);
  }

  /**
   * Get connection for user and marketplace
   */
  getUserMarketplaceConnection(userId: string, marketplace: string): MarketplaceConnection | undefined {
    return Array.from(this.connections.values()).find(conn => 
      conn.userId === userId && conn.marketplace === marketplace
    );
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(connectionId: string, isConnected: boolean, errorMessage?: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isConnected = isConnected;
      connection.updatedAt = Date.now();
      if (errorMessage) {
        connection.settings = { ...connection.settings, errorMessage };
      }
    }
  }

  /**
   * Remove marketplace connection
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * Get marketplace status for user
   */
  getMarketplaceStatus(userId: string, marketplace: string): MarketplaceStatus {
    const connection = this.getUserMarketplaceConnection(userId, marketplace);
    const config = this.getConfig(marketplace);

    if (!connection) {
      return {
        marketplace,
        isConnected: false,
        isHealthy: false,
        connectionStatus: 'disconnected'
      };
    }

    if (!connection.isConnected) {
      return {
        marketplace,
        isConnected: false,
        isHealthy: false,
        connectionStatus: 'disconnected',
        errorMessage: connection.settings?.errorMessage
      };
    }

    // Check if token is expired
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < Date.now()) {
      return {
        marketplace,
        isConnected: false,
        isHealthy: false,
        connectionStatus: 'expired',
        lastSyncAt: connection.lastSyncAt
      };
    }

    return {
      marketplace,
      isConnected: true,
      isHealthy: true,
      connectionStatus: 'connected',
      lastSyncAt: connection.lastSyncAt
    };
  }

  /**
   * Get all marketplace statuses for user
   */
  getAllMarketplaceStatuses(userId: string): MarketplaceStatus[] {
    const configs = this.getAllConfigs();
    return configs.map(config => this.getMarketplaceStatus(userId, config.id));
  }

  /**
   * Initialize default marketplace configurations
   */
  private initializeDefaultConfigs(): void {
    const defaultConfigs: MarketplaceConfig[] = [
      {
        id: 'ebay',
        name: 'eBay',
        description: 'World\'s largest online marketplace',
        category: 'general',
        icon: 'fab fa-ebay',
        color: 'bg-blue-600',
        authType: 'oauth',
        features: ['Auction & Buy Now', 'Global Reach', 'Seller Protection'],
        apiAvailable: true,
        popular: true
      },
      {
        id: 'poshmark',
        name: 'Poshmark',
        description: 'Social marketplace for fashion',
        category: 'fashion',
        icon: 'fas fa-tshirt',
        color: 'bg-pink-500',
        authType: 'username_password',
        features: ['Fashion Focus', 'Social Features', 'Authentication Service'],
        requiredCredentials: [
          { label: 'Username', key: 'username', type: 'text', placeholder: 'Your Poshmark username' },
          { label: 'Password', key: 'password', type: 'password', placeholder: 'Your Poshmark password' }
        ],
        apiAvailable: false,
        popular: true
      },
      {
        id: 'mercari',
        name: 'Mercari',
        description: 'Mobile-first marketplace for everything',
        category: 'general',
        icon: 'fas fa-shopping-bag',
        color: 'bg-red-500',
        authType: 'username_password',
        features: ['Mobile First', 'Easy Selling', 'Smart Pricing'],
        requiredCredentials: [
          { label: 'Email', key: 'email', type: 'text', placeholder: 'your@email.com' },
          { label: 'Password', key: 'password', type: 'password', placeholder: 'Your Mercari password' }
        ],
        apiAvailable: false,
        popular: true
      },
      {
        id: 'depop',
        name: 'Depop',
        description: 'Fashion marketplace for Gen Z',
        category: 'fashion',
        icon: 'fas fa-mobile-alt',
        color: 'bg-red-400',
        authType: 'username_password',
        features: ['Fashion Focus', 'Young Audience', 'Social Discovery'],
        requiredCredentials: [
          { label: 'Username', key: 'username', type: 'text', placeholder: 'Your Depop username' },
          { label: 'Password', key: 'password', type: 'password', placeholder: 'Your Depop password' }
        ],
        apiAvailable: false,
        popular: true
      },
      {
        id: 'grailed',
        name: 'Grailed',
        description: 'Men\'s designer fashion marketplace',
        category: 'fashion',
        icon: 'fas fa-user-tie',
        color: 'bg-gray-800',
        authType: 'api_key',
        features: ['Designer Focus', 'Authentication', 'Curated Selection'],
        requiredCredentials: [
          { label: 'API Key', key: 'apiKey', type: 'password', placeholder: 'Enter your Grailed API key' }
        ],
        apiAvailable: true,
        popular: true
      },
      {
        id: 'shopify',
        name: 'Shopify',
        description: 'E-commerce platform for online stores',
        category: 'general',
        icon: 'fas fa-shopping-cart',
        color: 'bg-green-600',
        authType: 'oauth',
        features: ['Multi-channel Sales', 'Product Variants', 'SEO Optimization', 'Inventory Sync'],
        requiredCredentials: [
          { label: 'Shop URL', key: 'shopUrl', type: 'text', placeholder: 'yourshop.myshopify.com' },
          { label: 'Access Token', key: 'accessToken', type: 'password', placeholder: 'Your Shopify access token' }
        ],
        apiAvailable: true,
        popular: true
      }
    ];

    defaultConfigs.forEach(config => this.addConfig(config));
  }
}

// Marketplace utilities
export const marketplaceUtils = {
  /**
   * Validate marketplace configuration
   */
  validateConfig: (config: Partial<MarketplaceConfig>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!config.id) errors.push('Marketplace ID is required');
    if (!config.name) errors.push('Marketplace name is required');
    if (!config.description) errors.push('Marketplace description is required');
    if (!config.category) errors.push('Marketplace category is required');
    if (!config.authType) errors.push('Authentication type is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Get marketplace display name
   */
  getDisplayName: (marketplaceId: string, configs: MarketplaceConfig[]): string => {
    const config = configs.find(c => c.id === marketplaceId);
    return config?.name || marketplaceId;
  },

  /**
   * Get marketplace icon
   */
  getIcon: (marketplaceId: string, configs: MarketplaceConfig[]): string => {
    const config = configs.find(c => c.id === marketplaceId);
    return config?.icon || 'fas fa-store';
  },

  /**
   * Get marketplace color
   */
  getColor: (marketplaceId: string, configs: MarketplaceConfig[]): string => {
    const config = configs.find(c => c.id === marketplaceId);
    return config?.color || 'bg-gray-500';
  },

  /**
   * Check if marketplace supports API
   */
  supportsApi: (marketplaceId: string, configs: MarketplaceConfig[]): boolean => {
    const config = configs.find(c => c.id === marketplaceId);
    return config?.apiAvailable || false;
  },

  /**
   * Get required credentials for marketplace
   */
  getRequiredCredentials: (marketplaceId: string, configs: MarketplaceConfig[]) => {
    const config = configs.find(c => c.id === marketplaceId);
    return config?.requiredCredentials || [];
  },

  /**
   * Format marketplace features
   */
  formatFeatures: (features: string[]): string => {
    return features.join(' • ');
  },

  /**
   * Get marketplace category display name
   */
  getCategoryDisplayName: (category: MarketplaceCategory): string => {
    const categoryNames: Record<MarketplaceCategory, string> = {
      general: 'General Marketplaces',
      fashion: 'Fashion & Apparel',
      luxury: 'Luxury & Designer',
      sneakers: 'Sneakers & Streetwear',
      collectibles: 'Collectibles & Trading Cards',
      electronics: 'Electronics & Tech',
      furniture: 'Furniture & Home',
      music: 'Music & Instruments',
      local: 'Local Marketplaces'
    };
    return categoryNames[category] || category;
  }
};

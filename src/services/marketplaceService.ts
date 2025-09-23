// Priority Marketplace Integrations Service

import { Marketplace, MarketplaceConnection, Listing } from '../types';

// Priority marketplace configurations
const PRIORITY_MARKETPLACES: Marketplace[] = [
  // Enterprise-level features
  {
    id: 'amazon',
    name: 'Amazon',
    description: 'World\'s largest online marketplace (Enterprise)',
    category: 'general',
    icon: 'amazon',
    color: '#FF9900',
    authType: 'oauth',
    features: ['FBA Integration', 'Sponsored Products', 'Brand Registry', 'Analytics'],
    requiredCredentials: [
      { label: 'Seller Central ID', key: 'sellerId', type: 'text', placeholder: 'Your Amazon Seller ID' },
      { label: 'MWS Auth Token', key: 'authToken', type: 'password', placeholder: 'MWS Auth Token' },
    ],
    apiAvailable: true,
    popular: true,
    priority: true,
    enterpriseOnly: true,
  },
  {
    id: 'walmart',
    name: 'Walmart Marketplace',
    description: 'Major retail marketplace',
    category: 'general',
    icon: 'walmart',
    color: '#004C91',
    authType: 'oauth',
    features: ['Walmart Fulfillment', 'Sponsored Products', 'Analytics'],
    requiredCredentials: [
      { label: 'Client ID', key: 'clientId', type: 'text', placeholder: 'Walmart Client ID' },
      { label: 'Client Secret', key: 'clientSecret', type: 'password', placeholder: 'Walmart Client Secret' },
    ],
    apiAvailable: true,
    popular: true,
    priority: true,
  },
  {
    id: 'tiktok_shop',
    name: 'TikTok Shop',
    description: 'Social commerce platform',
    category: 'social',
    icon: 'tiktok',
    color: '#000000',
    authType: 'oauth',
    features: ['Live Shopping', 'Creator Partnerships', 'Viral Marketing'],
    requiredCredentials: [
      { label: 'App ID', key: 'appId', type: 'text', placeholder: 'TikTok Shop App ID' },
      { label: 'App Secret', key: 'appSecret', type: 'password', placeholder: 'TikTok Shop App Secret' },
    ],
    apiAvailable: true,
    popular: true,
    priority: true,
  },
  {
    id: 'instagram_shopping',
    name: 'Instagram Shopping',
    description: 'Visual commerce on Instagram',
    category: 'social',
    icon: 'instagram',
    color: '#E4405F',
    authType: 'oauth',
    features: ['Shopping Tags', 'Stories Shopping', 'Live Shopping'],
    requiredCredentials: [
      { label: 'Instagram Business ID', key: 'businessId', type: 'text', placeholder: 'Instagram Business ID' },
      { label: 'Access Token', key: 'accessToken', type: 'password', placeholder: 'Instagram Access Token' },
    ],
    apiAvailable: true,
    popular: true,
    priority: true,
  },
  {
    id: 'pinterest_business',
    name: 'Pinterest Business',
    description: 'Visual discovery and shopping',
    category: 'social',
    icon: 'pinterest',
    color: '#BD081C',
    authType: 'oauth',
    features: ['Rich Pins', 'Shopping Ads', 'Analytics'],
    requiredCredentials: [
      { label: 'App ID', key: 'appId', type: 'text', placeholder: 'Pinterest App ID' },
      { label: 'App Secret', key: 'appSecret', type: 'password', placeholder: 'Pinterest App Secret' },
    ],
    apiAvailable: true,
    popular: true,
    priority: true,
  },
  // Premium marketplaces
  {
    id: 'bonanza',
    name: 'Bonanza',
    description: 'Marketplace for unique items',
    category: 'general',
    icon: 'bonanza',
    color: '#00A651',
    authType: 'api_key',
    features: ['Unique Items', 'Low Fees', 'Seller Tools'],
    requiredCredentials: [
      { label: 'API Key', key: 'apiKey', type: 'password', placeholder: 'Bonanza API Key' },
    ],
    apiAvailable: true,
    popular: true,
    priority: true,
  },
  {
    id: 'mercari_pro',
    name: 'Mercari Pro',
    description: 'Professional selling on Mercari',
    category: 'general',
    icon: 'mercari',
    color: '#FF6B35',
    authType: 'username_password',
    features: ['Bulk Listing', 'Analytics', 'Priority Support'],
    requiredCredentials: [
      { label: 'Email', key: 'email', type: 'email', placeholder: 'your@email.com' },
      { label: 'Password', key: 'password', type: 'password', placeholder: 'Your Mercari password' },
    ],
    apiAvailable: false,
    popular: true,
    priority: true,
  },
  {
    id: 'therealreal',
    name: 'The RealReal',
    description: 'Luxury consignment marketplace',
    category: 'luxury',
    icon: 'therealreal',
    color: '#000000',
    authType: 'api_key',
    features: ['Luxury Authentication', 'Consignment', 'High-Value Items'],
    requiredCredentials: [
      { label: 'API Key', key: 'apiKey', type: 'password', placeholder: 'The RealReal API Key' },
    ],
    apiAvailable: true,
    popular: true,
    priority: true,
  },
];

class MarketplaceService {
  private connections: Map<string, MarketplaceConnection> = new Map();

  /**
   * Get all priority marketplaces
   */
  getPriorityMarketplaces(): Marketplace[] {
    return PRIORITY_MARKETPLACES.filter(mp => mp.priority);
  }

  /**
   * Get enterprise-only marketplaces
   */
  getEnterpriseMarketplaces(): Marketplace[] {
    return PRIORITY_MARKETPLACES.filter(mp => mp.enterpriseOnly);
  }

  /**
   * Get marketplace by ID
   */
  getMarketplace(id: string): Marketplace | undefined {
    return PRIORITY_MARKETPLACES.find(mp => mp.id === id);
  }

  /**
   * Connect to marketplace
   */
  async connectToMarketplace(
    marketplaceId: string,
    credentials: Record<string, string>,
    userId: string
  ): Promise<MarketplaceConnection> {
    const marketplace = this.getMarketplace(marketplaceId);
    if (!marketplace) {
      throw new Error(`Marketplace ${marketplaceId} not found`);
    }

    try {
      // Validate credentials
      await this.validateCredentials(marketplace, credentials);

      // Create connection
      const connection: MarketplaceConnection = {
        marketplace: marketplaceId,
        isConnected: true,
        lastSyncAt: new Date().toISOString(),
        credentials,
        userId,
      };

      // Store connection
      this.connections.set(`${userId}_${marketplaceId}`, connection);

      return connection;
    } catch (error) {
      console.error(`Connection to ${marketplaceId} failed:`, error);
      throw error;
    }
  }

  /**
   * Validate marketplace credentials
   */
  private async validateCredentials(
    marketplace: Marketplace,
    credentials: Record<string, string>
  ): Promise<boolean> {
    // Check required credentials
    if (marketplace.requiredCredentials) {
      for (const required of marketplace.requiredCredentials) {
        if (!credentials[required.key]) {
          throw new Error(`Missing required credential: ${required.label}`);
        }
      }
    }

    // Validate with marketplace API
    switch (marketplace.id) {
      case 'amazon':
        return this.validateAmazonCredentials(credentials);
      case 'walmart':
        return this.validateWalmartCredentials(credentials);
      case 'tiktok_shop':
        return this.validateTikTokCredentials(credentials);
      case 'instagram_shopping':
        return this.validateInstagramCredentials(credentials);
      case 'pinterest_business':
        return this.validatePinterestCredentials(credentials);
      default:
        return true; // For marketplaces without API validation
    }
  }

  /**
   * Validate Amazon credentials
   */
  private async validateAmazonCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      // Mock Amazon API validation
      const response = await fetch('https://api.amazon.com/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.authToken}`,
        },
        body: JSON.stringify({
          sellerId: credentials.sellerId,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Amazon credential validation failed:', error);
      return false;
    }
  }

  /**
   * Validate Walmart credentials
   */
  private async validateWalmartCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      // Mock Walmart API validation
      const response = await fetch('https://marketplace.walmartapis.com/v3/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Walmart credential validation failed:', error);
      return false;
    }
  }

  /**
   * Validate TikTok Shop credentials
   */
  private async validateTikTokCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      // Mock TikTok API validation
      const response = await fetch('https://open-api.tiktokglobalshop.com/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: credentials.appId,
          app_secret: credentials.appSecret,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('TikTok credential validation failed:', error);
      return false;
    }
  }

  /**
   * Validate Instagram credentials
   */
  private async validateInstagramCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      // Mock Instagram API validation
      const response = await fetch(`https://graph.facebook.com/v18.0/${credentials.businessId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Instagram credential validation failed:', error);
      return false;
    }
  }

  /**
   * Validate Pinterest credentials
   */
  private async validatePinterestCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      // Mock Pinterest API validation
      const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: credentials.appId,
          client_secret: credentials.appSecret,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Pinterest credential validation failed:', error);
      return false;
    }
  }

  /**
   * Post listing to marketplace
   */
  async postListingToMarketplace(
    listing: Listing,
    marketplaceId: string,
    connection: MarketplaceConnection
  ): Promise<{ externalId: string; externalUrl: string }> {
    const marketplace = this.getMarketplace(marketplaceId);
    if (!marketplace) {
      throw new Error(`Marketplace ${marketplaceId} not found`);
    }

    if (!connection.isConnected) {
      throw new Error(`Not connected to ${marketplaceId}`);
    }

    try {
      // Transform listing for marketplace
      const transformedListing = this.transformListingForMarketplace(listing, marketplace);

      // Post to marketplace
      const result = await this.postToMarketplaceAPI(marketplace, transformedListing, connection);

      return result;
    } catch (error) {
      console.error(`Failed to post to ${marketplaceId}:`, error);
      throw error;
    }
  }

  /**
   * Transform listing for specific marketplace
   */
  private transformListingForMarketplace(listing: Listing, marketplace: Marketplace): any {
    const baseListing = {
      title: listing.title,
      description: listing.description,
      price: listing.price,
      condition: listing.condition,
      category: listing.category,
      images: listing.images,
    };

    // Marketplace-specific transformations
    switch (marketplace.id) {
      case 'amazon':
        return {
          ...baseListing,
          // Amazon-specific fields
          productType: 'PRODUCT',
          fulfillmentChannel: 'MFN',
          itemPackageQuantity: 1,
        };
      case 'walmart':
        return {
          ...baseListing,
          // Walmart-specific fields
          productType: 'SELLER_ITEM',
          lifecycleStatus: 'ACTIVE',
        };
      case 'tiktok_shop':
        return {
          ...baseListing,
          // TikTok Shop-specific fields
          productType: 'PHYSICAL',
          status: 'ACTIVE',
        };
      default:
        return baseListing;
    }
  }

  /**
   * Post to marketplace API
   */
  private async postToMarketplaceAPI(
    marketplace: Marketplace,
    listing: any,
    connection: MarketplaceConnection
  ): Promise<{ externalId: string; externalUrl: string }> {
    // Mock API call - in real implementation, call actual marketplace APIs
    const mockResult = {
      externalId: `${marketplace.id}_${Date.now()}`,
      externalUrl: `https://${marketplace.id}.com/listing/${Date.now()}`,
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return mockResult;
  }

  /**
   * Get user connections
   */
  getUserConnections(userId: string): MarketplaceConnection[] {
    const userConnections: MarketplaceConnection[] = [];
    
    for (const [key, connection] of this.connections.entries()) {
      if (key.startsWith(`${userId}_`)) {
        userConnections.push(connection);
      }
    }

    return userConnections;
  }

  /**
   * Disconnect from marketplace
   */
  async disconnectFromMarketplace(marketplaceId: string, userId: string): Promise<void> {
    const key = `${userId}_${marketplaceId}`;
    const connection = this.connections.get(key);
    
    if (connection) {
      connection.isConnected = false;
      this.connections.set(key, connection);
    }
  }

  /**
   * Sync marketplace data
   */
  async syncMarketplaceData(marketplaceId: string, userId: string): Promise<void> {
    const key = `${userId}_${marketplaceId}`;
    const connection = this.connections.get(key);
    
    if (connection && connection.isConnected) {
      // Mock sync operation
      connection.lastSyncAt = new Date().toISOString();
      this.connections.set(key, connection);
    }
  }
}

export const marketplaceService = new MarketplaceService();
